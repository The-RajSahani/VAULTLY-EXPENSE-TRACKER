// ============================================================
// SHARED RENDER HELPERS — used by dashboard, transactions, calendar
// ============================================================
import { state, getCategoryById } from "./state.js";
import { formatCurrency, formatDate, escapeHTML } from "./utils.js";

export function renderTxRow(tx) {
  const cat = getCategoryById(tx.category);
  const sign = tx.type === "income" ? "+" : "−";
  return `
    <div class="tx-row" data-tx-id="${tx.id}">
      <div class="tx-icon" style="background:${cat.color}22;color:${cat.color}">
        <i class="fa-solid ${cat.icon || "fa-tag"}"></i>
      </div>
      <div class="tx-info">
        <strong>${escapeHTML(tx.title || cat.name)}${tx.scope === "business" ? '<span class="tx-scope-badge">Business</span>' : ""}</strong>
        <span>${cat.name} · ${formatDate(tx.date)}</span>
      </div>
      <div class="tx-amount ${tx.type}">${sign}${formatCurrency(tx.amount)}</div>
      <div class="tx-actions">
        <button data-edit-tx="${tx.id}" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>
        <button data-delete-tx="${tx.id}" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
}

export function populateCategorySelect(selectEl, type = "expense", includeAll = false) {
  const cats = state.categories.filter(c => c.type === type || c.type === "both");
  selectEl.innerHTML = (includeAll ? `<option value="all">All Categories</option>` : "") +
    cats.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join("");
}

export function populateFilterCategorySelect(selectEl) {
  selectEl.innerHTML = `<option value="all">All Categories</option>` +
    state.categories.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join("");
}
