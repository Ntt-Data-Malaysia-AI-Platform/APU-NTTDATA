/**
 * Knowledge base index and BM25 search. Runtime-agnostic: the server loads
 * the markdown files from disk (knowledge-fs.ts), the static site build embeds
 * them, and both hand the raw files to loadKnowledge().
 */

export interface KnowledgeChunk {
  docId: string;
  title: string;
  section: string;
  owner: string;
  audiences: string[];
  text: string;
}

export interface SearchHit {
  /** 1-based number the model cites as [n]; unique per conversation turn. */
  ref: number;
  docId: string;
  title: string;
  section: string;
  owner: string;
  text: string;
}

export interface KnowledgeFile {
  name: string;
  content: string;
}

const STOPWORDS = new Set(
  "a an and are as at be by can do does for from how i if in is it my of on or the to what when where which who why will with you your me we our this that there their about into than then them they".split(
    " ",
  ),
);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (t) => t.length > 1 && !STOPWORDS.has(t),
  );
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, body: match[2] };
}

function toChunks(files: KnowledgeFile[]): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  const docs = files
    .filter((f) => f.name.endsWith(".md") && f.name.toLowerCase() !== "readme.md")
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const file of docs) {
    const { meta, body } = parseFrontmatter(file.content);
    const docId = file.name.replace(/\.md$/, "");
    const title = meta.title ?? docId;
    const audiences = (meta.audience ?? "public").split(",").map((a) => a.trim()).filter(Boolean);
    for (const part of body.split(/^## /m).slice(1)) {
      const newline = part.indexOf("\n");
      const section = part.slice(0, newline).trim();
      const text = part.slice(newline + 1).trim();
      if (text) chunks.push({ docId, title, section, owner: meta.owner ?? "", audiences, text });
    }
  }
  return chunks;
}

// BM25 index, built once by loadKnowledge().
let CHUNKS: KnowledgeChunk[] = [];
let DOC_TOKENS: string[][] = [];
let AVG_LEN = 1;
let DF = new Map<string, number>();

export function loadKnowledge(files: KnowledgeFile[]) {
  CHUNKS = toChunks(files);
  DOC_TOKENS = CHUNKS.map((c) => tokenize(`${c.title} ${c.section} ${c.section} ${c.text}`));
  AVG_LEN = DOC_TOKENS.reduce((n, t) => n + t.length, 0) / Math.max(DOC_TOKENS.length, 1);
  DF = new Map();
  for (const tokens of DOC_TOKENS) {
    for (const t of new Set(tokens)) DF.set(t, (DF.get(t) ?? 0) + 1);
  }
}

/** Documents a set of audiences may read, with their section headings. */
export function listDocuments(audiences: string[]) {
  const docs = new Map<string, { docId: string; title: string; owner: string; sections: string[] }>();
  for (const c of CHUNKS) {
    if (!c.audiences.some((a) => audiences.includes(a))) continue;
    const doc = docs.get(c.docId) ?? { docId: c.docId, title: c.title, owner: c.owner, sections: [] };
    doc.sections.push(c.section);
    docs.set(c.docId, doc);
  }
  return [...docs.values()];
}

export function knowledgeStats() {
  return { documents: new Set(CHUNKS.map((c) => c.docId)).size, sections: CHUNKS.length };
}

/** Keyword (BM25) search restricted to the audiences the persona may read. */
export function searchKnowledge(query: string, audiences: string[], limit = 4): KnowledgeChunk[] {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return [];
  const k1 = 1.4;
  const b = 0.75;
  const n = CHUNKS.length;
  const scored: { chunk: KnowledgeChunk; score: number }[] = [];
  CHUNKS.forEach((chunk, i) => {
    if (!chunk.audiences.some((a) => audiences.includes(a))) return;
    const tokens = DOC_TOKENS[i];
    let score = 0;
    for (const term of terms) {
      const tf = tokens.filter((t) => t === term).length;
      if (!tf) continue;
      const df = DF.get(term) ?? 0;
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
      score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * tokens.length) / AVG_LEN));
    }
    if (score > 0) scored.push({ chunk, score });
  });
  return scored
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((s) => s.chunk);
}
