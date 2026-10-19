import { ACTIONS } from "./actions.js";
import { createTicket, getDashboard } from "./api.js";
import { icon, PERSONA_ICONS } from "./icons.js";
import { escapeHtml as e } from "./markdown.js";

const fmtDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return {
    day: d.toLocaleDateString("en-GB", { day: "numeric" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }),
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
  };
};

const askAttr = (ask) => (ask ? ` data-ask="${e(ask)}" tabindex="0" role="button"` : "");
const askHint = (ask) => (ask ? `<span class="ask-hint">${icon("sparkle")} Ask AI</span>` : "");

// ---------- widgets ----------

function kpiCard(k) {
  return `
    <div class="kpi tone-${e(k.tone ?? "info")}">
      <span class="kpi-icon">${icon(k.icon)}</span>
      <div class="kpi-body">
        <span class="kpi-label">${e(k.label)}</span>
        <strong class="kpi-value">${e(k.value)}</strong>
        ${k.detail ? `<span class="kpi-detail">${e(k.detail)}</span>` : ""}
      </div>
    </div>`;
}

function widgetBody(w) {
  switch (w.type) {
    case "timeline":
      return `<ol class="w-timeline">${w.items
        .map((it) => {
          const d = fmtDate(it.date);
          return `
          <li class="tl-item tone-${e(it.tone ?? "info")}${it.ask ? " askable" : ""}"${askAttr(it.ask)}>
            <span class="tl-date"><b>${e(d.day)}</b><small>${e(d.month)}</small></span>
            <span class="tl-main"><span class="tl-title">${e(it.title)}</span>${it.meta ? `<span class="tl-meta">${e(it.meta)}</span>` : ""}</span>
            ${it.badge ? `<span class="pill">${e(it.badge)}</span>` : ""}
            ${askHint(it.ask)}
          </li>`;
        })
        .join("")}</ol>`;
    case "list":
      return `<ul class="w-list">${w.items
        .map(
          (it) => `
          <li class="li-item tone-${e(it.tone ?? "info")}${it.ask ? " askable" : ""}"${askAttr(it.ask)}>
            <span class="li-dot"></span>
            <span class="li-main"><span class="li-title">${e(it.title)}</span>${it.meta ? `<span class="li-meta">${e(it.meta)}</span>` : ""}</span>
            ${it.badge ? `<span class="pill">${e(it.badge)}</span>` : ""}
            ${askHint(it.ask)}
          </li>`,
        )
        .join("")}</ul>`;
    case "bars":
      return `<div class="w-bars">${w.items
        .map(
          (b) => `
          <div class="bar-row tone-${e(b.tone ?? "info")}">
            <div class="bar-head"><span>${e(b.label)}</span><b>${e(b.value)}%</b></div>
            <div class="bar-track">
              <span class="bar-fill" data-width="${e(b.value)}"></span>
              ${w.threshold ? `<span class="bar-threshold" data-left="${e(w.threshold)}" title="Minimum ${e(w.threshold)}%"></span>` : ""}
            </div>
          </div>`,
        )
        .join("")}${w.threshold ? `<p class="bar-note">Dashed line: ${e(w.threshold)}% minimum attendance</p>` : ""}</div>`;
    case "cards":
      return `<div class="w-cards">${w.items
        .map(
          (c) => `
          <article class="mini-card${c.ask ? " askable" : ""}"${askAttr(c.ask)}>
            <header><h4>${e(c.title)}</h4>${c.tag ? `<span class="pill">${e(c.tag)}</span>` : ""}</header>
            ${c.subtitle ? `<p class="mc-sub">${e(c.subtitle)}</p>` : ""}
            ${c.lines.map((l) => `<p class="mc-line">${e(l)}</p>`).join("")}
            ${typeof c.progress === "number" ? `<div class="progress"><span class="progress-track"><span class="progress-fill" data-width="${e(c.progress)}"></span></span><span>${e(c.progress)}% complete</span></div>` : ""}
            ${askHint(c.ask)}
          </article>`,
        )
        .join("")}</div>`;
    case "checklist":
      return `<ul class="w-check">${w.items
        .map(
          (c, i) => `
          <li><label><input type="checkbox" data-check="${i}"${c.done ? " checked" : ""} /><span class="box">${icon("check")}</span><span>${e(c.text)}</span></label></li>`,
        )
        .join("")}</ul>`;
    default:
      return "";
  }
}

function widget(w) {
  const wide = w.type === "cards" ? " wide" : "";
  return `
    <section class="widget${wide}">
      <header class="w-head"><span class="w-icon">${icon(w.icon)}</span><h3>${e(w.title)}</h3></header>
      ${widgetBody(w)}
    </section>`;
}

// ---------- AI tools ----------

function toolCard(a) {
  return `
    <button type="button" class="tool-card" data-tool="${e(a.id)}">
      <span class="tool-icon">${icon(a.icon)}</span>
      <span class="tool-text"><b>${e(a.title)}</b><small>${e(a.blurb)}</small></span>
      <span class="tool-go">${icon(a.direct ? "plus" : "sparkle")}</span>
    </button>`;
}

