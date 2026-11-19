import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { DEMO_NOTE, mastersData, phdData, studentData, visaData } from "./demo-data.js";
import { searchKnowledge, type KnowledgeChunk, type SearchHit } from "./knowledge.js";
import type { Persona } from "./personas.js";

type Tool = Anthropic.Beta.BetaTool;

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const RECORD_TOOL = (name: string, description: string): Tool => ({
  name,
  description,
  eager_input_streaming: true,
  input_schema: { type: "object", properties: {} },
});

const TOOL_DEFS: Record<string, Tool> = {
  search_apu_knowledge: {
    name: "search_apu_knowledge",
    description:
      "Search APU's knowledge base (programmes, admissions, fees, regulations, visas, postgraduate rules, campus services and GenAI policy). Returns numbered sources; cite them as [n]. Only documents this student's type may read are searched. Call it again with different keywords if the first results miss.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords describing what to look up, e.g. 'resit exam rules'" },
      },
      required: ["query"],
    },
  },
  get_my_student_record: {
    name: "get_my_student_record",
    description:
      "Get the signed-in student's own record from the student information system: fees owed and due date, this week's timetable, last semester's results, or attendance per module.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        section: { type: "string", enum: ["profile", "fees", "timetable", "results", "attendance"] },
      },
      required: ["section"],
    },
  },
  get_my_phd_record: RECORD_TOOL(
    "get_my_phd_record",
    "Get the signed-in PhD student's candidature: milestones and deadlines, supervision meetings, funding and stipend, publications and ethics approval.",
  ),
  get_my_visa_status: RECORD_TOOL(
    "get_my_visa_status",
    "Get the signed-in international student's Student Pass status: expiry date, renewal steps, attendance for renewal, insurance and EMGS case status.",
  ),
  get_my_masters_record: RECORD_TOOL(
    "get_my_masters_record",
    "Get the signed-in Master's student's record: modules and grades, dissertation or capstone milestones, internship and fees.",
  ),
};

const INPUT_SCHEMAS = {
  search_apu_knowledge: z.object({ query: z.string().min(1).max(500) }),
  get_my_student_record: z.object({
    section: z.enum(["profile", "fees", "timetable", "results", "attendance"]),
  }),
  get_my_phd_record: z.object({}).passthrough(),
  get_my_visa_status: z.object({}).passthrough(),
  get_my_masters_record: z.object({}).passthrough(),
} as const;

type ToolName = keyof typeof INPUT_SCHEMAS;

/** Tools a persona may call: the shared knowledge search plus its own tools. */
export function toolsFor(persona: Persona): Tool[] {
  return ["search_apu_knowledge", ...persona.tools].map((name) => TOOL_DEFS[name]);
}

export const TOOL_STATUS: Record<string, string> = {
  search_apu_knowledge: "Searching the APU knowledge base",
  get_my_student_record: "Checking your student record",
  get_my_phd_record: "Checking your candidature record",
  get_my_visa_status: "Checking your Student Pass status",
  get_my_masters_record: "Checking your Master's record",
};

// ---------------------------------------------------------------------------
// Sources: numbers the model cites as [n], stable within one chat turn
// ---------------------------------------------------------------------------

export class SourceRegistry {
  private hits = new Map<string, SearchHit>();

  add(chunk: KnowledgeChunk): SearchHit {
    const key = `${chunk.docId}#${chunk.section}`;
    let hit = this.hits.get(key);
    if (!hit) {
      hit = { ref: this.hits.size + 1, ...chunk };
      this.hits.set(key, hit);
    }
    return hit;
  }

  list(): SearchHit[] {
    return [...this.hits.values()];
  }
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

export interface ToolOutcome {
  content: string;
  isError?: boolean;
  /** Sources newly retrieved by this call, for the UI. */
  sources?: SearchHit[];
}

const json = (data: object) => JSON.stringify({ note: DEMO_NOTE, ...data }, null, 2);

export function runTool(name: string, rawInput: unknown, persona: Persona, sources: SourceRegistry): ToolOutcome {
  // Role-based access: a persona can only run its own tools, whatever the model asks for.
  if (name !== "search_apu_knowledge" && !persona.tools.includes(name)) {
    return { content: `Tool ${name} is not available for this user.`, isError: true };
  }
  const schema = INPUT_SCHEMAS[name as ToolName];
  if (!schema) return { content: `Unknown tool: ${name}`, isError: true };
  // Inputs stream eagerly, so the API does not validate them; validate here.
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) {
    return { content: `Invalid input for ${name}: ${parsed.error.message}`, isError: true };
  }
  const input = parsed.data as Record<string, unknown>;

  switch (name as ToolName) {
    case "search_apu_knowledge": {
      const chunks = searchKnowledge(String(input.query), persona.audiences);
      if (chunks.length === 0) {
        return { content: "No matching documents. Try other keywords, or tell the user this isn't covered." };
      }
      const hits = chunks.map((c) => sources.add(c));
      const content = hits
        .map((h) => `[${h.ref}] ${h.title} > ${h.section} (owner: ${h.owner})\n${h.text}`)
        .join("\n\n---\n\n");
      return { content, sources: hits };
    }
    case "get_my_student_record": {
      const section = String(input.section) as keyof ReturnType<typeof studentData>;
      const data = studentData();
      return { content: json({ student: data.profile.name, [section]: data[section] }) };
    }
    case "get_my_phd_record":
      return { content: json(phdData()) };
    case "get_my_visa_status":
      return { content: json(visaData()) };
    case "get_my_masters_record":
      return { content: json(mastersData()) };
  }
}
