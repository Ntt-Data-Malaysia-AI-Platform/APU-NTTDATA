import { randomBytes } from "node:crypto";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

const EFFORTS: readonly Effort[] = ["low", "medium", "high", "xhigh", "max"];

function parseEffort(value: string | undefined): Effort {
  return EFFORTS.includes(value as Effort) ? (value as Effort) : "medium";
}

const projectId =
  process.env.ANTHROPIC_VERTEX_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT ?? null;

export const config = {
  port: Number(process.env.PORT ?? 8080),
  // Claude on Vertex AI. Auth comes from Application Default Credentials:
  // the Cloud Run service account in production, `gcloud auth application-default login` locally.
  projectId,
  region: process.env.CLOUD_ML_REGION ?? "global",
  model: process.env.CLAUDE_MODEL ?? "claude-opus-5-5",
  // Client-side refusal fallback (Vertex AI has no server-side `fallbacks` parameter).
  fallbackModel: process.env.CLAUDE_FALLBACK_MODEL ?? "claude-opus-4-8",
  effort: parseEffort(process.env.CLAUDE_EFFORT),
  // Demo mode answers from the local knowledge base without calling a model,
  // so the UI can be tried before Vertex AI is set up.
  demoMode: process.env.DEMO_MODE === "true" || (process.env.DEMO_MODE !== "false" && !projectId),
  // Demo login. Override with APP_USERNAME / APP_PASSWORD in any shared deployment.
  appUsername: process.env.APP_USERNAME ?? "Nttdata",
  appPassword: process.env.APP_PASSWORD ?? "Nttdata@123",
  usingDefaultLogin: !process.env.APP_PASSWORD,
  // Signs session cookies. Set SESSION_SECRET so sessions survive restarts and
  // work across Cloud Run instances; otherwise a random one is used per process.
  sessionSecret: process.env.SESSION_SECRET ?? randomBytes(32).toString("hex"),
  maxHistoryMessages: 40,
  maxMessageChars: 8000,
  maxToolRounds: 6,
} as const;
