// One-click AI tools for each persona. Each tool is a small form; submitting it
// sends a well-formed request to the assistant (or, for `direct` tools, calls an
// API straight away). Option lists mirror the sample data in server/demo-data.ts.

const STUDENT_MODULES = ["Database Systems", "Object Oriented Programming", "Software Engineering", "Computer Networks"];
const LECTURER_MODULES = ["CT046-3-2 Database Systems", "CT047-3-2 Software Engineering"];
const ASSESSMENTS = [
  "Group assignment: database design (Database Systems, 40%)",
  "Final examination (Database Systems, 60%)",
  "Individual reflection log (Software Engineering, 20%)",
  "Group software project (Software Engineering, 50%)",
];
const PROGRAMMES = [
  "BSc (Hons) Computer Science",
  "BSc (Hons) Software Engineering",
  "BSc (Hons) Data Science and Business Analytics",
  "Foundation in Computing",
];
const CALLS = [
  "Internal seed grant, round 2",
  "National fundamental research grant (sample call)",
  "ASEAN collaborative research fund (sample call)",
];

export const ACTIONS = {
  prospective: [
    {
      id: "finder",
      icon: "compass",
      title: "Programme finder",
      blurb: "Match your interests and results to the right programme.",
      fields: [
        { name: "interests", label: "What do you enjoy or want to become?", type: "textarea", placeholder: "e.g. building apps, games, working with data, cybersecurity…", required: true },
        { name: "qualification", label: "Your qualification", type: "select", options: ["SPM", "STPM", "A-Level", "Diploma", "UEC", "Other"] },
        { name: "intake", label: "When would you like to start?", type: "text", placeholder: "e.g. next March" },
      ],
      prompt: (v) =>
        `I'm a prospective student with ${v.qualification}. My interests: ${v.interests}. I'd like to start ${v.intake || "soon"}. Recommend the APU programmes that fit best, explain why, list the entry requirements I need, and give me the next steps to apply.`,
    },
    {
      id: "visa",
      icon: "globe",
      title: "Visa and documents checklist",
      blurb: "Your personal checklist for coming to study in Malaysia.",
      fields: [
        { name: "nationality", label: "Nationality", type: "text", placeholder: "e.g. Indonesian", required: true },
        { name: "level", label: "Programme level", type: "select", options: ["Foundation", "Diploma", "Degree", "Postgraduate"] },
      ],
      prompt: (v) =>
        `I'm ${v.nationality} and want to study a ${v.level} programme at APU. Give me a step-by-step checklist for the student visa (EMGS) and the documents I need, with timings, as a numbered list.`,
    },
    {
      id: "compare",
      icon: "scale",
      title: "Compare programmes",
      blurb: "Side-by-side comparison of two programmes.",
      fields: [
        { name: "a", label: "First programme", type: "select", options: PROGRAMMES },
        { name: "b", label: "Second programme", type: "select", options: PROGRAMMES, value: PROGRAMMES[1] },
      ],
      prompt: (v) =>
        `Compare ${v.a} and ${v.b} at APU in a table: duration, intakes, entry requirements, indicative fees and the kind of careers each leads to. Then say who each one suits best.`,
    },
    {
      id: "scholarship",
      icon: "award",
      title: "Scholarship check",
      blurb: "See which scholarships your results could qualify for.",
      fields: [{ name: "results", label: "Your results", type: "textarea", placeholder: "e.g. SPM 7A 2B, active in robotics club", required: true }],
      prompt: (v) =>
        `These are my results and activities: ${v.results}. Which APU scholarships could I be eligible for, roughly how much might they cover, and how do I apply?`,
    },
  ],

  student: [
    {
      id: "planner",
      icon: "calendar",
      title: "Study planner",
      blurb: "A week-by-week revision plan for any module.",
      fields: [
        { name: "module", label: "Module", type: "select", options: STUDENT_MODULES },
        { name: "date", label: "Exam or deadline date", type: "date", required: true },
        { name: "hours", label: "Hours per week you can study", type: "number", value: "6", min: 1, max: 40 },
      ],
      prompt: (v) =>
        `Create a week-by-week study plan for ${v.module}, with my exam or deadline on ${v.date} and ${v.hours} hours a week available. Check my timetable so sessions don't clash with classes. Use a table.`,
    },
    {
      id: "explain",
      icon: "bulb",
      title: "Explain a concept",
      blurb: "Understand a topic step by step, with a quick self-check.",
      fields: [
        { name: "topic", label: "Topic", type: "text", placeholder: "e.g. third normal form", required: true },
        { name: "level", label: "Depth", type: "select", options: ["Simple overview", "Exam-ready detail"] },
      ],
      prompt: (v) =>
        `Explain "${v.topic}" to me (${v.level.toLowerCase()}). Use a simple example, then give me two short questions to check my understanding. Don't just give answers to assessed work.`,
    },
    {
      id: "ec",
      icon: "help",
      title: "Missed an assessment?",
      blurb: "What to do, the deadline and a draft EC statement.",
      fields: [
        { name: "what", label: "What happened?", type: "textarea", placeholder: "e.g. I had a fever and missed the Database Systems test", required: true },
        { name: "date", label: "Date of the assessment", type: "date", required: true },
      ],
      prompt: (v) =>
        `I missed an assessment on ${v.date}. What happened: ${v.what}. Tell me exactly what I need to do under the extenuating circumstances rules, the deadline, the evidence needed, and draft a short, honest statement I can submit.`,
    },
    {
      id: "fees",
      icon: "wallet",
      title: "Fee payment options",
      blurb: "Check what you owe and your options for paying it.",
      fields: [],
      prompt: () =>
        "Check my outstanding fees and due date, then explain my payment options, including instalment plans and what happens if I pay late.",
    },
  ],

  lecturer: [
    {
      id: "quiz",
      icon: "quiz",
      title: "Quiz generator",
      blurb: "Questions with answers, mapped to learning outcomes.",
      fields: [
        { name: "module", label: "Module", type: "select", options: LECTURER_MODULES },
        { name: "topic", label: "Topic", type: "text", placeholder: "e.g. normalisation to 3NF", required: true },
        { name: "count", label: "Number of questions", type: "number", value: "10", min: 3, max: 25 },
        { name: "format", label: "Format", type: "select", options: ["Multiple choice", "Short answer", "Mixed"] },
        { name: "difficulty", label: "Difficulty", type: "select", options: ["Introductory", "Intermediate", "Advanced"], value: "Intermediate" },
      ],
      prompt: (v) =>
        `Create a ${v.count}-question ${v.format.toLowerCase()} quiz on "${v.topic}" for ${v.module} at ${v.difficulty.toLowerCase()} level. Map each question to one of my module's learning outcomes, and put an answer key with brief explanations at the end.`,
    },
    {
      id: "rubric",
      icon: "list",
      title: "Rubric builder",
      blurb: "A marking rubric with clear performance levels.",
      fields: [
        { name: "assessment", label: "Assessment", type: "select", options: ASSESSMENTS },
        { name: "criteria", label: "Number of criteria", type: "number", value: "5", min: 3, max: 8 },
        { name: "levels", label: "Performance levels", type: "select", options: ["4 levels", "5 levels", "3 levels"] },
      ],
      prompt: (v) =>
        `Build a marking rubric for "${v.assessment}" with ${v.criteria} criteria and ${v.levels}, as a table. Give each criterion a weighting that sums to 100%, and describe each level concretely. Note how the assessment's GenAI level should be reflected.`,
    },
    {
      id: "feedback",
      icon: "edit",
      title: "Feedback drafter",
      blurb: "Constructive feedback you review before release.",
      fields: [
        { name: "work", label: "Summary of the student's work", type: "textarea", placeholder: "Strengths, weaknesses, what was missing…", required: true },
        { name: "band", label: "Grade band", type: "select", options: ["Distinction (70+)", "Merit (60–69)", "Pass (40–59)", "Fail (<40)"] },
        { name: "tone", label: "Tone", type: "select", options: ["Encouraging", "Direct", "Formal"] },
      ],
      prompt: (v) =>
        `Draft ${v.tone.toLowerCase()} feedback for a student's submission in the ${v.band} band. Notes on the work: ${v.work}. Structure it as strengths, areas to improve with specific actions, and one feed-forward point. I will review it and set the final mark.`,
    },
    {
      id: "lesson",
      icon: "presentation",
      title: "Lesson planner",
      blurb: "An active-learning plan for your next class.",
      fields: [
        { name: "module", label: "Module", type: "select", options: LECTURER_MODULES },
        { name: "topic", label: "Topic", type: "text", placeholder: "e.g. UML sequence diagrams", required: true },
        { name: "minutes", label: "Duration (minutes)", type: "number", value: "120", min: 30, max: 240 },
      ],
      prompt: (v) =>
        `Plan a ${v.minutes}-minute class on "${v.topic}" for ${v.module}: objectives linked to the learning outcomes, a timed run sheet with active-learning activities, and a 3-question exit ticket.`,
    },
  ],

  staff: [
    {
      id: "ticket",
      icon: "ticket",
      title: "Log a service ticket",
      blurb: "IT, facilities, HR or finance. Logged straight away.",
      direct: "ticket",
      fields: [
        { name: "category", label: "Category", type: "select", options: ["IT", "Facilities", "HR", "Finance"] },
        { name: "priority", label: "Priority", type: "select", options: ["normal", "low", "high"] },
        { name: "title", label: "Short title", type: "text", placeholder: "e.g. Projector in B-07-03 not working", required: true },
        { name: "details", label: "Details", type: "textarea", placeholder: "What's wrong, where, since when…" },
      ],
    },
    {
      id: "email",
      icon: "mail",
      title: "Email drafter",
      blurb: "Clear, on-tone emails in seconds.",
      fields: [
        { name: "to", label: "Recipient", type: "text", placeholder: "e.g. a parent, a vendor, all students", required: true },
        { name: "purpose", label: "What should the email say?", type: "textarea", required: true },
        { name: "tone", label: "Tone", type: "select", options: ["Friendly", "Formal", "Firm but polite"] },
      ],
      prompt: (v) =>
        `Draft a ${v.tone.toLowerCase()} email to ${v.to}. Purpose: ${v.purpose}. If an APU policy is relevant, check it and reflect it accurately. Include a subject line.`,
    },
    {
      id: "minutes",
      icon: "doc",
      title: "Meeting minutes",
      blurb: "Turn rough notes into minutes with actions.",
      fields: [{ name: "notes", label: "Paste your meeting notes", type: "textarea", rows: 8, required: true }],
      prompt: (v) =>
        `Turn these meeting notes into formal minutes: attendees (if mentioned), key discussion points, decisions, and an action table with owner and due date.\n\nNotes:\n${v.notes}`,
    },
    {
      id: "policy",
      icon: "search",
      title: "Policy explainer",
      blurb: "Ask any policy question and get a cited answer.",
      fields: [{ name: "question", label: "Your question", type: "text", placeholder: "e.g. Can I carry forward unused leave?", required: true }],
      prompt: (v) => `${v.question} Answer from APU policy with citations, then list any steps I need to take.`,
    },
  ],

  researcher: [
    {
      id: "proposal",
      icon: "doc",
      title: "Proposal outline",
      blurb: "A funder-ready structure for your next proposal.",
      fields: [
        { name: "title", label: "Working title", type: "text", required: true },
        { name: "call", label: "Funding call", type: "select", options: CALLS },
        { name: "problem", label: "The problem you're tackling", type: "textarea", required: true },
      ],
      prompt: (v) =>
        `Build a proposal outline for "${v.title}" targeting the ${v.call}. Problem: ${v.problem}. Include problem statement, objectives, methodology, expected outcomes and impact, milestones, and a budget structure. Flag anything the funder will scrutinise. Don't invent citations or statistics.`,
    },
    {
      id: "abstract",
      icon: "edit",
      title: "Abstract polisher",
      blurb: "Tighten an abstract to a word limit.",
      fields: [
        { name: "abstract", label: "Your abstract", type: "textarea", rows: 8, required: true },
        { name: "limit", label: "Word limit", type: "number", value: "250", min: 50, max: 500 },
      ],
      prompt: (v) =>
        `Improve this abstract for clarity and impact within ${v.limit} words, keeping all claims as they are. Then list the main changes you made.\n\n${v.abstract}`,
    },
    {
      id: "ethics",
      icon: "shield",
      title: "Ethics readiness check",
      blurb: "What your ethics application needs before you submit.",
      fields: [
        { name: "study", label: "Describe your study", type: "textarea", required: true },
        { name: "participants", label: "Participants", type: "select", options: ["Adults", "Students", "Patients", "Minors", "No human participants"] },
      ],
      prompt: (v) =>
        `Check my study's readiness for research ethics approval. Participants: ${v.participants}. Study: ${v.study}. List the documents I need, the likely review route and timeline, and data management (PDPA) points to address, as a checklist.`,
    },
    {
      id: "lit",
      icon: "search",
      title: "Literature search plan",
      blurb: "Keywords, databases and a search strategy.",
      fields: [{ name: "question", label: "Research question", type: "text", required: true }],
      prompt: (v) =>
        `Create a literature search plan for: "${v.question}". Give key concepts with synonyms, a Boolean search string, which library databases to use, and inclusion and exclusion criteria.`,
    },
  ],
};
