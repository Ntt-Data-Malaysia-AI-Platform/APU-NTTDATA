import type { SearchHit } from "./knowledge.js";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Server-sent events streamed to the browser for one chat turn. */
export type ChatEvent =
  | { type: "status"; text: string }
  | { type: "text"; text: string }
  | { type: "sources"; sources: SearchHit[] }
  | { type: "error"; message: string }
  | { type: "done" };
