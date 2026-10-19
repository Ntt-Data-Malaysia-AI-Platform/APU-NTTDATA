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
      <button type="button" class="icon-btn" id="as-new" title="New conversation" aria-label="New conversation">${icon("refresh")}</button>
      <button type="button" class="icon-btn as-close" id="as-close" title="Close" aria-label="Close assistant">${icon("close")}</button>
    </div>
    <div class="as-scroll" id="as-scroll">
      <div class="as-empty" id="as-empty">
        <span class="as-empty-icon">${icon("chat")}</span>
        <h3>Ask me anything</h3>
        <p id="as-tagline"></p>
        <div class="as-suggestions" id="as-suggestions"></div>
      </div>
      <ol class="thread" id="as-thread" aria-live="polite"></ol>
    </div>
    <form class="composer" id="as-form">
      <label class="sr-only" for="as-input">Message</label>
      <textarea id="as-input" rows="1" maxlength="8000" placeholder="Ask anything…" autocomplete="off"></textarea>
      <button type="submit" class="send" id="as-send" aria-label="Send">${icon("send")}</button>
      <button type="button" class="stop" id="as-stop" aria-label="Stop" hidden>${icon("stop")}</button>
    </form>
    <p class="disclaimer">Sample data. AI can make mistakes; check important details with the relevant office.</p>`;

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
  };

  const state = { persona: null, history: [], controller: null };

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
  }

  function addAssistant() {
    const li = document.createElement("li");
    li.className = "msg assistant";
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

  function scheduleRender(view) {
    if (view.pending) return;
    view.pending = true;
    // A short timer rather than requestAnimationFrame, which pauses in background tabs.
    setTimeout(() => {
      view.pending = false;
      view.content.innerHTML = renderMarkdown(view.text);
      stickToBottom();
    }, 30);
  }

  function stickToBottom(force = false) {
    const s = els.scroll;
    if (force || s.scrollHeight - s.scrollTop - s.clientHeight < 140) s.scrollTop = s.scrollHeight;
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
    addUser(display ?? content, tool);
    const view = addAssistant();
    stickToBottom(true);

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
    els.thread.replaceChildren();
    els.empty.hidden = false;
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

  return {
    ask,
    reset,
    setPersona,
    hasConversation: () => state.history.length > 0,
    focus: () => els.input.focus(),
    closeButton: $("as-close"),
  };
}
