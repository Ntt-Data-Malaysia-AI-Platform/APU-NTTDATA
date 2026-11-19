/**
 * Sample records behind the demo. Dates are relative to today so the demo
 * always looks current. Replace each function with a call to the real system:
 * student information system, LMS, ITSM, HR and research management.
 */

export const DEMO_NOTE = "Student record.";

export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Date of the next given weekday (today counts). */
function nextWeekday(name: string): string {
  const target = WEEKDAYS.indexOf(name);
  const today = new Date().getDay();
  return daysFromNow((target - today + 7) % 7);
}

// ---------------------------------------------------------------------------
// Prospective students
// ---------------------------------------------------------------------------

export function programmes() {
  return [
    { name: "BSc (Hons) Computer Science", level: "Degree", duration: "3 years", intakes: "Jan, Mar, May, Jul, Sep, Nov", entry: "2 STPM principal passes incl. Mathematics, or Foundation in Computing (CGPA 2.0)", fee: "~RM 30k–35k per year" },
    { name: "BSc (Hons) Software Engineering", level: "Degree", duration: "3 years", intakes: "Jan, May, Sep", entry: "2 A-Level passes incl. Mathematics, or related diploma (CGPA 2.5)", fee: "~RM 30k–35k per year" },
    { name: "BSc (Hons) Data Science and Business Analytics", level: "Degree", duration: "3 years", intakes: "Mar, Jul, Nov", entry: "2 STPM principal passes incl. Mathematics", fee: "~RM 29k–34k per year" },
    { name: "Foundation in Computing", level: "Foundation", duration: "1 year", intakes: "Every two months", entry: "5 SPM credits incl. Mathematics and English", fee: "~RM 18k–22k" },
  ];
}