function fieldHtml(f) {
  const id = `f-${f.name}`;
  const req = f.required ? " required" : "";
  const ph = f.placeholder ? ` placeholder="${e(f.placeholder)}"` : "";
  let control;
  if (f.type === "textarea") {
    control = `<textarea id="${id}" name="${e(f.name)}" rows="${f.rows ?? 4}"${ph}${req}>${e(f.value ?? "")}</textarea>`;
  } else if (f.type === "select") {
    control = `<select id="${id}" name="${e(f.name)}">${f.options
      .map((o) => `<option${o === f.value ? " selected" : ""}>${e(o)}</option>`)
      .join("")}</select>`;
  } else {
    const minmax = `${f.min != null ? ` min="${f.min}"` : ""}${f.max != null ? ` max="${f.max}"` : ""}`;
    control = `<input id="${id}" name="${e(f.name)}" type="${e(f.type)}" value="${e(f.value ?? "")}"${ph}${minmax}${req} />`;
  }
  return `<label class="field" for="${id}"><span>${e(f.label)}${f.required ? ' <i aria-hidden="true">*</i>' : ""}</span>${control}</label>`;
}

function openToolDialog(dialog, action, persona, { chat, toast, reload }) {
  dialog.dataset.persona = persona.id;
  dialog.innerHTML = `
    <form method="dialog" class="tool-form">
      <header>
        <span class="tool-icon">${icon(action.icon)}</span>
        <div><h3>${e(action.title)}</h3><p>${e(action.blurb)}</p></div>
        <button type="button" class="icon-btn" data-close aria-label="Close">${icon("close")}</button>
      </header>
      <div class="fields">${action.fields.length ? action.fields.map(fieldHtml).join("") : `<p class="no-fields">No details needed. The assistant will use your record.</p>`}</div>
      <p class="form-error" hidden></p>
      <footer>
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">${action.direct ? "Submit" : `${icon("sparkle")} Generate`}</button>
      </footer>
    </form>`;

  const form = dialog.querySelector("form");
  const errorEl = dialog.querySelector(".form-error");
  dialog.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => dialog.close()));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());

    if (action.direct === "ticket") {
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const t = await createTicket(values);
        dialog.close();
        toast(`Ticket ${t.ticketId} logged · first response ${t.expectedFirstResponse}`);
        reload();
      } catch (err) {
        errorEl.hidden = false;
        errorEl.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
      return;
    }

    dialog.close();
    const summary = action.fields
      .map((f) => values[f.name])
      .filter((v) => v && String(v).trim())
      .join(" · ");
    chat.ask(action.prompt(values), {
      tool: action,
      display: summary.length > 160 ? `${summary.slice(0, 157)}…` : summary || action.blurb,
    });
  });

  dialog.showModal();
  dialog.querySelector("input, textarea, select")?.focus();
}

// ---------- page ----------

export async function renderWorkspace(root, persona, ctx) {
  const actions = ACTIONS[persona.id] ?? [];
  root.innerHTML = `
    <div class="ws-hero">
      <span class="ws-persona-icon">${icon(PERSONA_ICONS[persona.id])}</span>
      <div>
        <span class="ws-eyebrow">${e(persona.label)} workspace</span>
        <h1 id="ws-greeting" class="skeleton-text">Loading your workspace…</h1>
        <p id="ws-subtitle">${e(persona.tagline)}</p>
      </div>
    </div>
    <div class="kpi-grid" id="ws-kpis">${'<div class="kpi skeleton"></div>'.repeat(4)}</div>

    <div class="section-title"><h2>${icon("sparkle")} AI tools</h2><span>Fill in a few details; the assistant does the rest.</span></div>
    <div class="tool-grid">${actions.map(toolCard).join("")}</div>

    <div class="section-title"><h2>${icon("layers")} At a glance</h2><span>Click any item marked <b>Ask AI</b> to get help with it.</span></div>
    <div class="widget-grid" id="ws-widgets">${'<section class="widget skeleton"></section>'.repeat(2)}</div>`;

  root.querySelectorAll(".tool-card").forEach((btn) =>
    btn.addEventListener("click", () => {
      const action = actions.find((a) => a.id === btn.dataset.tool);
      openToolDialog(ctx.dialog, action, persona, { ...ctx, reload: () => load() });
    }),
  );

  // Delegate "Ask AI" clicks on dashboard items.
  const widgetsEl = root.querySelector("#ws-widgets");
  const onAsk = (ev) => {
    if (ev.type === "keydown" && ev.key !== "Enter") return;
    const el = ev.target.closest("[data-ask]");
    if (el) ctx.chat.ask(el.dataset.ask);
  };
  widgetsEl.addEventListener("click", onAsk);
  widgetsEl.addEventListener("keydown", onAsk);

  async function load() {
    try {
      const d = await getDashboard(persona.id);
      if (ctx.isStale()) return;
      const greeting = root.querySelector("#ws-greeting");
      greeting.textContent = d.greeting;
      greeting.classList.remove("skeleton-text");
      root.querySelector("#ws-subtitle").textContent = d.subtitle;
      root.querySelector("#ws-kpis").innerHTML = d.kpis.map(kpiCard).join("");
      widgetsEl.innerHTML = d.widgets.map(widget).join("");
      // Sizes are set through the CSSOM (inline style attributes are blocked by the CSP).
      widgetsEl.querySelectorAll("[data-width]").forEach((el) => (el.style.width = `${Number(el.dataset.width)}%`));
      widgetsEl.querySelectorAll("[data-left]").forEach((el) => (el.style.left = `${Number(el.dataset.left)}%`));
    } catch (err) {
      if (ctx.isStale()) return;
      widgetsEl.innerHTML = `<p class="error">Couldn't load your dashboard: ${e(err.message)}</p>`;
    }
  }
  await load();
}
