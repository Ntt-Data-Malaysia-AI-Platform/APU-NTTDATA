import {
  listTickets,
  programmes,
  researchData,
  staffData,
  studentData,
  teachingData,
  upcomingIntakes,
} from "./demo-data.js";
import { listDocuments } from "./knowledge.js";
import { PERSONAS, type PersonaId } from "./personas.js";

/**
 * Dashboards are described as generic widgets so the browser renders every
 * persona with the same components.
 */
type Tone = "good" | "warn" | "bad" | "info";

interface Kpi {
  label: string;
  value: string;
  detail?: string;
  tone?: Tone;
  icon: string;
}

interface Item {
  title: string;
  meta?: string;
  date?: string;
  badge?: string;
  tone?: Tone;
  /** Prompt sent to the assistant when the item is clicked. */
  ask?: string;
}

type Widget =
  | { type: "timeline"; title: string; icon: string; items: Item[] }
  | { type: "list"; title: string; icon: string; items: Item[] }
  | { type: "bars"; title: string; icon: string; threshold?: number; items: { label: string; value: number; tone?: Tone }[] }
  | { type: "cards"; title: string; icon: string; items: { title: string; subtitle?: string; tag?: string; lines: string[]; progress?: number; ask?: string }[] }
  | { type: "checklist"; title: string; icon: string; items: { text: string; done: boolean }[] };

export interface Dashboard {
  greeting: string;
  subtitle: string;
  kpis: Kpi[];
  widgets: Widget[];
}

const rm = (n: number) => `RM ${n.toLocaleString("en-MY")}`;

function daysUntil(iso: string): number {
  const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
  return Math.round((new Date(iso).getTime() - today) / 864e5);
}

function inDays(iso: string): string {
  const n = daysUntil(iso);
  if (n <= 0) return "today";
  if (n === 1) return "tomorrow";
  return `in ${n} days`;
}

function urgency(iso: string): Tone {
  const n = daysUntil(iso);
  return n <= 7 ? "bad" : n <= 21 ? "warn" : "info";
}

