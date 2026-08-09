// ============================================================
// SETTINGS
// ============================================================
import { $, $$, showToast, escapeHTML } from "./utils.js";
import { state, emit } from "./state.js";
import { updateUserDoc, addCategory, deleteCategory } from "./db.js";

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("vaultly_theme", theme);
  $("#theme-toggle i").className = theme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
  $$("#theme-segmented button").forEach(b => b.classList.toggle("active", b.dataset.theme === theme));
}

export function initSettings() {
  // Quick topbar toggle
  $("#theme-toggle").addEventListener("click", async () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { await updateUserDoc({ theme: next }); } catch (e) {}
  });

  // Segmented control in settings page
  $$("#theme-segmented button").forEach(btn => {
    btn.addEventListener("click", async () => {
      applyTheme(btn.dataset.theme);
      try { await updateUserDoc({ theme: btn.dataset.theme }); } catch (e) {}
    });
  });

  // Currency
  $("#currency-select").addEventListener("change", async (e) => {
    localStorage.setItem("vaultly_currency", e.target.value);
    try { await updateUserDoc({ currency: e.target.value }); } catch (err) {}
    showToast(`Currency set to ${e.target.value}.`, "success");
    emit("currency:change");
  });

  // Language (UI copy stays English; this stores preference for future localization)
  $("#language-select").addEventListener("change", async (e) => {
    try { await updateUserDoc({ language: e.target.value }); } catch (err) {}
    showToast("Language preference saved.", "success");
  });

  // Notifications
  const notifMap = { "notif-budget": "budget", "notif-daily": "daily", "notif-monthly": "monthly", "notif-success": "success" };
  Object.keys(notifMap).forEach(id => {
    $(`#${id}`).addEventListener("change", async (e) => {
      state.settings.notifications[notifMap[id]] = e.target.checked;
      try { await updateUserDoc({ notifications: state.settings.notifications }); } catch (err) {}
    });
  });

  // Add custom category
  $("#add-category-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#new-category-name").value.trim();
    const color = $("#new-category-color").value;
    if (!name) return;
    try {
      await addCategory(name, color);
      showToast(`Category "${name}" added.`, "success");
      $("#add-category-form").reset();
      $("#new-category-color").value = "#7C5CFF";
    } catch (err) {
      showToast("Couldn't add category.", "error");
    }
  });

  $("#manage-cats-btn").addEventListener("click", () => {
    document.querySelector(".view-head + .settings-grid, #custom-cat-list")?.scrollIntoView({ behavior: "smooth" });
  });
}

export function applySettingsToForm() {
  $("#currency-select").value = state.settings.currency;
  $("#language-select").value = state.settings.language;
  $("#notif-budget").checked = state.settings.notifications.budget;
  $("#notif-daily").checked = state.settings.notifications.daily;
  $("#notif-monthly").checked = state.settings.notifications.monthly;
  $("#notif-success").checked = state.settings.notifications.success;
  applyTheme(state.settings.theme);
}

export function renderCustomCategories() {
  const custom = state.categories.filter(c => c.custom);
  $("#custom-cat-list").innerHTML = custom.length
    ? custom.map(c => `<span class="custom-cat-tag" style="border:1px solid ${c.color}55"><span class="dot" style="background:${c.color}"></span>${escapeHTML(c.name)}<button data-remove-cat="${c.id}"><i class="fa-solid fa-xmark"></i></button></span>`).join("")
    : `<p class="muted small">No custom categories yet — add one below.</p>`;

  $$("[data-remove-cat]").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await deleteCategory(btn.dataset.removeCat);
        showToast("Category removed.", "success");
      } catch (err) { showToast("Couldn't remove category.", "error"); }
    });
  });
}
