import Anthropic, { BetaFallbackState, betaRefusalFallbackMiddleware } from "@anthropic-ai/sdk";
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import { config } from "./config.js";
import { type Persona, systemPrompt } from "./personas.js";
import { runTool, SourceRegistry, TOOL_STATUS, toolsFor } from "./tools.js";
import type { ChatEvent, ChatTurn } from "./types.js";

let client: AnthropicVertex | undefined;

function getClient(): AnthropicVertex {
  client ??= new AnthropicVertex({
    projectId: config.projectId,
    region: config.region,
    // Vertex AI has no server-side `fallbacks` parameter, so retry policy
    // declines on the fallback model client-side.
    middleware: [betaRefusalFallbackMiddleware([{ model: config.fallbackModel }])],
  });
  return client;
}

type Block = Anthropic.Beta.BetaContentBlock;
const MODEL_INTERNAL = new Set(["thinking", "redacted_thinking", "tool_use", "server_tool_use"]);

/**
 * After a refusal fallback, blocks the declined model produced before the last
 * `fallback` marker must not be echoed back (and its tool calls never run).
 */
function splitAtFallback(content: Block[]): { echo: Block[]; toolUses: Anthropic.Beta.BetaToolUseBlock[] } {
  const types = content.map((b) => (b as { type: string }).type);
  const boundary = types.lastIndexOf("fallback");
  const echo = content.filter((_, i) => i > boundary || !MODEL_INTERNAL.has(types[i]));
  const toolUses = content
    .slice(boundary + 1)
    .filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
  return { echo, toolUses };
}

export async function runChat(
  persona: Persona,
  history: ChatTurn[],
  emit: (event: ChatEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  // The system prompt and tool list are fixed per persona, so they cache.
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: systemPrompt(persona), cache_control: { type: "ephemeral" } },
  ];
  const tools = toolsFor(persona);
  const sources = new SourceRegistry();
  const fallbackState = new BetaFallbackState();
  let wroteText = false;
  let jsonRetries = 0;

  for (let round = 0; round < config.maxToolRounds; round++) {
    let roundHasText = false;
    const stream = getClient().beta.messages.stream(
      {
        model: config.model,
        max_tokens: 64000,
        system,
        tools,
        messages,
        output_config: { effort: config.effort },
      },
      { fallbackState, signal },
    );
    stream.on("text", (delta) => {
      // Separate text from an earlier round (e.g. before a tool call).
      if (!roundHasText && wroteText) emit({ type: "text", text: "\n\n" });
      roundHasText = wroteText = true;
      emit({ type: "text", text: delta });
    });

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // Eager tool-input streaming: unparseable tool JSON rejects here. Re-issue
      // the turn a couple of times; rethrow API errors.
      if (err instanceof Anthropic.APIError || signal.aborted || jsonRetries++ >= 2) throw err;
      continue;
    }

    if (message.stop_reason === "refusal") {
      emit({
        type: "text",
        text: `${wroteText ? "\n\n" : ""}Sorry, I can't help with that request. Please contact the relevant APU office directly.`,
      });
      break;
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    const { echo, toolUses } = splitAtFallback(message.content);
    if (toolUses.length === 0) break; // end_turn, or another terminal stop
    if (message.stop_reason === "max_tokens") {
      throw new Error("A tool call was cut off by max_tokens.");
    }

    messages.push({ role: "assistant", content: echo });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const call of toolUses) {
      emit({ type: "status", text: TOOL_STATUS[call.name] ?? "Working" });
      const outcome = runTool(call.name, call.input, persona, sources);
      if (outcome.sources?.length) emit({ type: "sources", sources: sources.list() });
      results.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: outcome.content,
        ...(outcome.isError ? { is_error: true } : {}),
      });
    }
    // All results for one assistant turn go back in a single user message.
    messages.push({ role: "user", content: results });
  }
}

/** Turn SDK errors into something the user can act on; details go to the log. */
export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return "The assistant isn't authorised to call Claude on Vertex AI. Check that the service account has the Vertex AI User role and that Claude is enabled in Model Garden.";
  }
  if (err instanceof Anthropic.NotFoundError) {
    return `Model ${config.model} wasn't found in region "${config.region}". Enable it in Vertex AI Model Garden or change CLAUDE_MODEL / CLOUD_ML_REGION.`;
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "The assistant is busy right now (rate limit reached). Please try again in a minute.";
  }
  if (err instanceof Anthropic.APIError) {
    return `The AI service returned an error (${err.status ?? "network"}). Please try again.`;
  }
  return "Something went wrong while answering. Please try again.";
}
