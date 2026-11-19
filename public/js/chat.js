import { streamChat } from "./api.js";
import { icon } from "./icons.js";
import { escapeHtml as e, renderMarkdown } from "./markdown.js";

/**
 * The docked AI assistant. One instance lives for the whole page; switching
 * persona resets it.
 */
export function createChat(root, { onOpen }) {
  root.innerHTML = `
    <div class="as-head">
      <span class="as-avatar">${icon("sparkle")}</span>
      <div class="as-title">
        <strong id="as-name">AI Assistant</strong>
        <small><span class="live-dot"></span> Grounded in APU knowledge</small>
      </div>
      <button type="button" class="icon-btn as-expand" id="as-expand" title="Wider panel" aria-label="Toggle wider assistant panel" aria-pressed="false">${icon("widen")}</button>
      <button type="button" class="icon-btn" id="as-new" title="New conversation" aria-label="New conversation">${icon("refresh")}</button>
      <button type="button" class="icon-btn as-close" id="as-close" title="Close" aria-label="Close assistant">${icon("close")}</button>
    </div>
    <button type="button" class="as-jump" id="as-jump" hidden>${icon("arrowDown")} More below</button>
    <div class="as-scroll" id="as-scroll">
      <div class="as-empty" id="as-empty">
        <span class="as-empty-icon">${icon("chat")}</span>
        <h3>Ask me anything</h3>
        <p id="as-tagline"></p>
        <div class="as-suggestions" id="as-suggestions"></div>
      </div>
      <ol class="thread" id="as-thread" aria-live="polite"></ol>
      <div class="as-spacer" id="as-spacer" aria-hidden="true"></div>
    </div>
    <form class="composer" id="as-form">
      <label class="sr-only" for="as-input">Message</label>
      <textarea id="as-input" rows="1" maxlength="8000" placeholder="Ask anything…" autocomplete="off"></textarea>
      <button type="submit" class="send" id="as-send" aria-label="Send">${icon("send")}</button>
      <button type="button" class="stop" id="as-stop" aria-label="Stop" hidden>${icon("stop")}</button>
    </form>
    <p class="disclaimer">Gemini can make mistakes. Check important details with the relevant APU office.</p>`;

  const $ = (id) => root.querySelector(`#${id}`);
  const els = {
    name: $("as-name"),
    tagline: $("as-tagline"),
    scroll: $("as-scroll"),
    empty: $("as-empty"),
    suggestions: $("as-suggestions"),
    thread: $("as-thread"),
    form: $("as-form"),
    input: $("as-input"),
    send: $("as-send"),
    stop: $("as-stop"),
    jump: $("as-jump"),
    spacer: $("as-spacer"),
    expand: $("as-expand"),
  };

  // Answers read from the top down: each new question is scrolled to the top
  // of the panel and its answer fills in below it. The panel never jumps to
  // the end; "More below" appears when the answer runs past the visible area.
  // `turn` is the newest question's list item.
  const state = { persona: null, history: [], controller: null, turn: null };

  // ---------- rendering ----------

  function addUser(text, tool) {
    const li = document.createElement("li");
    li.className = "msg user";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    if (tool) {
      const chip = document.createElement("span");
      chip.className = "tool-chip";
      chip.innerHTML = `${icon(tool.icon)} ${e(tool.title)}`;
      bubble.append(chip);
    }
    bubble.append(document.createTextNode(text));
    li.append(bubble);
    els.thread.append(li);
    return li;
  }

  function addAssistant() {
    const li = document.createElement("li");
    li.className = "msg assistant streaming";
    li.innerHTML = `
      <div class="body">
        <div class="status"><span class="dots"><i></i><i></i><i></i></span><span class="status-text">Thinking</span></div>
        <div class="content"></div>
        <div class="sources" hidden></div>
      </div>`;
    els.thread.append(li);
    const view = {
      li,
      status: li.querySelector(".status"),
      statusText: li.querySelector(".status-text"),
      content: li.querySelector(".content"),
      sources: li.querySelector(".sources"),
      text: "",
      pending: false,
      lastRender: 0,
    };
    const onCite = (ev) => {
      const cite = ev.target.closest(".cite");
      if (!cite || (ev.type === "keydown" && ev.key !== "Enter")) return;
      const item = view.sources.querySelector(`[data-ref="${cite.dataset.ref}"]`);
      if (!item) return;
      item.open = true;
      item.classList.add("flash");
      item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setTimeout(() => item.classList.remove("flash"), 1200);
    };
    view.content.addEventListener("click", onCite);
    view.content.addEventListener("keydown", onCite);
    return view;
  }

  function renderSources(view, sources) {
    view.sources.hidden = false;
    view.sources.innerHTML = `<div class="sources-title">Sources</div>${sources
      .map(
        (s) => `
        <details class="source" data-ref="${e(s.ref)}">
          <summary><span class="num">${e(s.ref)}</span><span class="src-label">${e(s.title)} › ${e(s.section)}</span><span class="meta">${e(s.owner)}</span></summary>
          <div class="excerpt">${e(s.text)}</div>
        </details>`,
      )
      .join("")}`;
  }

  function render(view) {
    view.pending = false;
    view.lastRender = Date.now();
    view.content.innerHTML = renderMarkdown(view.text);
    fitSpacer();
    updateJump();
  }

  // Render at most every ~50 ms while streaming: the first words appear at
  // once, and long answers don't re-parse on every token. A timer rather than
  // requestAnimationFrame, which pauses in background tabs.
  function scheduleRender(view) {
    if (view.pending) return;
    const wait = 50 - (Date.now() - view.lastRender);
    if (wait <= 0) return render(view);
    view.pending = true;
    setTimeout(() => render(view), wait);
  }

  // Position of an element's top inside the scrolling panel.
  const offsetIn = (el) => el.getBoundingClientRect().top - els.scroll.getBoundingClientRect().top + els.scroll.scrollTop;
  const GAP = 12;

  // Room below the newest turn, so its question can sit at the top of the
  // panel even while the answer is still short. Shrinks as the answer grows.
  function fitSpacer() {
    if (!state.turn) {
      els.spacer.style.height = "0px";
      return;
    }
    const below = offsetIn(els.thread) + els.thread.offsetHeight - offsetIn(state.turn);
    const room = els.scroll.clientHeight - below - GAP * 2;
    els.spacer.style.height = `${Math.max(0, Math.round(room))}px`;
  }

  // Show "More below" when answer text runs past the bottom of the panel.
  function updateJump() {
    const contentBottom = offsetIn(els.thread) + els.thread.offsetHeight;
    const viewBottom = els.scroll.scrollTop + els.scroll.clientHeight;
    els.jump.hidden = !state.turn || contentBottom - viewBottom < 24;
  }

  function showTurn(li) {
    state.turn = li;
    fitSpacer();
    els.scroll.scrollTop = Math.max(0, offsetIn(li) - GAP);
    updateJump();
  }

  function addActions(view) {
    const bar = document.createElement("div");
    bar.className = "msg-actions";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "msg-action";
    copy.innerHTML = `${icon("copy")}<span>Copy</span>`;
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(view.text);
        copy.querySelector("span").textContent = "Copied";
      } catch {
        copy.querySelector("span").textContent = "Copy failed";
      }
      setTimeout(() => (copy.querySelector("span").textContent = "Copy"), 1500);
    });
    bar.append(copy);
    view.li.querySelector(".body").append(bar);
  }

  function showError(view, message) {
    const div = document.createElement("div");
    div.className = "error";
    div.textContent = message;
    view.li.querySelector(".body").append(div);
  }

  function setBusy(busy) {
    els.send.hidden = busy;
    els.stop.hidden = !busy;
  }

  function autosize() {
    els.input.style.height = "auto";
    els.input.style.height = `${Math.min(els.input.scrollHeight, 180)}px`;
  }

  // ---------- conversation ----------

  async function ask(content, { display, tool } = {}) {
    content = content.trim();
    if (!content || !state.persona) return;
    if (state.controller) {
      // A new request replaces one still streaming; drop its unanswered question.
      state.controller.abort();
      state.controller = null;
      if (state.history.at(-1)?.role === "user") state.history.pop();
    }
    onOpen?.();
    els.empty.hidden = true;
    els.input.value = "";
    autosize();

    state.history.push({ role: "user", content });
    const userLi = addUser(display ?? content, tool);
    const view = addAssistant();
    showTurn(userLi);

    const controller = new AbortController();
    state.controller = controller;
    setBusy(true);
    let failed = false;

    try {
      await streamChat({
        persona: state.persona.id,
        messages: state.history,
        signal: controller.signal,
        onEvent: (ev) => {
          if (ev.type === "status") view.statusText.textContent = ev.text;
          else if (ev.type === "text") {
            view.status.hidden = true;
            view.text += ev.text;
            scheduleRender(view);
          } else if (ev.type === "sources") renderSources(view, ev.sources);
          else if (ev.type === "error") showError(view, ev.message);
        },
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        failed = true;
        showError(view, err.message || "Couldn't reach the assistant. Check your connection and try again.");
      }
    } finally {
      view.status.remove();
      if (view.pending || view.text) render(view); // flush the last tokens
      view.li.classList.remove("streaming");
      if (view.text.trim()) addActions(view);
      fitSpacer();
      updateJump();
      if (state.controller === controller) {
        if (view.text.trim()) state.history.push({ role: "assistant", content: view.text });
        else {
          state.history.pop(); // drop the unanswered question so a retry starts clean
          if (!failed && controller.signal.aborted) view.content.textContent = "Stopped.";
        }
        state.controller = null;
        setBusy(false);
      }
    }
  }

  function reset() {
    state.controller?.abort();
    state.controller = null;
    state.history = [];
    state.turn = null;
    els.thread.replaceChildren();
    els.spacer.style.height = "0px";
    els.empty.hidden = false;
    els.jump.hidden = true;
    els.scroll.scrollTop = 0;
    setBusy(false);
  }

  function setPersona(persona) {
    if (state.persona?.id === persona.id) return;
    reset();
    state.persona = persona;
    els.name.textContent = persona.assistantName;
    els.tagline.textContent = persona.tagline;
    els.input.placeholder = `Message the ${persona.assistantName}…`;
    els.suggestions.replaceChildren(
      ...persona.suggestions.map((text) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "as-suggestion";
        b.textContent = text;
        b.addEventListener("click", () => ask(text));
        return b;
      }),
    );
  }

  // ---------- events ----------

  els.input.addEventListener("input", autosize);
  els.input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      ask(els.input.value);
    }
  });
  els.form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    ask(els.input.value);
  });
  els.stop.addEventListener("click", () => state.controller?.abort());
  $("as-new").addEventListener("click", reset);

  els.scroll.addEventListener("scroll", updateJump, { passive: true });
  // "More below" scrolls one panel-height further down the answer.
  els.jump.addEventListener("click", () => {
    els.scroll.scrollTop += Math.round(els.scroll.clientHeight * 0.8);
    updateJump();
  });
  window.addEventListener("resize", () => {
    fitSpacer();
    updateJump();
  });

  // Esc stops an answer that is still streaming.
  root.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && state.controller) {
      ev.stopPropagation();
      state.controller.abort();
    }
  });

  // Wider panel on desktop, remembered per browser.
  const WIDE_KEY = "apu-genai-wide-assistant";
  const setWide = (wide) => {
    document.body.classList.toggle("assistant-wide", wide);
    els.expand.setAttribute("aria-pressed", String(wide));
    els.expand.title = wide ? "Narrower panel" : "Wider panel";
    try { localStorage.setItem(WIDE_KEY, wide ? "1" : "0"); } catch { /* storage unavailable */ }
  };
  try { setWide(localStorage.getItem(WIDE_KEY) === "1"); } catch { /* storage unavailable */ }
  els.expand.addEventListener("click", () => setWide(!document.body.classList.contains("assistant-wide")));

  return {
    ask,
    reset,
    setPersona,
    hasConversation: () => state.history.length > 0,
    focus: () => els.input.focus(),
    closeButton: $("as-close"),
  };
}
