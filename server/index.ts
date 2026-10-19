import path from "node:path";
import express from "express";
import "./knowledge-fs.js"; // loads knowledge/*.md before any request
import { z } from "zod";
import {
  checkCredentials,
  clearFailures,
  clearSession,
  issueSession,
  loginBlocked,
  readSession,
  recordFailure,
  requireAuth,
} from "./auth.js";
import { config } from "./config.js";
import { dashboardFor } from "./dashboard.js";
import { createTicket } from "./demo-data.js";
import { runDemo } from "./demo.js";
import { knowledgeStats } from "./knowledge.js";
import { describeError, runChat } from "./llm.js";
import { PERSONAS, isPersonaId } from "./personas.js";
import type { ChatEvent } from "./types.js";

const PUBLIC_DIR = process.env.PUBLIC_DIR ?? path.resolve(process.cwd(), "public");

const ChatRequest = z.object({
  persona: z.string().refine(isPersonaId, "Unknown persona"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(config.maxMessageChars),
      }),
    )
    .min(1)
    .max(config.maxHistoryMessages)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", {
      message: "Conversation must start and end with a user message",
    }),
});

const app = express();
app.disable("x-powered-by");
// Cloud Run terminates TLS one hop in front of the container; trust that hop
// (only) for req.secure and the client IP.
app.set("trust proxy", 1);
app.use(express.json({ limit: "256kb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
  );
  next();
});
app.use(express.static(PUBLIC_DIR));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

// ---------- sign-in (open routes) ----------

const LoginRequest = z.object({
  username: z.string().max(200),
  password: z.string().max(200),
});

app.post("/api/login", (req, res) => {
  const ip = req.ip ?? "unknown";
  if (loginBlocked(ip)) {
    res.status(429).json({ error: "Too many attempts. Please wait 15 minutes and try again." });
    return;
  }
  const parsed = LoginRequest.safeParse(req.body);
  if (!parsed.success || !checkCredentials(parsed.data.username.trim(), parsed.data.password)) {
    recordFailure(ip);
    res.status(401).json({ error: "Incorrect username or password." });
    return;
  }
  clearFailures(ip);
  issueSession(req, res, config.appUsername);
  res.json({ user: config.appUsername });
});

app.post("/api/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

app.get("/api/session", (req, res) => {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: "Please sign in." });
    return;
  }
  res.json({ user: session.user });
});

// Everything else under /api needs a signed-in session.
app.use("/api", requireAuth);

app.get("/api/config", (_req, res) => {
  res.json({
    demoMode: config.demoMode,
    model: config.demoMode ? null : config.model,
    knowledge: knowledgeStats(),
    personas: Object.values(PERSONAS).map(
      ({ id, label, assistantName, tagline, description, highlights, suggestions }) => ({
        id,
        label,
        assistantName,
        tagline,
        description,
        highlights,
        suggestions,
      }),
    ),
  });
});

app.get("/api/dashboard/:persona", (req, res) => {
  const { persona } = req.params;
  if (!isPersonaId(persona)) {
    res.status(404).json({ error: "Unknown persona" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json(dashboardFor(persona));
});

const TicketRequest = z.object({
  category: z.enum(["IT", "Facilities", "HR", "Finance"]),
  title: z.string().trim().min(3).max(200),
  details: z.string().trim().max(4000).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
});

// Direct form submission from the staff workspace (no model call needed).
app.post("/api/tickets", (req, res) => {
  const parsed = TicketRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join("; ") });
    return;
  }
  res.status(201).json(createTicket(parsed.data));
});

app.post("/api/chat", async (req, res) => {
  const parsed = ChatRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join("; ") });
    return;
  }
  const persona = PERSONAS[parsed.data.persona as keyof typeof PERSONAS];

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  const emit = (event: ChatEvent) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const run = config.demoMode ? runDemo : runChat;
    await run(persona, parsed.data.messages, emit, controller.signal);
  } catch (err) {
    if (!controller.signal.aborted) {
      console.error("chat failed", err);
      emit({ type: "error", message: describeError(err) });
    }
  }
  emit({ type: "done" });
  res.end();
});

app.listen(config.port, () => {
  const mode = config.demoMode
    ? "DEMO MODE (no model connected)"
    : `${config.model} on Vertex AI (${config.projectId}, ${config.region})`;
  console.log(`APU GenAI assistant listening on :${config.port} - ${mode}`);
  if (config.usingDefaultLogin) {
    console.warn("Using the built-in demo login. Set APP_USERNAME and APP_PASSWORD for any shared deployment.");
  }
});
