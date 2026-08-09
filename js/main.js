// ============================================================
// MAIN — bootstraps the whole app
// ============================================================
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { $, $$, showLoader, showToast } from "./utils.js";
import { state, resetState, DEFAULT_CATEGORIES, on } from "./state.js";
import { ensureUserDoc } from "./db.js";
import { listenTransactions, listenCategories, listenBudget } from "./db.js";

import { initAuthUI, logout } from "./auth.js";
import { initRouter, goToView } from "./router.js";
import { initModalCloseHandlers } from "./utils.js";
import { initTransactionsUI, renderFullList, refreshCategoryDropdowns } from "./transactions.js";
import { initDashboard, renderDashboard } from "./dashboard.js";
import { initAnalytics, renderAnalytics } from "./analytics.js";
import { initBudget, renderBudget } from "./budget.js";
import { initCalendar, renderCalendar } from "./calendar.js";
import { initSettings, applySettingsToForm, renderCustomCategories, applyTheme } from "./settings.js";
import { initProfile, renderProfile } from "./profile.js";
import { initExport } from "./export.js";

// Apply saved theme immediately (before auth resolves) to avoid flash
applyTheme(localStorage.getItem("vaultly_theme") || "dark");

// ---------- One-time UI wiring (safe to run before auth) ----------
initAuthUI();
initRouter();
initModalCloseHandlers();
initTransactionsUI();
initDashboard();
initAnalytics();
initBudget();
initCalendar();
initSettings();
initProfile();
initExport();

$("#logout-btn").addEventListener("click", async () => {
  await logout();
});

$("#topbar-profile").addEventListener("click", () => goToView("profile"));

$("#notif-btn").addEventListener("click", () => {
  $("#notif-panel").classList.toggle("hidden");
  $("#notif-dot").classList.add("hidden");
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("#notif-btn") && !e.target.closest("#notif-panel")) {
    $("#notif-panel")?.classList.add("hidden");
  }
});

// Re-render everything whenever core data changes
function rerenderAll() {
  renderDashboard();
  if (state.currentView === "transactions") renderFullList();
  if (state.currentView === "analytics") renderAnalytics();
  if (state.currentView === "budget") renderBudget();
  if (state.currentView === "calendar") renderCalendar();
  refreshCategoryDropdowns();
  renderCustomCategories();
  buildNotifications();
}

on("view:change", (view) => {
  if (view === "transactions") renderFullList();
  if (view === "analytics") renderAnalytics();
  if (view === "budget") renderBudget();
  if (view === "calendar") renderCalendar();
  if (view === "profile") renderProfile();
});

function buildNotifications() {
  const items = [];
  const budgetAmt = state.budget.amount || 0;
  if (budgetAmt > 0) {
    const ym = new Date().toISOString().slice(0, 7);
    const spent = state.transactions.filter(t => t.type === "expense" && (t.date || "").startsWith(ym)).reduce((s, t) => s + Number(t.amount || 0), 0);
    const pct = (spent / budgetAmt) * 100;
    if (pct >= 100) items.push({ icon: "fa-triangle-exclamation", text: "You've exceeded your monthly budget." });
    else if (pct >= 80) items.push({ icon: "fa-triangle-exclamation", text: `Budget alert: ${Math.round(pct)}% of monthly budget used.` });
  }
  if (state.settings.notifications.monthly) {
    items.push({ icon: "fa-calendar-check", text: "Don't forget to review this month's spending." });
  }
  const panel = $("#notif-panel");
  panel.innerHTML = items.length
    ? items.map(n => `<div class="notif-item"><i class="fa-solid ${n.icon}" style="margin-right:.5rem;color:var(--amber)"></i>${n.text}</div>`).join("")
    : `<div class="notif-item">You're all caught up.</div>`;
  $("#notif-dot").classList.toggle("hidden", items.length === 0);
}

// ---------- Auth state ----------
let dataListenersActive = false;

onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    showLoader(true);
    state.user = user;
    try {
      const profile = await ensureUserDoc(user);
      state.profile = profile;
      state.settings.theme = profile.theme || "dark";
      state.settings.currency = profile.currency || "INR";
      state.settings.language = profile.language || "en";
      state.settings.notifications = profile.notifications || state.settings.notifications;
      localStorage.setItem("vaultly_currency", state.settings.currency);
      applySettingsToForm();

      if (!dataListenersActive) {
        dataListenersActive = true;
        listenTransactions((list) => { state.transactions = list; rerenderAll(); });
        listenCategories((customCats) => {
          state.categories = [...DEFAULT_CATEGORIES, ...customCats];
          refreshCategoryDropdowns();
          renderCustomCategories();
        });
        listenBudget((b) => {
          state.budget = { amount: b.amount || 0 };
          state.categoryBudgets = b.categoryBudgets || [];
          if (state.currentView === "budget") renderBudget();
          rerenderAll();
        });
      }

      renderProfile();
      showApp();
      goToView("dashboard");
    } catch (err) {
      console.error(err);
      showToast("Something went wrong loading your data.", "error");
    } finally {
      showLoader(false);
    }
  } else if (user && !user.emailVerified) {
    showLoader(false);
    showAuthScreen();
  } else {
    dataListenersActive = false;
    resetState();
    showLoader(false);
    showAuthScreen();
  }
});

function showApp() {
  $("#auth-screen").classList.add("hidden");
  $("#app-shell").classList.remove("hidden");
}
function showAuthScreen() {
  $("#app-shell").classList.add("hidden");
  $("#auth-screen").classList.remove("hidden");
  $$(".auth-form").forEach(f => f.classList.add("hidden"));
  $("#login-form").classList.remove("hidden");
}

// Failsafe: hide loader after 8s no matter what
setTimeout(() => showLoader(false), 8000);
