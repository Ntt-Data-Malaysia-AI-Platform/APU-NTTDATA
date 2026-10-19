import { icon, PERSONA_ICONS } from "./icons.js";
import { escapeHtml as e } from "./markdown.js";

const PILLARS = [
  { icon: "doc", title: "Grounded in APU knowledge", text: "Answers come from approved APU documents, with sources you can open." },
  { icon: "lock", title: "Role-based access", text: "Each persona sees only the documents and records its role allows." },
  { icon: "shield", title: "Secure on Google Cloud", text: "Runs in APU's own cloud tenant, designed for Malaysia's PDPA." },
  { icon: "globe", title: "Speaks your language", text: "Ask in English, Bahasa Melayu or Chinese and get answers in kind." },
];

export function renderLanding(root, cfg, { lastPersona }) {
  const last = cfg.personas.find((p) => p.id === lastPersona);

  root.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <span class="kicker">${icon("sparkle", "spark-icon")} NTT DATA × APU · GenAI Platform</span>
        <h1>One intelligent platform for <span class="grad-text rainbow">everyone at APU</span></h1>
        <p class="lead">Personal workspaces for prospective students, students, lecturers, staff and researchers, each with a live dashboard, one-click AI tools and an assistant that knows APU.</p>
        <div class="hero-cta">
          <a class="btn btn-primary" href="#personas">Choose your persona ${icon("arrow")}</a>
          ${last ? `<a class="btn btn-ghost" href="#/${e(last.id)}" data-persona="${e(last.id)}"><span class="dot"></span>Continue as ${e(last.label)}</a>` : ""}
        </div>
        <dl class="hero-stats">
          <div><dt>${cfg.personas.length}</dt><dd>personas</dd></div>
          <div><dt>${cfg.knowledge.documents}</dt><dd>knowledge sources</dd></div>
          <div><dt>24/7</dt><dd>always on</dd></div>
        </dl>
      </div>

      <div class="hero-visual" aria-hidden="true">
        <div class="float-card fc-1" data-persona="student">
          <span class="fc-icon">${icon("wallet")}</span>
          <div><small>Fees outstanding</small><strong>RM 4,850</strong><em>due in 9 days</em></div>
        </div>
        <div class="float-card fc-2" data-persona="lecturer">
          <span class="fc-icon">${icon("quiz")}</span>
          <div><small>Quiz generator</small><strong>10 questions ready</strong><em>Database normalisation</em></div>
        </div>
        <div class="float-card fc-3" data-persona="researcher">
          <span class="fc-icon">${icon("target")}</span>
          <div><small>Funding call</small><strong>Closes in 21 days</strong><em>Internal seed grant</em></div>
        </div>
        <div class="float-card fc-4" data-persona="staff">
          <span class="fc-icon">${icon("ticket")}</span>
          <div><small>Service ticket</small><strong>DEMO-104233</strong><em>In progress</em></div>
        </div>
        <div class="orb"></div>
      </div>
    </section>

    <section class="personas-section" id="personas">
      <div class="section-head">
        <h2>Who are you today?</h2>
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
      <img src="brand/ntt-data-logo.svg" alt="NTT DATA" />
      <span class="sep">·</span>
      <span>Demonstration build with sample data. Not official APU information.</span>
    </footer>`;

  // Smooth-scroll the in-page link without changing the route.
  root.querySelector('a[href="#personas"]').addEventListener("click", (ev) => {
    ev.preventDefault();
    root.querySelector("#personas").scrollIntoView({ behavior: "smooth" });
  });
}
