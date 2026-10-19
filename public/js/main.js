import { getConfig, getSession, login, logout } from "./api.js";
import { createChat } from "./chat.js";
import { renderLanding } from "./landing.js";
import { renderWorkspace } from "./workspace.js";

const $ = (id) => document.getElementById(id);
const els = {
  body: document.body,
  login: $("login"),
  loginForm: $("login-form"),
  loginUser: $("login-user"),
  loginPass: $("login-pass"),
  loginReveal: $("login-reveal"),
  loginError: $("login-error"),
  loginNotice: $("login-notice"),
  loginSubmit: $("login-submit"),
  landing: $("landing"),
  workspace: $("workspace"),
  main: $("ws-main"),
  assistant: $("assistant"),
  picker: $("persona-picker"),
  select: $("persona-select"),
  userMenu: $("user-menu"),
  userName: $("user-name"),
  userInitial: $("user-initial"),
  logoutBtn: $("logout"),
  badge: $("mode-badge"),
  fab: $("fab"),
  scrim: $("scrim"),
  dialog: $("tool-dialog"),
  toast: $("toast"),
};

const STORAGE_KEY = "apu-genai-persona";
const remember = (id) => {
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* storage unavailable */ }
};
const recall = () => {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
};

// ---------- assistant drawer (narrow screens) ----------

const narrow = window.matchMedia("(max-width: 1099px)");
function openAssistant() {
  if (!narrow.matches) return;
  els.body.classList.add("assistant-open");
  els.scrim.hidden = false;
}
function closeAssistant() {
  els.body.classList.remove("assistant-open");
  els.scrim.hidden = true;
}

const chat = createChat(els.assistant, { onOpen: openAssistant });
chat.closeButton.addEventListener("click", closeAssistant);
els.scrim.addEventListener("click", closeAssistant);
els.fab.addEventListener("click", () => {
  openAssistant();
  chat.focus();
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && els.body.classList.contains("assistant-open")) closeAssistant();
});
narrow.addEventListener("change", () => !narrow.matches && closeAssistant());

// ---------- toast ----------

let toastTimer;
function toast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  els.toast.classList.remove("show");
  void els.toast.offsetWidth; // restart the animation
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (els.toast.hidden = true), 4500);
}

// ---------- sign-in ----------

let signedIn = false;

function showLogin(notice) {
  signedIn = false;
  routeToken++;
  current = null;
  chat.reset();
  if (els.dialog.open) els.dialog.close();
  closeAssistant();
  els.body.dataset.view = "login";
  els.body.dataset.persona = "platform";
  els.login.hidden = false;
  els.landing.hidden = true;
  els.workspace.hidden = true;
  els.picker.hidden = true;
  els.userMenu.hidden = true;
  els.fab.hidden = true;
  els.loginError.hidden = true;
  els.loginNotice.hidden = !notice;
  els.loginNotice.textContent = notice ?? "";
  els.loginPass.value = "";
  document.title = "Sign in · APU GenAI Platform";
  window.scrollTo(0, 0);
  (els.loginUser.value ? els.loginPass : els.loginUser).focus();
}

els.loginReveal.addEventListener("click", () => {
  const show = els.loginPass.type === "password";
  els.loginPass.type = show ? "text" : "password";
  els.loginReveal.setAttribute("aria-pressed", String(show));
  els.loginReveal.setAttribute("aria-label", show ? "Hide password" : "Show password");
  els.loginPass.focus();
});

els.loginForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const username = els.loginUser.value.trim();
  const password = els.loginPass.value;
  if (!username || !password) {
    els.loginError.textContent = "Enter your username and password.";
    els.loginError.hidden = false;
    return;
  }
  els.loginSubmit.disabled = true;
  els.loginError.hidden = true;
  try {
    const session = await login(username, password);
    els.loginPass.value = "";
    await startApp(session.user);
  } catch (err) {
    els.loginError.textContent = err.message;
    els.loginError.hidden = false;
    els.loginForm.classList.remove("shake");
    void els.loginForm.offsetWidth;
    els.loginForm.classList.add("shake");
    els.loginPass.select();
  } finally {
    els.loginSubmit.disabled = false;
  }
});

els.logoutBtn.addEventListener("click", async () => {
  await logout().catch(() => {});
  showLogin("You've been signed out.");
});

// Any API call that finds the session gone sends us back to sign-in.
window.addEventListener("auth-required", () => {
  if (signedIn) showLogin("Your session has expired. Please sign in again.");
});

// ---------- routing ----------

let cfg;
let current = null; // persona currently shown in the workspace
let routeToken = 0;
let restoring = false;

function showLanding() {
  els.body.dataset.view = "landing";
  els.body.dataset.persona = "platform";
  els.landing.hidden = false;
  els.workspace.hidden = true;
  els.picker.hidden = true;
  els.fab.hidden = true;
  closeAssistant();
  renderLanding(els.landing, cfg, { lastPersona: recall() });
  document.title = "APU GenAI Platform";
  window.scrollTo(0, 0);
}

async function showWorkspace(persona) {
  if (current && current.id !== persona.id && chat.hasConversation()) {
    if (!confirm("Switching persona starts a new conversation with the assistant. Continue?")) {
      restoring = true;
      location.hash = `#/${current.id}`;
      return;
    }
  }
  const token = ++routeToken;
  current = persona;
  remember(persona.id);
  els.body.dataset.view = "workspace";
  els.body.dataset.persona = persona.id;
  els.landing.hidden = true;
  els.workspace.hidden = false;
  els.picker.hidden = false;
  els.fab.hidden = false;
  els.select.value = persona.id;
  document.title = `${persona.label} · APU GenAI Platform`;
  chat.setPersona(persona);
  window.scrollTo(0, 0);
  await renderWorkspace(els.main, persona, {
    chat,
    toast,
    dialog: els.dialog,
    isStale: () => token !== routeToken,
  });
}

function route() {
  if (!signedIn) return;
  if (restoring) {
    restoring = false;
    return;
  }
  const id = location.hash.replace(/^#\/?/, "");
  const persona = cfg.personas.find((p) => p.id === id);
  if (persona) showWorkspace(persona);
  else {
    current = null;
    routeToken++;
    showLanding();
  }
}

els.select.addEventListener("change", () => {
  location.hash = `#/${els.select.value}`;
});
window.addEventListener("hashchange", route);

async function startApp(user) {
  if (!cfg) {
    cfg = await getConfig();
    els.badge.hidden = !cfg.demoMode;
    els.select.replaceChildren(
      ...cfg.personas.map((p) => {
        const o = document.createElement("option");
        o.value = p.id;
        o.textContent = p.label;
        return o;
      }),
    );
  }
  signedIn = true;
  els.login.hidden = true;
  els.userName.textContent = user;
  els.userInitial.textContent = user.charAt(0).toUpperCase();
  els.userMenu.hidden = false;
  route();
}

// ---------- boot ----------

try {
  const session = await getSession();
  if (session) await startApp(session.user);
  else showLogin();
} catch (err) {
  els.landing.hidden = false;
  els.landing.innerHTML = `<p class="error boot-error">The platform is unavailable right now. Please try again shortly.</p>`;
  console.error(err);
}
