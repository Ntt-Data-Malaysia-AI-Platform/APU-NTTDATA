import { icon, PERSONA_ICONS } from "./icons.js";
import { escapeHtml as e } from "./markdown.js";

const PILLARS = [
  { icon: "doc", title: "Grounded in official guidance", text: "Answers come from approved university documents, with sources you can open." },
  { icon: "lock", title: "Right for your studies", text: "Each student type sees only the documents and records meant for it." },
  { icon: "gemini", title: "Gemini on Google Cloud", text: "Built for Gemini on Vertex AI, in a secure university cloud project, designed for Malaysia's PDPA." },
  { icon: "globe", title: "Speaks your language", text: "Ask in English, Bahasa Melayu or Chinese and get answers in kind." },
];

export function renderLanding(root, cfg, { lastPersona }) {
  const last = cfg.personas.find((p) => p.id === lastPersona);

  root.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <span class="kicker">${icon("gemini", "spark-icon")} NTT DATA · Gemini for Students</span>
        <h1>Higher Education <span class="grad-text rainbow">Reimagined</span> <span class="hero-for">for Students</span></h1>
        <p class="lead">Personal Gemini workspaces for prospective, current, PhD, international and Master's students, each with a live dashboard, one-click AI tools and an assistant that knows your university.</p>
        <div class="hero-cta">
          <a class="btn btn-primary" href="#personas">Choose your student type ${icon("arrow")}</a>
          ${last ? `<a class="btn btn-ghost" href="#/${e(last.id)}" data-persona="${e(last.id)}"><span class="dot"></span>Continue as ${e(last.label)}</a>` : ""}
        </div>
        <dl class="hero-stats">
          <div><dt>${cfg.personas.length}</dt><dd>student types</dd></div>
          <div><dt>${cfg.knowledge.documents}</dt><dd>knowledge sources</dd></div>
          <div><dt>24/7</dt><dd>always on</dd></div>
        </dl>
      </div>

      <div class="hero-visual" aria-hidden="true">
        <div class="float-card fc-1" data-persona="student">
          <span class="fc-icon">${icon("wallet")}</span>
          <div><small>Current student</small><strong>RM 4,850 due</strong><em>in 9 days</em></div>
        </div>
        <div class="float-card fc-2" data-persona="phd">
          <span class="fc-icon">${icon("flag")}</span>
          <div><small>PhD student</small><strong>Progress report</strong><em>due in 24 days</em></div>
        </div>
        <div class="float-card fc-3" data-persona="international">
          <span class="fc-icon">${icon("globe")}</span>
          <div><small>International student</small><strong>Student Pass renewal</strong><em>3 of 6 steps done</em></div>
        </div>
        <div class="float-card fc-4" data-persona="masters">
          <span class="fc-icon">${icon("award")}</span>
          <div><small>Master's student</small><strong>18 of 42 credits</strong><em>proposal due in 19 days</em></div>
        </div>
        <div class="orb"></div>
      </div>
    </section>

    <section class="personas-section" id="personas">
      <div class="section-head">
        <h2>What kind of student are you?</h2>
        <p>Pick a persona to open its workspace. You can switch any time from the top-right menu.</p>
      </div>
      <div class="persona-grid">
        ${cfg.personas
          .map(
            (p) => `
          <a class="persona-card" href="#/${e(p.id)}" data-persona="${e(p.id)}">
            <span class="pc-glow"></span>
            <span class="pc-icon">${icon(PERSONA_ICONS[p.id])}</span>
            <h3>${e(p.label)}</h3>
            <p>${e(p.description)}</p>
            <ul>${p.highlights.map((h) => `<li>${icon("check")}${e(h)}</li>`).join("")}</ul>
            <span class="pc-cta">Enter workspace ${icon("arrow")}</span>
          </a>`,
          )
          .join("")}
      </div>
    </section>

    <section class="pillars">
      ${PILLARS.map(
        (p) => `
        <div class="pillar">
          <span class="pillar-icon">${icon(p.icon)}</span>
          <h3>${p.title}</h3>
          <p>${p.text}</p>
        </div>`,
      ).join("")}
    </section>

    <footer class="site-footer">
      <span>Delivered by</span>
      <span class="logo-badge"><img src="brand/ntt-data-logo-white.png" alt="NTT DATA" /></span>
      <span class="sep">·</span>
      <span>Higher Education Reimagined – Students · NTT DATA</span>
    </footer>`;

  // Smooth-scroll the in-page link without changing the route.
  root.querySelector('a[href="#personas"]').addEventListener("click", (ev) => {
    ev.preventDefault();
    root.querySelector("#personas").scrollIntoView({ behavior: "smooth" });
  });
}
