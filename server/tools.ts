import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createTicket, DEMO_NOTE, researchData, studentData, teachingData } from "./demo-data.js";
import { searchKnowledge, type KnowledgeChunk, type SearchHit } from "./knowledge.js";
import type { Persona } from "./personas.js";

type Tool = Anthropic.Beta.BetaTool;

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOL_DEFS: Record<string, Tool> = {
  search_apu_knowledge: {
    name: "search_apu_knowledge",
    description:
      "Search APU's knowledge base (policies, programmes, fees, regulations, services, HR, finance and research guidance). Returns numbered sources; cite them as [n]. Only documents this user's role may read are searched. Call it again with different keywords if the first results miss.",
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
  get_my_teaching: {
    name: "get_my_teaching",
    description:
      "Get the signed-in lecturer's modules for this semester, with cohort sizes, learning outcomes and upcoming assessment deadlines.",
    eager_input_streaming: true,
    input_schema: { type: "object", properties: {} },
  },
  create_service_ticket: {
    name: "create_service_ticket",
    description:
      "Log a service request with IT, Facilities, HR or Finance on behalf of the signed-in staff member. Only call this once the user has given enough detail; returns the ticket number.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["IT", "Facilities", "HR", "Finance"] },
        title: { type: "string", description: "One-line summary" },
        details: { type: "string", description: "What is wrong, where, and any other useful detail" },
        priority: { type: "string", enum: ["low", "normal", "high"] },
      },
      required: ["category", "title", "details"],
    },
  },
  get_my_research_profile: {
    name: "get_my_research_profile",
    description:
      "Get the signed-in researcher's active grants, ethics approvals and the funding calls that match their research area, with deadlines.",
    eager_input_streaming: true,
    input_schema: { type: "object", properties: {} },
  },
};

const INPUT_SCHEMAS = {
  search_apu_knowledge: z.object({ query: z.string().min(1).max(500) }),
  get_my_student_record: z.object({
    section: z.enum(["profile", "fees", "timetable", "results", "attendance"]),
  }),
  get_my_teaching: z.object({}).passthrough(),
  create_service_ticket: z.object({
    category: z.enum(["IT", "Facilities", "HR", "Finance"]),
    title: z.string().min(3).max(200),
    details: z.string().min(3).max(4000),
    priority: z.enum(["low", "normal", "high"]).optional(),
  }),
  get_my_research_profile: z.object({}).passthrough(),
} as const;

type ToolName = keyof typeof INPUT_SCHEMAS;

/** Tools a persona may call: the shared knowledge search plus its own tools. */
export function toolsFor(persona: Persona): Tool[] {
  return ["search_apu_knowledge", ...persona.tools].map((name) => TOOL_DEFS[name]);
}

export const TOOL_STATUS: Record<string, string> = {
  search_apu_knowledge: "Searching the APU knowledge base",
  get_my_student_record: "Checking your student record",
  get_my_teaching: "Looking up your modules",
  create_service_ticket: "Logging your service ticket",
  get_my_research_profile: "Checking your research profile",
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

export function runTool(
  name: string,
  rawInput: unknown,
  persona: Persona,
  sources: SourceRegistry,
): ToolOutcome {
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
      return { content: JSON.stringify({ note: DEMO_NOTE, student: data.profile.name, [section]: data[section] }, null, 2) };
    }
    case "get_my_teaching":
      return { content: JSON.stringify({ note: DEMO_NOTE, ...teachingData() }, null, 2) };
    case "create_service_ticket":
      return {
        content: JSON.stringify(
          createTicket(input as { category: string; title: string; details?: string; priority?: string }),
          null,
          2,
        ),
      };
    case "get_my_research_profile":
      return { content: JSON.stringify({ note: DEMO_NOTE, ...researchData() }, null, 2) };
  }
}
