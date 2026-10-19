/** Raised when the session is missing or expired; the app shows the sign-in screen. */
export class AuthError extends Error {}

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent("auth-required"));
    throw new AuthError(body.error || "Please sign in.");
  }
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

const post = (url, data) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data ?? {}),
  });

// Session calls don't broadcast "auth-required": a 401 here is the expected answer.
export async function getSession() {
  const res = await fetch("api/session");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function login(username, password) {
  const res = await post("api/login", { username, password });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Sign-in failed (${res.status})`);
  return body;
}

export const logout = () => post("api/logout");

export const getConfig = () => fetch("api/config").then(json);

export const getDashboard = (persona) => fetch(`api/dashboard/${encodeURIComponent(persona)}`).then(json);

export const createTicket = (ticket) => post("api/tickets", ticket).then(json);

/** POST a chat turn and call onEvent for each server-sent event. */
export async function streamChat({ persona, messages, signal, onEvent }) {
  const res = await fetch("api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona, messages }),
    signal,
  });
  if (!res.ok || !res.body) await json(res);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const data = raw
        .split("\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => l.slice(6))
        .join("\n");
      if (data) onEvent(JSON.parse(data));
    }
  }
}
