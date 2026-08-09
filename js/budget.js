// ============================================================
// BUDGET
// ============================================================
import { $, showToast, setBtnLoading, escapeHTML } from "./utils.js";
import { state, getCategoryById } from "./state.js";
import { setBudget, setCategoryBudgets } from "./db.js";
import { formatCurrency } from "./utils.js";

let warnedThisSession = false;

export function initBudget() {
  $("#budget-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const amount = parseFloat($("#budget-input").value);
    if (!amount || amount < 0) return showToast("Enter a valid budget amount.", "error");
    setBtnLoading(btn, true);
    try {
      await setBudget(amount);
      showToast("Monthly budget updated.", "success");
    } catch (err) {
      showToast("Couldn't save budget.", "error");
    } finally {
      setBtnLoading(btn, false);
    }
  });

  $("#add-cat-budget-btn").addEventListener("click", async () => {
    const catId = prompt("Category id (e.g. food, transport, shopping):");
    if (!catId) return;
    const cat = getCategoryById(catId);
    const amount = parseFloat(prompt(`Monthly limit for ${cat.name}:`) || "");
    if (!amount || amount <= 0) return;
    const list = [...state.categoryBudgets.filter(c => c.category !== catId), { category: catId, amount }];
    await setCategoryBudgets(list);
    showToast("Category budget saved.", "success");
  });
}

function monthExpenseTotal() {
  const ym = new Date().toISOString().slice(0, 7);
  return state.transactions.filter(t => t.type === "expense" && (t.date || "").startsWith(ym))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
}

function monthExpenseByCategory(catId) {
  const ym = new Date().toISOString().slice(0, 7);
  return state.transactions.filter(t => t.type === "expense" && t.category === catId && (t.date || "").startsWith(ym))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
}

export function renderBudget() {
  const spent = monthExpenseTotal();
  const total = state.budget.amount || 0;
  const remaining = Math.max(total - spent, 0);
  const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;

  $("#budget-total-display").textContent = formatCurrency(total);
  $("#budget-spent-text").textContent = formatCurrency(spent);
  $("#budget-remain-text").textContent = formatCurrency(remaining);
  $("#budget-input").value = total || "";

  const fill = $("#budget-main-fill");
  fill.style.width = pct + "%";
  fill.className = "progress-fill" + (pct >= 100 ? " danger" : pct >= 80 ? " warn" : "");

  if (total > 0 && pct >= 80 && !warnedThisSession && state.settings.notifications.budget) {
    warnedThisSession = true;
    showToast(`Heads up — you've used ${Math.round(pct)}% of your monthly budget.`, "warn", 6000);
  }

  // Category budgets
  const list = state.categoryBudgets || [];
  $("#cat-budget-list").innerHTML = list.length ? list.map(cb => {
    const cat = getCategoryById(cb.category);
    const spentCat = monthExpenseByCategory(cb.category);
    const pctCat = Math.min(100, (spentCat / cb.amount) * 100);
    return `<div class="cat-budget-item">
      <span class="cat-name">${escapeHTML(cat.name)}</span>
      <div class="progress-track"><div class="progress-fill${pctCat >= 100 ? " danger" : pctCat >= 80 ? " warn" : ""}" style="width:${pctCat}%"></div></div>
      <span class="cat-amt">${formatCurrency(spentCat)} / ${formatCurrency(cb.amount)}</span>
    </div>`;
  }).join("") : `<p class="muted small">No category limits set yet.</p>`;
}
