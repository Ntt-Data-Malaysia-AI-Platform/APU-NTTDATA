import type { Persona } from "./personas.js";
import { runTool, SourceRegistry, TOOL_STATUS } from "./tools.js";
import type { ChatEvent, ChatTurn } from "./types.js";

/**
 * Demo mode: no model is called. The assistant shows what it retrieved, so the
 * UI, personas, access rules and sources can be tried before Vertex AI is set up.
 */

const PERSONA_TOOL_TRIGGERS: { tool: string; pattern: RegExp; input: Record<string, string> }[] = [
  { tool: "get_my_student_record", pattern: /\b(fee|fees|owe|pay|payment|due)\b/i, input: { section: "fees" } },
  { tool: "get_my_student_record", pattern: /\b(timetable|class|classes|schedule|week)\b/i, input: { section: "timetable" } },
  { tool: "get_my_student_record", pattern: /\b(result|results|grade|gpa|cgpa)\b/i, input: { section: "results" } },
  { tool: "get_my_student_record", pattern: /\b(attendance)\b/i, input: { section: "attendance" } },
  { tool: "get_my_teaching", pattern: /\b(my modules?|assessments?|deadlines?|due|cohort)\b/i, input: {} },
  { tool: "get_my_research_profile", pattern: /\b(my grants?|funding|calls?|close|deadlines?|status)\b/i, input: {} },
];

function firstSentences(text: string, max = 2): string {
  const flat = text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  const sentences = flat.match(/[^.!?]+[.!?]+/g) ?? [flat];
  return sentences.slice(0, max).join(" ").trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runDemo(
  persona: Persona,
  history: ChatTurn[],
  emit: (event: ChatEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const question = history[history.length - 1]?.content ?? "";
  const sources = new SourceRegistry();
  const parts: string[] = [
    "_Demo mode: no AI model is connected, so this is what the assistant retrieved for your question. Connect Claude on Vertex AI for real answers._",
  ];

  const trigger = PERSONA_TOOL_TRIGGERS.find(
    (t) => persona.tools.includes(t.tool) && t.pattern.test(question),
  );
  if (trigger) {
    emit({ type: "status", text: TOOL_STATUS[trigger.tool] });
    await sleep(400);
    const outcome = runTool(trigger.tool, trigger.input, persona, sources);
    parts.push(`**Your record** (sample data):\n\n\`\`\`json\n${outcome.content}\n\`\`\``);
  }

  emit({ type: "status", text: TOOL_STATUS.search_apu_knowledge });
  await sleep(400);
  const outcome = runTool("search_apu_knowledge", { query: question }, persona, sources);
  if (outcome.sources?.length) {
    emit({ type: "sources", sources: sources.list() });
    parts.push(
      "**From the knowledge base:**\n\n" +
        outcome.sources.map((s) => `- **${s.section}**: ${firstSentences(s.text)} [${s.ref}]`).join("\n"),
    );
  } else {
    parts.push(
      "Nothing in the knowledge base this role can access matches that question. With a model connected, the assistant would say so and point to the right office.",
    );
  }

  // Stream word by word so the demo feels like the real thing.
  const words = parts.join("\n\n").split(/(\s+)/);
  for (const word of words) {
    if (signal.aborted) return;
    emit({ type: "text", text: word });
    if (word.trim()) await sleep(12);
  }
}