export function dashboardFor(id: PersonaId): Dashboard {
  switch (id) {
    case "prospective": {
      const intakes = upcomingIntakes();
      const progs = programmes();
      return {
        greeting: "Find your future at APU",
        subtitle: "Explore programmes, check entry requirements and plan your application.",
        kpis: [
          { label: "Next intake", value: new Date(intakes[0].date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), detail: inDays(intakes[0].date), icon: "calendar", tone: "info" },
          { label: "Featured programmes", value: String(progs.length), detail: "computing and data", icon: "book" },
          { label: "Scholarships", value: "Up to 100%", detail: "merit-based", icon: "award", tone: "good" },
          { label: "Offer decision", value: "~5 days", detail: "after a complete application", icon: "clock" },
        ],
        widgets: [
          {
            type: "cards",
            title: "Featured programmes",
            icon: "book",
            items: progs.map((p) => ({
              title: p.name,
              subtitle: `${p.level} · ${p.duration}`,
              tag: p.fee,
              lines: [`Intakes: ${p.intakes}`, `Entry: ${p.entry}`],
              ask: `Tell me about the ${p.name}: entry requirements, what I'll study and career options.`,
            })),
          },
          {
            type: "timeline",
            title: "Upcoming intakes",
            icon: "calendar",
            items: intakes.map((i) => ({ title: i.label, date: i.date, meta: inDays(i.date), tone: "info" as Tone })),
          },
          {
            type: "checklist",
            title: "Your application checklist",
            icon: "check",
            items: [
              { text: "Choose a programme and check entry requirements", done: false },
              { text: "Prepare certified results, IC or passport, and photo", done: false },
              { text: "Apply online and pay the application fee", done: false },
              { text: "Receive your offer letter", done: false },
              { text: "Accept the offer and pay the registration fee", done: false },
            ],
          },
        ],
      };
    }

    case "student": {
      const s = studentData();
      const low = s.attendance.modules.filter((m) => m.attendance < 80);
      const next = s.timetable.classes[0];
      return {
        greeting: `Welcome back, ${s.profile.name}`,
        subtitle: `${s.profile.programme} · Year ${s.profile.year}, Semester ${s.profile.semester} · ${s.profile.studentId}`,
        kpis: [
          { label: "Fees outstanding", value: rm(s.fees.outstanding), detail: `due ${inDays(s.fees.dueDate)}`, tone: urgency(s.fees.dueDate) === "info" ? "warn" : urgency(s.fees.dueDate), icon: "wallet" },
          { label: "CGPA", value: s.results.cgpa.toFixed(2), detail: `last GPA ${s.results.gpa.toFixed(2)}`, tone: "good", icon: "award" },
          { label: "Attendance alerts", value: String(low.length), detail: low.length ? `${low[0].module} at ${low[0].attendance}%` : "all modules above 80%", tone: low.length ? "bad" : "good", icon: "alert" },
          { label: "Next class", value: next.time.split("-")[0], detail: `${next.day}: ${next.module.replace(/^\S+\s/, "")}`, icon: "clock", tone: "info" },
        ],
        widgets: [
          {
            type: "timeline",
            title: "This week",
            icon: "calendar",
            items: s.timetable.classes.map((c) => ({
              title: c.module.replace(/^\S+\s/, ""),
              date: c.date,
              meta: `${c.day} ${c.time} · ${c.type} · ${c.room}`,
              tone: "info" as Tone,
            })),
          },
          {
            type: "bars",
            title: "Attendance",
            icon: "chart",
            threshold: 80,
            items: s.attendance.modules.map((m) => ({ label: m.module, value: m.attendance, tone: (m.attendance < 80 ? "bad" : m.attendance < 85 ? "warn" : "good") as Tone })),
          },
          {
            type: "timeline",
            title: "Upcoming deadlines",
            icon: "flag",
            items: s.deadlines.map((d) => ({
              title: d.title,
              date: d.due,
              meta: `${d.module} · ${inDays(d.due)}`,
              tone: urgency(d.due),
              ask: `Help me plan my work for the "${d.title}" (${d.module}), due ${d.due}. Break it into steps with dates.`,
            })),
          },
          {
            type: "list",
            title: `Results: ${s.results.semester}`,
            icon: "award",
            items: s.results.modules.map((m) => ({ title: m.module, badge: m.grade, tone: (m.grade.startsWith("A") ? "good" : "info") as Tone })),
          },
        ],
      };
    }

    case "lecturer": {
      const t = teachingData();
      const assessments = t.modules
        .flatMap((m) => m.assessments.map((a) => ({ ...a, module: m.name })))
        .sort((a, b) => a.due.localeCompare(b.due));
      const soon = assessments.filter((a) => daysUntil(a.due) <= 14);
      return {
        greeting: `Good to see you, ${t.lecturer}`,
        subtitle: `${t.school} · ${t.modules.length} modules this semester`,
        kpis: [
          { label: "Modules", value: String(t.modules.length), detail: t.modules.map((m) => m.code).join(", "), icon: "book" },
          { label: "Students", value: String(t.modules.reduce((n, m) => n + m.cohort, 0)), detail: "across all cohorts", icon: "users", tone: "info" },
          { label: "Due in 14 days", value: String(soon.length), detail: "assessments", icon: "flag", tone: soon.length ? "warn" : "good" },
          { label: "Next deadline", value: inDays(assessments[0].due), detail: assessments[0].name, icon: "clock", tone: urgency(assessments[0].due) },
        ],
        widgets: [
          {
            type: "cards",
            title: "My modules",
            icon: "book",
            items: t.modules.map((m) => ({
              title: `${m.code} ${m.name}`,
              subtitle: `${m.cohort} students`,
              tag: `${m.assessments.length} assessments`,
              lines: m.learningOutcomes.map((o) => `• ${o}`),
              ask: `Suggest three active-learning activities for next week's ${m.name} class, aligned to these learning outcomes: ${m.learningOutcomes.join("; ")}.`,
            })),
          },
          {
            type: "timeline",
            title: "Assessment calendar",
            icon: "calendar",
            items: assessments.map((a) => ({
              title: a.name,
              date: a.due,
              meta: `${a.module} · ${a.weight} · ${inDays(a.due)}`,
              badge: a.aiLevel,
              tone: urgency(a.due),
              ask: `Write a short, clear brief for students for "${a.name}" (${a.module}, ${a.weight}), stating the GenAI level "${a.aiLevel}" and what that allows.`,
            })),
          },
        ],
      };
    }

    case "staff": {
      const s = staffData();
      const tickets = listTickets();
      const docs = listDocuments(PERSONAS.staff.audiences);
      const open = tickets.filter((t) => t.status !== "Closed");
      return {
        greeting: `Hello, ${s.name}`,
        subtitle: `${s.department} · policies, requests and approvals in one place`,
        kpis: [
          { label: "Open tickets", value: String(open.length), detail: `${open.filter((t) => t.priority === "high").length} high priority`, icon: "ticket", tone: open.length ? "warn" : "good" },
          { label: "Annual leave left", value: `${s.leave.entitled - s.leave.taken} days`, detail: `of ${s.leave.entitled} · ${s.leave.pending} pending`, icon: "sun", tone: "good" },
          { label: "Awaiting your approval", value: String(s.approvals.length), detail: `next ${inDays(s.approvals[0].due)}`, icon: "check", tone: "warn" },
          { label: "Policies available", value: String(docs.length), detail: "searchable by the assistant", icon: "book", tone: "info" },
        ],
        widgets: [
          {
            type: "list",
            title: "My service tickets",
            icon: "ticket",
            items: tickets.map((t) => ({
              title: t.title,
              meta: `${t.ticketId} · ${t.category} · opened ${t.created}`,
              badge: t.status,
              tone: (t.priority === "high" ? "bad" : t.status === "Open" ? "warn" : "info") as Tone,
            })),
          },
          {
            type: "list",
            title: "Awaiting your approval",
            icon: "check",
            items: s.approvals.map((a) => ({ title: a.title, meta: `${a.from} · due ${inDays(a.due)}`, tone: urgency(a.due) })),
          },
          {
            type: "list",
            title: "Policies and procedures",
            icon: "book",
            items: docs.map((d) => ({
              title: d.title,
              meta: `${d.owner} · ${d.sections.length} sections`,
              ask: `Summarise the "${d.title}" policy in 5 bullet points for a busy staff member.`,
            })),
          },
          {
            type: "timeline",
            title: "Coming up",
            icon: "calendar",
            items: s.calendar.map((c) => ({ title: c.title, date: c.date, meta: inDays(c.date), tone: urgency(c.date) })),
          },
        ],
      };
    }

    case "researcher": {
      const r = researchData();
      const total = r.activeGrants.reduce((n, g) => n + g.amount, 0);
      const nextReport = [...r.activeGrants].sort((a, b) => a.nextReport.localeCompare(b.nextReport))[0];
      return {
        greeting: `Welcome, ${r.researcher}`,
        subtitle: r.area,
        kpis: [
          { label: "Active grants", value: String(r.activeGrants.length), detail: "as principal investigator", icon: "flask", tone: "good" },
          { label: "Funding managed", value: rm(total), detail: "across active grants", icon: "wallet", tone: "info" },
          { label: "Next progress report", value: inDays(nextReport.nextReport), detail: nextReport.title, icon: "flag", tone: urgency(nextReport.nextReport) },
          { label: "Matching calls", value: String(r.matchingCalls.length), detail: "closing in the next 90 days", icon: "target", tone: "warn" },
        ],
        widgets: [
          {
            type: "cards",
            title: "Active grants",
            icon: "flask",
            items: r.activeGrants.map((g) => ({
              title: g.title,
              subtitle: `${g.funder} · ${rm(g.amount)}`,
              tag: `ends ${g.ends}`,
              progress: g.progress,
              lines: [`Next progress report ${inDays(g.nextReport)} (${g.nextReport})`],
              ask: `Draft an outline for the progress report on "${g.title}" (${g.progress}% complete): achievements, issues, next milestones.`,
            })),
          },
          {
            type: "timeline",
            title: "Funding calls closing",
            icon: "target",
            items: r.matchingCalls.map((c) => ({
              title: c.call,
              date: c.internalDeadline,
              meta: `Up to ${c.maxAmount} · internal deadline ${inDays(c.internalDeadline)}`,
              tone: urgency(c.internalDeadline),
              ask: `Help me decide whether to apply to "${c.call}" (up to ${c.maxAmount}) with my research area, ${r.area}. What would a strong angle be?`,
            })),
          },
          {
            type: "list",
            title: "Ethics approvals",
            icon: "shield",
            items: r.ethicsApprovals.map((e) => ({ title: e.project, meta: `expires ${e.expires}`, badge: e.status, tone: "good" as Tone })),
          },
        ],
      };
    }
  }
}
