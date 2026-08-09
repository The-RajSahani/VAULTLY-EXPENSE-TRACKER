// ============================================================
// ROUTER — switches between app views
// ============================================================
import { $, $$ } from "./utils.js";
import { state, emit } from "./state.js";

export function goToView(viewName) {
  state.currentView = viewName;
  $$(".view").forEach(v => v.classList.remove("active"));
  const target = $(`#view-${viewName}`);
  if (target) target.classList.add("active");

  $$(".nav-item[data-view]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  $("#view-area").scrollTo({ top: 0, behavior: "smooth" });
  emit("view:change", viewName);
}

export function initRouter() {
  $$(".nav-item[data-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      goToView(btn.dataset.view);
      closeMobileSidebar();
    });
  });
  $$("[data-view-link]").forEach(btn => {
    btn.addEventListener("click", () => goToView(btn.dataset.viewLink));
  });

  $("#mobile-menu-btn")?.addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("mobile-open");
  });
}

function closeMobileSidebar() {
  document.querySelector(".sidebar")?.classList.remove("mobile-open");
}
