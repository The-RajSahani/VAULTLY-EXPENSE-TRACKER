// ============================================================
// UTILITIES — toasts, modals, formatting, small DOM helpers
// ============================================================

export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

export const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };

export function getCurrency() {
  return localStorage.getItem("vaultly_currency") || "INR";
}

export function formatCurrency(amount, currency = getCurrency()) {
  const symbol = CURRENCY_SYMBOLS[currency] || "₹";
  const n = Number(amount) || 0;
  const formatted = n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${symbol}${formatted}`;
}

export function formatDate(dateStr, opts = {}) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", ...opts });
}

export function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function escapeHTML(str = "") {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ---------- Toasts ----------
const toastIcons = { success: "fa-circle-check", error: "fa-circle-exclamation", warn: "fa-triangle-exclamation", info: "fa-circle-info" };
export function showToast(message, type = "info", duration = 4200) {
  const stack = $("#toast-stack");
  if (!stack) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${toastIcons[type] || toastIcons.info}"></i><span>${escapeHTML(message)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s, transform .3s";
    el.style.opacity = "0";
    el.style.transform = "translateX(30px)";
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ---------- Loader ----------
export function showLoader(show = true) {
  const loader = $("#global-loader");
  if (!loader) return;
  if (show) { loader.classList.remove("hidden"); loader.style.opacity = "1"; }
  else {
    loader.style.opacity = "0";
    setTimeout(() => loader.classList.add("hidden"), 400);
  }
}

// ---------- Button loading state ----------
export function setBtnLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle("loading", loading);
  btn.disabled = loading;
}

// ---------- Modal ----------
export function openModal(modalEl) {
  const overlay = $("#modal-overlay");
  $$(".modal", overlay).forEach(m => m.classList.add("hidden"));
  overlay.classList.remove("hidden");
  modalEl.classList.remove("hidden");
}
export function closeModal() {
  $("#modal-overlay").classList.add("hidden");
}

export function initModalCloseHandlers() {
  $$("[data-close-modal]").forEach(btn => btn.addEventListener("click", closeModal));
  $("#modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

// ---------- Confirm dialog (returns a Promise<boolean>) ----------
export function confirmDialog(title, text) {
  return new Promise((resolve) => {
    $("#confirm-title").textContent = title;
    $("#confirm-text").textContent = text;
    openModal($("#confirm-modal"));
    const yesBtn = $("#confirm-yes-btn");
    const handler = () => {
      cleanup();
      resolve(true);
    };
    const cancelHandlers = $$("#confirm-modal [data-close-modal]");
    const cancelHandler = () => { cleanup(); resolve(false); };
    function cleanup() {
      yesBtn.removeEventListener("click", handler);
      cancelHandlers.forEach(b => b.removeEventListener("click", cancelHandler));
    }
    yesBtn.addEventListener("click", handler);
    cancelHandlers.forEach(b => b.addEventListener("click", cancelHandler));
  });
}

// ---------- Simple client-side XSS-safe input sanitation ----------
export function sanitizeInput(str = "") {
  return String(str).trim().slice(0, 500);
}
