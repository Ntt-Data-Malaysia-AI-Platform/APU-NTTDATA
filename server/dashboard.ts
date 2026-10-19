import {
  daysFromNow,
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

/** Every widget can carry a header-level "Ask AI" prompt. */
interface WidgetBase {
  title: string;
  icon: string;
  ask?: string;
}

type Widget = WidgetBase &
  (
    | { type: "timeline"; items: Item[] }
    | { type: "list"; items: Item[] }
    | { type: "bars"; threshold?: number; items: { label: string; value: number; tone?: Tone }[] }
    | { type: "cards"; items: { title: string; subtitle?: string; tag?: string; lines: string[]; progress?: number; ask?: string }[] }
    | { type: "checklist"; items: { text: string; done: boolean }[] }
    // Mockup widgets
    | { type: "donut"; centerValue: string; centerLabel: string; segments: { label: string; value: number; display: string }[]; note?: string }
    | { type: "columns"; unit?: string; max?: number; items: { label: string; value: number; display?: string; highlight?: boolean }[]; note?: string }
    | { type: "stepper"; subtitle?: string; steps: { label: string; meta?: string; status: "done" | "current" | "todo" }[] }
    | { type: "kanban"; columns: { title: string; tone: Tone; cards: { title: string; meta?: string }[] }[] }
    | { type: "week"; events: { day: number; start: number; end: number; title: string; meta: string; tone?: Tone }[] }
  );

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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const hours = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h + m / 60;
};
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export function dashboardFor(id: PersonaId): Dashboard {
  switch (id) {
    case "prospective": {
      const intakes = upcomingIntakes();
      const progs = programmes();
      const next = intakes[0];
      return {
        greeting: "Find your future at APU",
        subtitle: "Explore programmes, check entry requirements and plan your application.",
        kpis: [
          { label: "Next intake", value: new Date(next.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), detail: inDays(next.date), icon: "calendar", tone: "info" },
          { label: "Featured programmes", value: String(progs.length), detail: "computing and data", icon: "book" },
          { label: "Scholarships", value: "Up to 100%", detail: "merit-based", icon: "award", tone: "good" },
          { label: "Offer decision", value: "~5 days", detail: "after a complete application", icon: "clock" },
        ],
        widgets: [
          {
            type: "stepper",
            title: "Your application journey",
            icon: "flag",
            subtitle: `BSc (Hons) Computer Science · ${next.label}`,
            ask: "What documents do I still need to upload for my application, and how should they be certified?",
            steps: [
              { label: "Explore programmes", meta: "4 shortlisted", status: "done" },
              { label: "Check entry requirements", meta: "STPM: 2 principals", status: "done" },
              { label: "Upload documents", meta: "2 of 4 uploaded", status: "current" },
              { label: "Pay application fee", status: "todo" },
              { label: "Receive offer letter", meta: "~5 working days", status: "todo" },
              { label: "Accept and register", status: "todo" },
            ],
          },
          {
            type: "donut",
            title: "Estimated first-year cost",
            icon: "pie",
            centerValue: "RM 48.8k",
            centerLabel: "per year",
            note: "Sample estimate for a Malaysian student living near campus.",
            ask: "Help me plan how to fund my first year at APU, including scholarships, PTPTN and instalments.",
            segments: [
              { label: "Tuition", value: 32000, display: "RM 32,000" },
              { label: "Accommodation", value: 7200, display: "RM 7,200" },
              { label: "Living costs", value: 9600, display: "RM 9,600" },
            ],
          },
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
            type: "list",
            title: "Events for you",
            icon: "pin",
            items: [
              { title: "Open day: campus tour and programme talks", meta: `${shortDate(daysFromNow(12))} · 10:00–16:00 · Main campus`, badge: "Register", tone: "good", ask: "What happens at the APU open day and how do I register?" },
              { title: "Virtual info session: computing degrees", meta: `${shortDate(daysFromNow(5))} · 20:00 · Online`, badge: "Online", tone: "info", ask: "What will the virtual info session on computing degrees cover?" },
              { title: "Scholarship clinic", meta: `${shortDate(daysFromNow(19))} · 14:00 · Admissions Office`, badge: "Free", tone: "info", ask: "How do APU merit scholarships work and what should I bring to the scholarship clinic?" },
            ],
          },
        ],
      };
    }

    case "student": {
      const s = studentData();
      const low = s.attendance.modules.filter((m) => m.attendance < 80);
      const next = s.timetable.classes[0];
      const paidPct = Math.round((s.fees.paid / s.fees.semesterInvoice) * 100);
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
            type: "week",
            title: "My week",
            icon: "calendar",
            ask: "Look at my timetable this week and suggest the best times for 6 hours of revision.",
            events: s.timetable.classes.map((c) => {
              const [from, to] = c.time.split("-");
              return {
                day: DAYS.indexOf(c.day),
                start: hours(from),
                end: hours(to),
                title: c.module.replace(/^\S+\s/, ""),
                meta: `${c.type} · ${c.room}`,
                tone: (c.type === "Lab" ? "good" : c.type === "Tutorial" ? "warn" : "info") as Tone,
              };
            }),
          },
          {
            type: "donut",
            title: "Semester fees",
            icon: "wallet",
            centerValue: `${paidPct}%`,
            centerLabel: "paid",
            note: `RM ${s.fees.outstanding.toLocaleString("en-MY")} due ${inDays(s.fees.dueDate)}.`,
            ask: "Check my outstanding fees and explain my payment options, including an instalment plan.",
            segments: [
              { label: "Paid", value: s.fees.paid, display: rm(s.fees.paid) },
              { label: "Outstanding", value: s.fees.outstanding, display: rm(s.fees.outstanding) },
            ],
          },
          {
            type: "columns",
            title: "GPA by semester",
            icon: "trend",
            max: 4,
            note: `CGPA ${s.results.cgpa.toFixed(2)} · trending up`,
            ask: "My GPA went from 2.95 to 3.42. What should I focus on to reach a 3.5 CGPA by the end of Year 2?",
            items: [
              { label: "Found. S1", value: 2.95, display: "2.95" },
              { label: "Found. S2", value: 3.18, display: "3.18" },
              { label: "Y1 S1", value: 3.2, display: "3.20" },
              { label: "Y1 S2", value: 3.42, display: "3.42", highlight: true },
            ],
          },
          {
            type: "bars",
            title: "Attendance",
            icon: "chart",
            threshold: 80,
            ask: "My Software Engineering attendance is 78%. What happens if I stay below 80% and how do I get back on track?",
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
          {
            type: "list",
            title: "Campus announcements",
            icon: "bell",
            items: [
              { title: "Library open until midnight during exam weeks", meta: `Library · ${shortDate(daysFromNow(-1))}`, badge: "New", tone: "good" },
              { title: "Career fair: 40+ employers hiring interns", meta: `Career Centre · ${shortDate(daysFromNow(9))}`, badge: "Event", tone: "info", ask: "How should I prepare for the career fair as a Year 2 Computer Science student?" },
              { title: "Campus Wi-Fi maintenance on Saturday morning", meta: `IT Services · ${shortDate(daysFromNow(4))}`, badge: "Notice", tone: "warn" },
            ],
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
            type: "week",
            title: "Teaching this week",
            icon: "calendar",
            ask: "Suggest how to use my free slots this week to mark the Quiz 2 short answers.",
            events: [
              { day: 0, start: 9, end: 11, title: "Database Systems", meta: "Lecture · Auditorium 1", tone: "info" },
              { day: 1, start: 14, end: 16, title: "Software Engineering", meta: "Lecture · Auditorium 2", tone: "info" },
              { day: 2, start: 10, end: 12, title: "Database Systems", meta: "Tutorial · B-04-05", tone: "warn" },
              { day: 3, start: 15, end: 17, title: "Office hours", meta: "Room L5-12", tone: "good" },
              { day: 4, start: 9, end: 11, title: "Software Engineering", meta: "Lab · Tech Lab 4-03", tone: "warn" },
            ],
          },
          {
            type: "donut",
            title: "Reflection log submissions",
            icon: "pie",
            centerValue: "63%",
            centerLabel: "submitted",
            note: `Software Engineering · 156 students · due ${inDays(assessments[0].due)}`,
            ask: "Draft a friendly reminder to Software Engineering students who haven't started their reflection log.",
            segments: [
              { label: "Submitted", value: 98, display: "98 students" },
              { label: "Draft started", value: 31, display: "31 students" },
              { label: "Not started", value: 27, display: "27 students" },
            ],
          },
          {
            type: "columns",
            title: "Class average by assessment",
            icon: "chart",
            unit: "%",
            max: 100,
            note: "Quiz 2 dipped: normalisation questions were weakest.",
            ask: "The Database Systems Quiz 2 average dropped to 64%, mainly on normalisation. Suggest a 20-minute revision activity.",
            items: [
              { label: "DB Quiz 1", value: 72 },
              { label: "DB Quiz 2", value: 64, highlight: true },
              { label: "SE Sprint 1", value: 78 },
              { label: "SE Sprint 2", value: 74 },
            ],
          },
          {
            type: "kanban",
            title: "Marking queue",
            icon: "kanban",
            ask: "Help me plan my marking for this week across the queue, with realistic time estimates.",
            columns: [
              { title: "To mark", tone: "warn", cards: [{ title: "Group assignment drafts", meta: "Database Systems · 12 groups" }, { title: "OOP lab portfolio", meta: "34 submissions" }] },
              { title: "In progress", tone: "info", cards: [{ title: "Quiz 2 short answers", meta: "Database Systems · 60 of 182 marked" }] },
              { title: "Released", tone: "good", cards: [{ title: "Quiz 1", meta: "182 students · average 72%" }, { title: "Sprint 1 review", meta: "156 students" }] },
            ],
          },
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
      const card = (t: (typeof tickets)[number]) => ({ title: t.title, meta: `${t.ticketId} · ${t.category}${t.priority === "high" ? " · high priority" : ""}` });
      const available = s.leave.entitled - s.leave.taken - s.leave.pending;
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
            type: "kanban",
            title: "Service tickets",
            icon: "ticket",
            ask: "Summarise my open service tickets and suggest which to chase first.",
            columns: [
              { title: "Open", tone: "warn", cards: tickets.filter((t) => t.status === "Open").map(card) },
              { title: "In progress", tone: "info", cards: tickets.filter((t) => t.status === "In progress").map(card) },
              {
                title: "Resolved this week",
                tone: "good",
                cards: [
                  { title: "Printer jam on Level 3", meta: "DEMO-102114 · Facilities" },
                  { title: "VPN access for new hire", meta: "DEMO-101987 · IT" },
                ],
              },
            ],
          },
          {
            type: "stepper",
            title: "Purchase requisition PR-2041",
            icon: "flag",
            subtitle: "Lab consumables · RM 3,400",
            ask: "What happens at the Finance check for a RM 3,400 purchase, and how long does it usually take?",
            steps: [
              { label: "Raised", meta: shortDate(daysFromNow(-6)), status: "done" },
              { label: "Head of department", meta: "Approved", status: "done" },
              { label: "Finance check", meta: "3 quotations attached", status: "current" },
              { label: "Procurement", status: "todo" },
              { label: "Order placed", status: "todo" },
            ],
          },
          {
            type: "donut",
            title: "Annual leave",
            icon: "sun",
            centerValue: String(s.leave.entitled - s.leave.taken),
            centerLabel: "days left",
            note: "Up to 5 unused days carry forward to 31 March.",
            ask: "How many leave days can I carry forward and when must I use them?",
            segments: [
              { label: "Taken", value: s.leave.taken, display: `${s.leave.taken} days` },
              { label: "Pending approval", value: s.leave.pending, display: `${s.leave.pending} days` },
              { label: "Available", value: available, display: `${available} days` },
            ],
          },
          {
            type: "columns",
            title: "Requests resolved per week",
            icon: "trend",
            note: "Team throughput, last 6 weeks",
            items: [
              { label: "W1", value: 14 },
              { label: "W2", value: 18 },
              { label: "W3", value: 11 },
              { label: "W4", value: 22 },
              { label: "W5", value: 19 },
              { label: "W6", value: 25, highlight: true },
            ],
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
      const seed = r.matchingCalls[0];
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
            type: "donut",
            title: "Grant budget: retinopathy study",
            icon: "pie",
            centerValue: "42%",
            centerLabel: "spent",
            note: "RM 98,000 total · project 55% complete",
            ask: "My grant is 42% spent at 55% project progress. Is that on track, and what should I watch for the rest of the project?",
            segments: [
              { label: "Spent", value: 41200, display: "RM 41,200" },
              { label: "Committed", value: 18500, display: "RM 18,500" },
              { label: "Remaining", value: 38300, display: "RM 38,300" },
            ],
          },
          {
            type: "stepper",
            title: `Proposal: ${seed.call}`,
            icon: "flag",
            subtitle: `Internal deadline ${inDays(seed.internalDeadline)} · up to ${seed.maxAmount}`,
            ask: `Help me finish the methodology section of my proposal for the ${seed.call}.`,
            steps: [
              { label: "Idea and fit check", meta: "Done with Research Office", status: "done" },
              { label: "Draft", meta: "Methodology in progress", status: "current" },
              { label: "Internal review", meta: "Mock panel booked", status: "todo" },
              { label: "Budget sign-off", status: "todo" },
              { label: "Submit", status: "todo" },
            ],
          },
          {
            type: "kanban",
            title: "Publication pipeline",
            icon: "kanban",
            ask: "Which journals would suit my draft on federated learning for retinal imaging, and what should I check before submitting?",
            columns: [
              { title: "Drafting", tone: "warn", cards: [{ title: "Federated learning for retinal imaging", meta: "Target: Q1 journal" }] },
              { title: "Under review", tone: "info", cards: [{ title: "Explainable triage chatbot for clinics", meta: "Journal · round 1 reviews" }] },
              { title: "Accepted", tone: "good", cards: [{ title: "Lightweight CNN for fundus images", meta: "Conference paper" }, { title: "Dataset note: Malaysian fundus images", meta: "Data paper" }] },
            ],
          },
          {
            type: "columns",
            title: "Citations per year",
            icon: "trend",
            note: "Sample profile · 97 citations in total",
            items: [
              { label: "2022", value: 11 },
              { label: "2023", value: 19 },
              { label: "2024", value: 31 },
              { label: "2025", value: 36, highlight: true },
            ],
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

