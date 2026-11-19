import {
  daysFromNow,
  mastersData,
  phdData,
  programmes,
  studentData,
  upcomingIntakes,
  visaData,
} from "./demo-data.js";

import type { PersonaId } from "./personas.js";

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

    case "phd": {
      const d = phdData();
      const next = d.milestones.find((m) => m.status === "Due") ?? d.milestones[d.milestones.length - 1];
      const stepStatus = (s: string): "done" | "current" | "todo" => (s === "Passed" || s === "Approved" ? "done" : s === "Due" ? "current" : "todo");
      return {
        greeting: `Welcome back, ${d.profile.name}`,
        subtitle: `${d.profile.programme} · Year ${d.profile.year} · ${d.profile.thesis}`,
        kpis: [
          { label: "Candidature progress", value: `${d.progress.overallPercent}%`, detail: `${d.progress.chaptersDrafted} of ${d.progress.chaptersPlanned} chapters drafted`, icon: "trend", tone: "info" },
          { label: "Next milestone", value: inDays(next.due), detail: next.milestone, icon: "flag", tone: urgency(next.due) },
          { label: "Next supervision", value: inDays(d.supervision.nextMeeting), detail: `${d.supervision.meetingsThisYear} meetings this year`, icon: "users", tone: "good" },
          { label: "Monthly stipend", value: rm(d.funding.stipendMonthly), detail: `until ${shortDate(d.funding.endsOn)}`, icon: "wallet", tone: "info" },
        ],
        widgets: [
          {
            type: "stepper",
            title: "Candidature milestones",
            icon: "flag",
            subtitle: d.profile.thesis,
            ask: "What goes into my Year 2 annual progress report, and how should I prepare it with my supervisor?",
            steps: d.milestones.map((m) => ({ label: m.milestone, meta: `${m.status} · ${shortDate(m.due)}`, status: stepStatus(m.status) })),
          },
          {
            type: "donut",
            title: "Thesis chapters",
            icon: "pie",
            centerValue: `${d.progress.chaptersDrafted} of ${d.progress.chaptersPlanned}`,
            centerLabel: "drafted",
            note: "Chapter 4 (results) is next after the ablation study.",
            ask: "Help me plan the remaining thesis chapters around my milestones, with realistic dates.",
            segments: [
              { label: "Drafted", value: d.progress.chaptersDrafted, display: `${d.progress.chaptersDrafted} chapters` },
              { label: "In progress", value: 1, display: "1 chapter" },
              { label: "Not started", value: d.progress.chaptersPlanned - d.progress.chaptersDrafted - 1, display: `${d.progress.chaptersPlanned - d.progress.chaptersDrafted - 1} chapters` },
            ],
          },
          {
            type: "kanban",
            title: "Publications",
            icon: "kanban",
            ask: `I need ${d.requirement.toLowerCase()}. Which journals would suit my retinal screening work, and what should I check before submitting?`,
            columns: [
              { title: "Drafting", tone: "warn", cards: [{ title: "Conference abstract: explainable screening", meta: "Supervisor action item" }] },
              { title: "Under review", tone: "info", cards: d.publications.filter((p) => p.status === "Under review").map((p) => ({ title: p.title, meta: p.venue })) },
              { title: "Accepted", tone: "good", cards: d.publications.filter((p) => p.status === "Accepted").map((p) => ({ title: p.title, meta: p.venue })) },
            ],
          },
          {
            type: "list",
            title: `Supervision actions · next meeting ${inDays(d.supervision.nextMeeting)}`,
            icon: "users",
            ask: "Help me prepare an agenda and progress update for my next supervision meeting.",
            items: d.supervision.actions.map((a, i) => ({
              title: a,
              meta: `Agreed ${shortDate(d.supervision.lastMeeting)}`,
              badge: i === 0 ? "In progress" : "To do",
              tone: (i === 0 ? "info" : "warn") as Tone,
              ask: `Help me with this supervision action: ${a.toLowerCase()}. Give me a step-by-step plan.`,
            })),
          },
          {
            type: "timeline",
            title: "Key dates",
            icon: "calendar",
            items: [
              ...d.milestones.filter((m) => daysUntil(m.due) > 0).map((m) => ({ title: m.milestone, date: m.due, meta: inDays(m.due), tone: urgency(m.due) })),
              { title: "Conference allowance: apply 6 weeks before travel", date: daysFromNow(40), meta: `RM ${d.funding.conferenceAllowanceLeft.toLocaleString("en-MY")} left this year`, tone: "info" as Tone, ask: "How do I apply for the conference travel allowance, and what do I need?" },
            ].sort((a, b) => a.date.localeCompare(b.date)),
          },
        ],
      };
    }

    case "international": {
      const d = visaData();
      const done = d.renewalChecklist.filter((c) => c.done).length;
      const firstOpen = d.renewalChecklist.findIndex((c) => !c.done);
      const submitBy = daysFromNow(d.studentPass.daysUntilExpiry - 30);
      return {
        greeting: `Welcome, ${d.profile.name}`,
        subtitle: `${d.profile.programme} · Year ${d.profile.year} · ${d.profile.nationality}`,
        kpis: [
          { label: "Student Pass expires", value: inDays(d.studentPass.expiresOn), detail: shortDate(d.studentPass.expiresOn), icon: "globe", tone: d.studentPass.daysUntilExpiry <= 60 ? "bad" : "warn" },
          { label: "Renewal checklist", value: `${done} of ${d.renewalChecklist.length}`, detail: `status: ${d.studentPass.renewalStatus.toLowerCase()}`, icon: "check", tone: "warn" },
          { label: "Attendance", value: `${d.attendance}%`, detail: "minimum 80% for renewal", icon: "chart", tone: d.attendance >= 80 ? "good" : "bad" },
          { label: "Medical insurance", value: inDays(d.insurance.expiresOn), detail: "ends with your pass", icon: "shield", tone: "warn" },
        ],
        widgets: [
          {
            type: "stepper",
            title: "Student Pass renewal",
            icon: "flag",
            subtitle: `Submit by ${shortDate(submitBy)} to be safe · expires ${shortDate(d.studentPass.expiresOn)}`,
            ask: "Walk me through renewing my Student Pass step by step, with deadlines.",
            steps: d.renewalChecklist.map((c, i) => ({ label: c.step, meta: c.detail, status: (c.done ? "done" : i === firstOpen ? "current" : "todo") as "done" | "current" | "todo" })),
          },
          {
            type: "donut",
            title: "Renewal readiness",
            icon: "pie",
            centerValue: `${Math.round((done / d.renewalChecklist.length) * 100)}%`,
            centerLabel: "ready",
            note: d.support,
            ask: "What should I do first to finish my Student Pass renewal?",
            segments: [
              { label: "Done", value: done, display: `${done} steps` },
              { label: "Still to do", value: d.renewalChecklist.length - done, display: `${d.renewalChecklist.length - done} steps` },
            ],
          },
          {
            type: "timeline",
            title: "Visa dates",
            icon: "calendar",
            items: [
              { title: "Recommended submission date", date: submitBy, meta: "30 days before expiry", tone: urgency(submitBy), ask: "Why should I submit my renewal 30 days before expiry, and what happens if I'm late?" },
              { title: "Medical insurance expires", date: d.insurance.expiresOn, meta: inDays(d.insurance.expiresOn), tone: urgency(d.insurance.expiresOn), ask: "How do I renew my student medical insurance?" },
              { title: "Student Pass expires", date: d.studentPass.expiresOn, meta: inDays(d.studentPass.expiresOn), tone: urgency(d.studentPass.expiresOn) },
            ],
          },
          {
            type: "bars",
            title: "Attendance by module",
            icon: "chart",
            threshold: 80,
            ask: "Which modules should I watch to keep my attendance above 80% for my visa renewal?",
            items: [
              { label: "Requirements Engineering", value: 92, tone: "good" },
              { label: "Programming with Java", value: 88, tone: "good" },
              { label: "Discrete Mathematics", value: 82, tone: "warn" },
              { label: "Communication Skills", value: 85, tone: "good" },
            ],
          },
          {
            type: "list",
            title: "Settling in",
            icon: "pin",
            items: [
              { title: "Open a local bank account", meta: "Bring your passport and offer letter", badge: "Guide", tone: "info", ask: "How do I open a bank account in Malaysia as an international student?" },
              { title: "Get a local SIM card", meta: "Register with your passport", badge: "Guide", tone: "info", ask: "Which documents do I need for a Malaysian SIM card?" },
              { title: "Panel clinics near campus", meta: "Covered by your student insurance", badge: "Health", tone: "good", ask: "Where can I see a doctor near campus with my student insurance?" },
              { title: "Part-time work rules", meta: "Check before taking any job", badge: "Important", tone: "warn", ask: "Can international students work part-time in Malaysia, and what are the rules?" },
            ],
          },
        ],
      };
    }

    case "masters": {
      const d = mastersData();
      const current = d.dissertation.find((s) => s.status === "current");
      const inProgress = d.modules.filter((m) => m.status === "In progress").reduce((n, m) => n + m.credits, 0);
      const toSat = (6 - new Date().getDay() + 7) % 7;
      return {
        greeting: `Welcome back, ${d.profile.name}`,
        subtitle: `${d.profile.programme} · ${d.profile.mode} · Semester ${d.profile.semester}`,
        kpis: [
          { label: "Credits earned", value: `${d.credits.earned} of ${d.credits.required}`, detail: `${inProgress} more in progress`, icon: "award", tone: "info" },
          { label: "CGPA", value: d.cgpa.toFixed(2), detail: "distinction track", icon: "trend", tone: "good" },
          { label: "Dissertation", value: current?.due ? inDays(current.due) : "On track", detail: current?.step ?? "", icon: "doc", tone: current?.due ? urgency(current.due) : "good" },
          { label: "Fees", value: d.fees.outstanding ? rm(d.fees.outstanding) : "Paid", detail: d.fees.employerSponsored ? "employer-sponsored" : "this semester", icon: "wallet", tone: "good" },
        ],
        widgets: [
          {
            type: "stepper",
            title: "Dissertation",
            icon: "flag",
            subtitle: "Proposal approval comes before any data collection",
            ask: "Help me finish my dissertation proposal: what should each section contain?",
            steps: d.dissertation.map((s) => ({ label: s.step, meta: s.due ? `Due ${shortDate(s.due)}` : undefined, status: s.status as "done" | "current" | "todo" })),
          },
          {
            type: "donut",
            title: "Credits to graduate",
            icon: "pie",
            centerValue: `${Math.round((d.credits.earned / d.credits.required) * 100)}%`,
            centerLabel: "earned",
            note: `${d.credits.required} credits including the dissertation`,
            ask: "How many credits do I still need, and how long will it take part-time?",
            segments: [
              { label: "Earned", value: d.credits.earned, display: `${d.credits.earned} credits` },
              { label: "In progress", value: inProgress, display: `${inProgress} credits` },
              { label: "Remaining", value: d.credits.required - d.credits.earned - inProgress, display: `${d.credits.required - d.credits.earned - inProgress} credits` },
            ],
          },
          {
            type: "timeline",
            title: "This weekend's classes",
            icon: "calendar",
            items: d.weekendClasses.map((c) => ({
              title: c.module,
              date: daysFromNow(toSat + (c.day === "Sunday" ? 1 : 0)),
              meta: `${c.day} ${c.start}–${c.end} · ${c.room}`,
              tone: "info" as Tone,
              ask: `Give me a 30-minute prep plan for this weekend's ${c.module} class.`,
            })),
          },
          {
            type: "list",
            title: "My modules",
            icon: "book",
            items: d.modules.map((m) => ({
              title: m.module,
              meta: `${m.credits} credits · ${m.status}`,
              badge: m.grade === "–" ? "In progress" : m.grade,
              tone: (m.grade === "–" ? "info" : "good") as Tone,
              ask: m.grade === "–" ? `Help me plan my study for ${m.module} around full-time work.` : undefined,
            })),
          },
          {
            type: "list",
            title: "Careers and networking",
            icon: "target",
            items: [
              { title: "Data analyst roles at partner companies", meta: "Career Centre job board", badge: "12 open", tone: "good", ask: "What data analyst roles suit an MSc Data Science student, and how should I tailor my CV?" },
              { title: "CV and LinkedIn clinic", meta: `${shortDate(daysFromNow(10))} · Online`, badge: "Event", tone: "info", ask: "Review how I should present my Master's projects on my CV and LinkedIn." },
              { title: "Industry talk: analytics in banking", meta: `${shortDate(daysFromNow(17))} · PG Suite 1`, badge: "Event", tone: "info" },
            ],
          },
        ],
      };
    }
  }
}
