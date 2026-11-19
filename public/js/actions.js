// One-click AI tools for each persona. Each tool is a small form; submitting it
// sends a well-formed request to the assistant (or, for `direct` tools, calls an
// API straight away). Option lists mirror the sample data in server/demo-data.ts.

const STUDENT_MODULES = ["Database Systems", "Object Oriented Programming", "Software Engineering", "Computer Networks"];
const PROGRAMMES = [
  "BSc (Hons) Computer Science",
  "BSc (Hons) Software Engineering",
  "BSc (Hons) Data Science and Business Analytics",
  "Foundation in Computing",
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
        `I'm a prospective student with ${v.qualification}. My interests: ${v.interests}. I'd like to start ${v.intake || "soon"}. Recommend the programmes that fit best, explain why, list the entry requirements I need, and give me the next steps to apply.`,
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
        `I'm ${v.nationality} and want to study a ${v.level} programme in Malaysia. Give me a step-by-step checklist for the student visa (EMGS) and the documents I need, with timings, as a numbered list.`,
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
        `Compare ${v.a} and ${v.b} in a table: duration, intakes, entry requirements, indicative fees and the kind of careers each leads to. Then say who each one suits best.`,
    },
    {
      id: "scholarship",
      icon: "award",
      title: "Scholarship check",
      blurb: "See which scholarships your results could qualify for.",
      fields: [{ name: "results", label: "Your results", type: "textarea", placeholder: "e.g. SPM 7A 2B, active in robotics club", required: true }],
      prompt: (v) =>
        `These are my results and activities: ${v.results}. Which scholarships could I be eligible for, roughly how much might they cover, and how do I apply?`,
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


  phd: [
    {
      id: "progress",
      icon: "doc",
      title: "Progress report builder",
      blurb: "A structured annual progress report.",
      fields: [
        { name: "done", label: "What you achieved this year", type: "textarea", placeholder: "e.g. proposal defence passed, ethics approved, Chapter 3 drafted", required: true },
        { name: "issues", label: "Problems or delays", type: "textarea", placeholder: "e.g. dataset access took 2 months" },
      ],
      prompt: (v) =>
        `Help me structure my annual PhD progress report. Achievements: ${v.done}. Issues: ${v.issues || "none"}. Check my milestones, then give me headings with what to write under each, and a plan for next year. Don't write the report for me.`,
    },
    {
      id: "supervision",
      icon: "users",
      title: "Supervision meeting prep",
      blurb: "An agenda and update for your supervisor.",
      fields: [
        { name: "focus", label: "What do you want to discuss?", type: "textarea", placeholder: "e.g. ablation results, conference deadline", required: true },
        { name: "length", label: "Meeting length", type: "select", options: ["30 minutes", "45 minutes", "60 minutes"] },
      ],
      prompt: (v) =>
        `Prepare a ${v.length} supervision meeting agenda. Topics: ${v.focus}. Check my open supervision actions, and include a short progress update, questions to ask and decisions I need.`,
    },
    {
      id: "litreview",
      icon: "search",
      title: "Literature search plan",
      blurb: "Keywords, databases and a search string.",
      fields: [{ name: "question", label: "Research question", type: "text", placeholder: "e.g. explainable AI for retinal screening", required: true }],
      prompt: (v) =>
        `Create a literature search plan for: "${v.question}". Give key concepts with synonyms, a Boolean search string, which library databases to use, and inclusion and exclusion criteria. Don't invent references.`,
    },
    {
      id: "conference",
      icon: "globe",
      title: "Conference allowance",
      blurb: "Eligibility, documents and timing.",
      fields: [
        { name: "conference", label: "Conference", type: "text", placeholder: "e.g. international conference on medical imaging", required: true },
        { name: "date", label: "Travel date", type: "date", required: true },
      ],
      prompt: (v) => `I want to present at ${v.conference}, travelling on ${v.date}. Am I eligible for the conference allowance, how much is left, what do I need to submit and by when?`,
    },
  ],

  international: [
    {
      id: "renewal",
      icon: "globe",
      title: "Student Pass renewal plan",
      blurb: "Your steps and dates to stay valid.",
      fields: [],
      prompt: () => "Check my Student Pass status and renewal checklist, then give me a dated, step-by-step plan to renew it on time, with the documents for each step.",
    },
    {
      id: "attendance",
      icon: "chart",
      title: "Attendance and visa check",
      blurb: "How attendance affects your renewal.",
      fields: [{ name: "worry", label: "What's worrying you?", type: "text", placeholder: "e.g. I'll miss a week for a family emergency", required: true }],
      prompt: (v) => `${v.worry}. How could this affect my attendance and Student Pass renewal, and what should I do now? Check my current attendance first.`,
    },
    {
      id: "documents",
      icon: "list",
      title: "Document checklist",
      blurb: "What to prepare for any visa step.",
      fields: [{ name: "task", label: "For", type: "select", options: ["Student Pass renewal", "Changing programme", "Travelling home during the break", "Deferring a semester"] }],
      prompt: (v) => `Give me a checklist of documents and steps for: ${v.task.toLowerCase()}, as an international student. Include who to contact and how long it takes.`,
    },
    {
      id: "settle",
      icon: "pin",
      title: "Settling-in guide",
      blurb: "Banking, SIM, health and getting around.",
      fields: [{ name: "need", label: "I need help with", type: "select", options: ["Opening a bank account", "Getting a SIM card", "Seeing a doctor", "Getting to campus", "Part-time work rules"] }],
      prompt: (v) => `I'm a new international student in Kuala Lumpur. Help me with: ${v.need.toLowerCase()}. Give practical steps and what to bring.`,
    },
  ],

  masters: [
    {
      id: "proposal",
      icon: "doc",
      title: "Dissertation proposal helper",
      blurb: "Structure and feedback for your proposal.",
      fields: [
        { name: "topic", label: "Topic", type: "text", placeholder: "e.g. churn prediction for Malaysian telcos", required: true },
        { name: "question", label: "Research question", type: "textarea", required: true },
      ],
      prompt: (v) =>
        `Help me structure my Master's dissertation proposal on "${v.topic}". Research question: ${v.question}. Give the sections with what each must cover, likely data sources and risks. Don't write it for me.`,
    },
    {
      id: "method",
      icon: "bulb",
      title: "Research methods coach",
      blurb: "Pick the right method for your question.",
      fields: [
        { name: "question", label: "Your research question", type: "textarea", required: true },
        { name: "data", label: "Data you can get", type: "select", options: ["Survey responses", "Company dataset", "Public datasets", "Interviews", "Not sure yet"] },
      ],
      prompt: (v) => `My research question is: ${v.question}. I can get: ${v.data.toLowerCase()}. Which research methods fit, what are the trade-offs, and which would you recommend?`,
    },
    {
      id: "plan",
      icon: "calendar",
      title: "Study plan around work",
      blurb: "Weekly plan for part-time study.",
      fields: [{ name: "hours", label: "Hours a week you can study", type: "number", value: "10", min: 2, max: 40 }],
      prompt: (v) => `I study part-time alongside full-time work and have ${v.hours} hours a week. Using my modules and dissertation milestones, build a weekly study plan as a table.`,
    },
    {
      id: "career",
      icon: "target",
      title: "Career and CV helper",
      blurb: "Turn your modules into job-ready skills.",
      fields: [{ name: "role", label: "Target role", type: "text", placeholder: "e.g. data analyst in banking", required: true }],
      prompt: (v) => `I'm doing an MSc in Data Science and Business Analytics and want to become a ${v.role}. Map my modules to the skills employers want, and suggest CV bullet points and a portfolio project.`,
    },
  ],
};