/** Next three undergraduate intakes (odd months, starting the first Monday-ish of the month). */
export function upcomingIntakes() {
  const out: { date: string; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  while (out.length < 3) {
    d.setMonth(d.getMonth() + 1);
    if (d.getMonth() % 2 === 0) {
      const date = new Date(d.getFullYear(), d.getMonth(), 6);
      out.push({ date: date.toISOString().slice(0, 10), label: `${date.toLocaleString("en-GB", { month: "long" })} intake` });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Current student
// ---------------------------------------------------------------------------

export function studentData() {
  const classes = [
    { day: "Monday", time: "09:00-11:00", module: "CT046-3-2 Database Systems", type: "Lecture", room: "B-06-08" },
    { day: "Monday", time: "14:00-16:00", module: "CT038-3-2 Object Oriented Programming", type: "Lab", room: "Tech Lab 4-03" },
    { day: "Wednesday", time: "10:00-12:00", module: "CT047-3-2 Software Engineering", type: "Lecture", room: "Auditorium 2" },
    { day: "Thursday", time: "13:00-15:00", module: "CT046-3-2 Database Systems", type: "Tutorial", room: "B-04-05" },
    { day: "Friday", time: "09:00-11:00", module: "CT049-3-2 Computer Networks", type: "Lecture", room: "B-07-03" },
  ].map((c) => ({ ...c, date: nextWeekday(c.day) }));

  return {
    profile: {
      name: "Nur Aisyah",
      studentId: "TP000000",
      programme: "BSc (Hons) Computer Science",
      year: 2,
      semester: 1,
      nationality: "Malaysian",
    },
    fees: {
      currency: "MYR",
      semesterInvoice: 15200,
      paid: 10350,
      outstanding: 4850,
      dueDate: daysFromNow(9),
      instalmentPlan: false,
      sponsor: null,
    },
    timetable: {
      week: `${daysFromNow(0)} to ${daysFromNow(6)}`,
      classes: classes.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    },
    results: {
      semester: "Year 1, Semester 2",
      gpa: 3.42,
      cgpa: 3.35,
      modules: [
        { module: "Data Structures and Algorithms", grade: "A-" },
        { module: "Discrete Mathematics", grade: "B+" },
        { module: "Web Development", grade: "A" },
        { module: "Professional Communication", grade: "B" },
      ],
    },
    attendance: {
      minimumRequired: "80%",
      modules: [
        { module: "Database Systems", attendance: 92 },
        { module: "Object Oriented Programming", attendance: 85 },
        { module: "Software Engineering", attendance: 78, warning: "Below the 80% minimum" },
        { module: "Computer Networks", attendance: 88 },
      ],
    },
    deadlines: [
      { title: "Database design group assignment", module: "Database Systems", due: daysFromNow(11) },
      { title: "OOP lab portfolio", module: "Object Oriented Programming", due: daysFromNow(17) },
      { title: "Requirements specification", module: "Software Engineering", due: daysFromNow(24) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tickets (kept for the ticket API)
// ---------------------------------------------------------------------------

export interface Ticket {
  ticketId: string;
  category: string;
  title: string;
  details?: string;
  priority: string;
  status: string;
  created: string;
}

// In-memory store: fine for a demo, but each Cloud Run instance keeps its own
// list. Replace with the real ITSM API.
const tickets: Ticket[] = [
  { ticketId: "INC-104233", category: "IT", title: "Laptop docking station not detecting monitors", priority: "normal", status: "In progress", created: daysFromNow(-3) },
  { ticketId: "INC-103871", category: "Facilities", title: "Air-conditioning leaking in meeting room L5-02", priority: "high", status: "Open", created: daysFromNow(-1) },
];

export function listTickets(): Ticket[] {
  return tickets;
}

export function createTicket(input: { category: string; title: string; details?: string; priority?: string }) {
  const ticket: Ticket = {
    ticketId: `INC-${Math.floor(100000 + Math.random() * 900000)}`,
    category: input.category,
    title: input.title,
    details: input.details,
    priority: input.priority ?? "normal",
    status: "Open",
    created: daysFromNow(0),
  };
  tickets.unshift(ticket);
  if (tickets.length > 50) tickets.length = 50;
  return {
    note: "Your request has been logged with the service desk.",
    ...ticket,
    expectedFirstResponse: ticket.priority === "high" ? "within 4 working hours" : "within 1 working day",
  };
}


// ---------------------------------------------------------------------------
// PhD student
// ---------------------------------------------------------------------------

export function phdData() {
  return {
    profile: {
      name: "Daniel Lim",
      studentId: "TP0PHD00",
      programme: "PhD in Computing (full-time)",
      year: 2,
      thesis: "Explainable deep learning for early diabetic retinopathy screening",
      mainSupervisor: "Assoc. Prof. Dr. Farah Hassan",
      coSupervisor: "Dr. Kumar Raj",
    },
    milestones: [
      { milestone: "Research proposal defence", due: daysFromNow(-210), status: "Passed" },
      { milestone: "Ethics approval", due: daysFromNow(-160), status: "Approved" },
      { milestone: "Annual progress report (Year 2)", due: daysFromNow(24), status: "Due" },
      { milestone: "Mid-candidature review", due: daysFromNow(75), status: "Upcoming" },
      { milestone: "Thesis submission", due: daysFromNow(540), status: "Upcoming" },
    ],
    progress: { overallPercent: 45, chaptersDrafted: 3, chaptersPlanned: 7 },
    supervision: {
      lastMeeting: daysFromNow(-9),
      nextMeeting: daysFromNow(5),
      meetingsThisYear: 14,
      actions: ["Revise Chapter 3 methodology", "Run ablation study on dataset B", "Draft conference abstract"],
    },
    funding: { type: "Graduate research assistantship", stipendMonthly: 2700, endsOn: daysFromNow(400), conferenceAllowanceLeft: 3500 },
    publications: [
      { title: "Lightweight CNN for fundus image grading", venue: "Conference paper", status: "Accepted" },
      { title: "Explainability maps for retinal screening", venue: "Journal article", status: "Under review" },
    ],
    requirement: "At least one indexed journal article accepted before thesis submission",
  };
}

// ---------------------------------------------------------------------------
// International student
// ---------------------------------------------------------------------------

export function visaData() {
  return {
    profile: {
      name: "Rizky Pratama",
      studentId: "TP0INT00",
      nationality: "Indonesian",
      programme: "BSc (Hons) Software Engineering",
      year: 1,
    },
    studentPass: {
      expiresOn: daysFromNow(58),
      renewalWindowOpens: daysFromNow(-32),
      renewalStatus: "Not started",
      daysUntilExpiry: 58,
    },
    renewalChecklist: [
      { step: "Attendance of at least 80%", done: true, detail: "Currently 87%" },
      { step: "Satisfactory academic progress", done: true, detail: "CGPA 3.10" },
      { step: "Valid passport (18+ months)", done: true, detail: "Expires in 3 years" },
      { step: "Medical insurance renewed", done: false, detail: "Policy ends with the pass" },
      { step: "Renewal fee paid", done: false, detail: "Pay through the student portal" },
      { step: "Passport submitted for endorsement", done: false, detail: "After EMGS approval" },
    ],
    insurance: { provider: "Student medical insurance", expiresOn: daysFromNow(58) },
    attendance: 87,
    support: "International Student Office, Level 2, open Monday to Friday 9:00–17:00",
  };
}

// ---------------------------------------------------------------------------
// Master's student
// ---------------------------------------------------------------------------

export function mastersData() {
  return {
    profile: {
      name: "Priya Nair",
      studentId: "TP0MSC00",
      programme: "MSc in Data Science and Business Analytics",
      mode: "Part-time (weekend classes)",
      semester: 2,
    },
    modules: [
      { module: "Machine Learning for Business", credits: 4, status: "In progress", grade: "–" },
      { module: "Big Data Analytics", credits: 4, status: "In progress", grade: "–" },
      { module: "Research Methods", credits: 3, status: "Completed", grade: "A" },
      { module: "Data Visualisation and Storytelling", credits: 3, status: "Completed", grade: "A-" },
    ],
    credits: { earned: 18, required: 42 },
    dissertation: [
      { step: "Choose topic and supervisor", status: "done" },
      { step: "Proposal approved", status: "current", due: daysFromNow(19) },
      { step: "Data collection and analysis", status: "todo" },
      { step: "Draft dissertation", status: "todo" },
      { step: "Submit and present", status: "todo" },
    ],
    weekendClasses: [
      { day: "Saturday", start: "09:00", end: "12:00", module: "Machine Learning for Business", room: "PG Suite 3" },
      { day: "Saturday", start: "14:00", end: "17:00", module: "Big Data Analytics", room: "Tech Lab 5-01" },
      { day: "Sunday", start: "10:00", end: "12:00", module: "Dissertation clinic (optional)", room: "Online" },
    ],
    fees: { semesterInvoice: 9800, paid: 9800, outstanding: 0, employerSponsored: true },
    cgpa: 3.78,
  };
}
