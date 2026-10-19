/**
 * Sample records behind the demo. Dates are relative to today so the demo
 * always looks current. Replace each function with a call to the real system:
 * student information system, LMS, ITSM, HR and research management.
 */

export const DEMO_NOTE = "Sample data for the demo, not a real record.";

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
    { name: "BSc (Hons) Computer Science", level: "Degree", duration: "3 years", intakes: "Jan, Mar, May, Jul, Sep, Nov", entry: "2 STPM principal passes incl. Mathematics, or APU Foundation (CGPA 2.0)", fee: "~RM 30k–35k per year" },
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
      name: "Demo Student",
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
// Lecturer
// ---------------------------------------------------------------------------

export function teachingData() {
  return {
    lecturer: "Demo Lecturer",
    school: "School of Computing",
    modules: [
      {
        code: "CT046-3-2",
        name: "Database Systems",
        cohort: 182,
        learningOutcomes: [
          "Design normalised relational schemas",
          "Write SQL queries for data retrieval and manipulation",
          "Explain transaction management and concurrency control",
        ],
        assessments: [
          { name: "Group assignment: database design", weight: "40%", due: daysFromNow(11), aiLevel: "AI-assisted" },
          { name: "Final examination", weight: "60%", due: daysFromNow(48), aiLevel: "No AI" },
        ],
      },
      {
        code: "CT047-3-2",
        name: "Software Engineering",
        cohort: 156,
        learningOutcomes: [
          "Apply requirements engineering techniques",
          "Model systems using UML",
          "Plan and manage a software project in a team",
        ],
        assessments: [
          { name: "Individual reflection log", weight: "20%", due: daysFromNow(6), aiLevel: "AI-assisted" },
          { name: "Group software project", weight: "50%", due: daysFromNow(32), aiLevel: "AI-integrated" },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Admin staff
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
  { ticketId: "DEMO-104233", category: "IT", title: "Laptop docking station not detecting monitors", priority: "normal", status: "In progress", created: daysFromNow(-3) },
  { ticketId: "DEMO-103871", category: "Facilities", title: "Air-conditioning leaking in meeting room L5-02", priority: "high", status: "Open", created: daysFromNow(-1) },
];

export function listTickets(): Ticket[] {
  return tickets;
}

export function createTicket(input: { category: string; title: string; details?: string; priority?: string }) {
  const ticket: Ticket = {
    ticketId: `DEMO-${Math.floor(100000 + Math.random() * 900000)}`,
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
    note: "Demo only: this ticket was not sent to any real service desk.",
    ...ticket,
    expectedFirstResponse: ticket.priority === "high" ? "within 4 working hours" : "within 1 working day",
  };
}

export function staffData() {
  return {
    name: "Demo Staff",
    department: "Student Services",
    leave: { entitled: 18, taken: 7, pending: 2 },
    approvals: [
      { title: "Purchase requisition: lab consumables (RM 3,400)", from: "IT Labs", due: daysFromNow(2) },
      { title: "Leave request: 3 days", from: "Team member", due: daysFromNow(3) },
      { title: "Expense claim: open day catering", from: "Marketing", due: daysFromNow(5) },
    ],
    calendar: [
      { title: "Payroll cut-off for claims", date: daysFromNow(4) },
      { title: "Orientation week preparation meeting", date: daysFromNow(8) },
      { title: "Quarterly policy review", date: daysFromNow(19) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Researcher
// ---------------------------------------------------------------------------

export function researchData() {
  return {
    researcher: "Demo Researcher",
    area: "Applied machine learning for healthcare",
    activeGrants: [
      { title: "Early detection of diabetic retinopathy with deep learning", funder: "FRGS (sample)", amount: 98000, ends: daysFromNow(210), nextReport: daysFromNow(40), progress: 55 },
      { title: "Industry chatbot for clinic triage", funder: "Industry partner (sample)", amount: 60000, ends: daysFromNow(120), nextReport: daysFromNow(15), progress: 70 },
    ],
    ethicsApprovals: [{ project: "Diabetic retinopathy imaging study", status: "Approved", expires: daysFromNow(180) }],
    matchingCalls: [
      { call: "Internal seed grant, round 2", internalDeadline: daysFromNow(21), maxAmount: "RM 20,000" },
      { call: "National fundamental research grant (sample call)", internalDeadline: daysFromNow(55), maxAmount: "RM 150,000" },
      { call: "ASEAN collaborative research fund (sample call)", internalDeadline: daysFromNow(80), maxAmount: "RM 250,000" },
    ],
  };
}
