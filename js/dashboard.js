// ============================================================
// DASHBOARD
// ============================================================
import { $ } from "./utils.js";
import { state } from "./state.js";
import { formatCurrency } from "./utils.js";
import { renderTxRow } from "./render-helpers.js";

let miniChart = null;

export function initDashboard() {
  const d = new Date();
  $("#dash-date").textContent = d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function renderDashboard() {
  const name = state.profile?.name || state.user?.displayName || "there";
  $("#dash-greeting").textContent = `Welcome back, ${name.split(" ")[0]}`;

  const txs = state.transactions;
  const income = sumBy(txs, "income");
  const expense = sumBy(txs, "expense");
  const balance = income - expense;
  const savings = Math.max(balance, 0);
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  $("#stat-balance").textContent = formatCurrency(balance);
  $("#stat-income").textContent = formatCurrency(income);
  $("#stat-expense").textContent = formatCurrency(expense);
  $("#stat-savings").textContent = formatCurrency(savings);
  $("#orb-sub").textContent = `savings rate ${savingsRate}%`;

  // Orb progress ring (circumference 2*pi*86 ≈ 540)
  const circumference = 540;
  const pct = Math.max(0, Math.min(100, savingsRate));
  const offset = circumference - (pct / 100) * circumference;
  $("#orb-progress").style.strokeDashoffset = offset;

  // Budget mini bar (this month)
  const monthExpense = sumThisMonth(txs, "expense");
  const budgetAmt = state.budget.amount || 0;
  const fill = $("#dash-budget-fill");
  if (budgetAmt > 0) {
    const pctUsed = Math.min(100, (monthExpense / budgetAmt) * 100);
    fill.style.width = pctUsed + "%";
    fill.className = "progress-fill" + (pctUsed >= 100 ? " danger" : pctUsed >= 80 ? " warn" : "");
    $("#dash-budget-text").textContent = `${formatCurrency(monthExpense)} of ${formatCurrency(budgetAmt)} used`;
  } else {
    fill.style.width = "0%";
    $("#dash-budget-text").textContent = "No budget set — set one in Budget tab";
  }

  // Recent transactions (5)
  const recent = [...txs].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6);
  $("#recent-list").innerHTML = recent.length
    ? recent.map(renderTxRow).join("")
    : `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No transactions yet. Tap "Quick Add" to get started.</p></div>`;

  renderMiniChart(txs);
}

function sumBy(txs, type) {
  return txs.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount || 0), 0);
}

function sumThisMonth(txs, type) {
  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  return txs.filter(t => t.type === type && (t.date || "").startsWith(ym)).reduce((s, t) => s + Number(t.amount || 0), 0);
}

function renderMiniChart(txs) {
  const ctx = document.getElementById("mini-chart");
  if (!ctx || typeof Chart === "undefined") return;

  // last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const dataExpense = days.map(day => txs.filter(t => t.type === "expense" && t.date === day).reduce((s, t) => s + Number(t.amount || 0), 0));
  const dataIncome = days.map(day => txs.filter(t => t.type === "income" && t.date === day).reduce((s, t) => s + Number(t.amount || 0), 0));
  const labels = days.map(d => new Date(d).toLocaleDateString(undefined, { weekday: "short" }));

  if (miniChart) miniChart.destroy();
  miniChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Income", data: dataIncome, borderColor: "#2DD4BF", backgroundColor: "#2DD4BF22", tension: .4, fill: true, pointRadius: 2 },
        { label: "Expense", data: dataExpense, borderColor: "#FF6B6B", backgroundColor: "#FF6B6B22", tension: .4, fill: true, pointRadius: 2 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: getComputedStyle(document.body).getPropertyValue("--text-mid") } } },
      scales: {
        x: { ticks: { color: "#7B8399" }, grid: { display: false } },
        y: { ticks: { color: "#7B8399" }, grid: { color: "rgba(255,255,255,.05)" } }
      }
    }
  });
}
