import fs from "node:fs";
import path from "node:path";
import { loadKnowledge } from "./knowledge.js";

/** Server side: read knowledge/*.md from disk and build the search index. */
const KNOWLEDGE_DIR = process.env.KNOWLEDGE_DIR ?? path.resolve(process.cwd(), "knowledge");

loadKnowledge(
  fs.readdirSync(KNOWLEDGE_DIR).map((name) => ({
    name,
    content: fs.readFileSync(path.join(KNOWLEDGE_DIR, name), "utf8"),
  })),
);
