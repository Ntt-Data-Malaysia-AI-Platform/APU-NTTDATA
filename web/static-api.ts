/**
 * Static-site (GitHub Pages) replacement for public/js/api.js.
 *
 * There is no server on GitHub Pages, so this module runs the same demo logic
 * in the browser: knowledge search, dashboards, the demo assistant and ticket
 * logging. The sign-in is a front-end gate only. It keeps casual visitors out
 * but is not security, because everything here is readable in the page source.
 *
 * Built by scripts/build-static.mjs into site/js/api.js.
 */
import { dashboardFor } from "../server/dashboard.js";
import { runDemo } from "../server/demo.js";
import { createTicket as makeTicket } from "../server/demo-data.js";
import { knowledgeStats, loadKnowledge, type KnowledgeFile } from "../server/knowledge.js";
import { isPersonaId, PERSONAS } from "../server/personas.js";
import type { ChatEvent, ChatTurn } from "../server/types.js";

// Injected at build time.
declare const __KNOWLEDGE__: KnowledgeFile[];
declare const __LOGIN_USER__: string;
declare const __LOGIN_HASH__: string; // SHA-256 hex of "username\npassword"

loadKnowledge(__KNOWLEDGE__);

export class AuthError extends Error {}

// ---------- session (sessionStorage, with an in-memory fallback) ----------

const SESSION_KEY = "apu-genai-session";
const TTL_MS = 8 * 60 * 60 * 1000;
let memorySession: string | null = null;

function saveSession(value: string | null) {
  memorySession = value;
  try {
    if (value) sessionStorage.setItem(SESSION_KEY, value);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable: keep the in-memory copy */
  }
}

function currentUser(): string | null {
  let raw = memorySession;
  try {
    raw = sessionStorage.getItem(SESSION_KEY) ?? raw;
  } catch {
    /* storage unavailable */
  }
  if (!raw) return null;
  try {
    const { user, expires } = JSON.parse(raw) as { user: string; expires: number };
    return expires > Date.now() ? user : null;
  } catch {
    return null;
  }
}

function requireSession() {
  if (!currentUser()) {
    window.dispatchEvent(new CustomEvent("auth-required"));
    throw new AuthError("Please sign in.");
  }
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let failures = 0;

export async function getSession() {
  const user = currentUser();
  return user ? { user } : null;
}

export async function login(username: string, password: string) {
  if (failures >= 10) throw new Error("Too many attempts. Please reload the page and try again later.");
  const ok = (await sha256Hex(`${username.trim()}\n${password}`)) === __LOGIN_HASH__;
  if (!ok) {
    failures++;
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing a little
    throw new Error("Incorrect username or password.");
  }
  failures = 0;
  saveSession(JSON.stringify({ user: __LOGIN_USER__, expires: Date.now() + TTL_MS }));
  return { user: __LOGIN_USER__ };
}

export async function logout() {
  saveSession(null);
  return { ok: true };
}

// ---------- data ----------

export async function getConfig() {
  requireSession();
  return {
    demoMode: true,
    staticSite: true,
    model: null,
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
  };
}

export async function getDashboard(persona: string) {
  requireSession();
  if (!isPersonaId(persona)) throw new Error("Unknown persona");
  return dashboardFor(persona);
}

const CATEGORIES = ["IT", "Facilities", "HR", "Finance"];
const PRIORITIES = ["low", "normal", "high"];

export async function createTicket(t: { category: string; title: string; details?: string; priority?: string }) {
  requireSession();
  const title = String(t.title ?? "").trim();
  if (!CATEGORIES.includes(t.category) || title.length < 3 || title.length > 200) {
    throw new Error("Please give a category and a title of at least 3 characters.");
  }
  const priority = PRIORITIES.includes(t.priority ?? "") ? t.priority : "normal";
  return makeTicket({ category: t.category, title, details: t.details?.slice(0, 4000), priority });
}

export async function streamChat({
  persona,
  messages,
  signal,
  onEvent,
}: {
  persona: string;
  messages: ChatTurn[];
  signal: AbortSignal;
  onEvent: (e: ChatEvent) => void;
}) {
  requireSession();
  if (!isPersonaId(persona)) throw new Error("Unknown persona");
  await runDemo(PERSONAS[persona], messages.slice(-40), onEvent, signal);
  if (!signal.aborted) onEvent({ type: "done" });
}
