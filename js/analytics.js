// ============================================================
// ANALYTICS — Chart.js visualizations + reports
// ============================================================
import { $ } from "./utils.js";
import { state, getCategoryById } from "./state.js";
import { formatCurrency } from "./utils.js";

let pieChart, barChart, lineChart;

export function initAnalytics() {
  $("#analytics-range").addEventListener("change", renderAnalytics);
}

function getRangeTx() {
  const range = $("#analytics-range").value;
  const now = new Date();
  let from;
  if (range === "week") { from = new Date(now); from.setDate(now.getDate() - 7); }
  else if (range === "year") { from = new Date(now.getFullYear(), 0, 1); }
  else { from = new Date(now.getFullYear(), now.getMonth(), 1); }
  const fromStr = from.toISOString().slice(0, 10);
  return state.transactions.filter(t => t.date >= fromStr);
}

export function renderAnalytics() {
  const txs = getRangeTx();
  const expenses = txs.filter(t => t.type === "expense");

  renderPie(expenses);
  renderBar();
  renderLine();
  renderSummary(expenses, txs);
  renderCategoryBreakdown(expenses);
}

function catTotals(expenses) {
  const map = {};
  expenses.forEach(t => { map[t.category] = (map[t.category] || 0) + Number(t.amount || 0); });
  return map;
}

function renderPie(expenses) {
  const ctx = document.getElementById("chart-pie");
  if (!ctx || typeof Chart === "undefined") return;
  const totals = catTotals(expenses);
  const labels = Object.keys(totals).map(id => getCategoryById(id).name);
  const colors = Object.keys(totals).map(id => getCategoryById(id).color);
  const data = Object.values(totals);

  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
    options: {
      responsive: true, cutout: "68%",
      plugins: { legend: { position: "bottom", labels: { color: "#B7BFD3", boxWidth: 10, padding: 14 } } }
    }
  });
}

function renderBar() {
  const ctx = document.getElementById("chart-bar");
  if (!ctx || typeof Chart === "undefined") return;
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  const incomeData = months.map(m => state.transactions.filter(t => t.type === "income" && (t.date || "").startsWith(m)).reduce((s, t) => s + Number(t.amount || 0), 0));
  const expenseData = months.map(m => state.transactions.filter(t => t.type === "expense" && (t.date || "").startsWith(m)).reduce((s, t) => s + Number(t.amount || 0), 0));
  const labels = months.map(m => new Date(m + "-02").toLocaleDateString(undefined, { month: "short" }));

  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [
      { label: "Income", data: incomeData, backgroundColor: "#2DD4BF", borderRadius: 6 },
      { label: "Expense", data: expenseData, backgroundColor: "#FF6B6B", borderRadius: 6 }
    ]},
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#B7BFD3" } } },
      scales: {
        x: { ticks: { color: "#7B8399" }, grid: { display: false } },
        y: { ticks: { color: "#7B8399" }, grid: { color: "rgba(255,255,255,.05)" } }
      }
    }
  });
}

function renderLine() {
  const ctx = document.getElementById("chart-line");
  if (!ctx || typeof Chart === "undefined") return;
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const incomeData = days.map(d => state.transactions.filter(t => t.type === "income" && t.date === d).reduce((s, t) => s + Number(t.amount || 0), 0));
  const expenseData = days.map(d => state.transactions.filter(t => t.type === "expense" && t.date === d).reduce((s, t) => s + Number(t.amount || 0), 0));
  const labels = days.map(d => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }));

  if (lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [
      { label: "Income", data: incomeData, borderColor: "#2DD4BF", backgroundColor: "#2DD4BF15", tension: .35, fill: true, pointRadius: 0 },
      { label: "Expense", data: expenseData, borderColor: "#FF6B6B", backgroundColor: "#FF6B6B15", tension: .35, fill: true, pointRadius: 0 }
    ]},
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#B7BFD3" } } },
      scales: {
        x: { ticks: { color: "#7B8399", maxTicksLimit: 8 }, grid: { display: false } },
        y: { ticks: { color: "#7B8399" }, grid: { color: "rgba(255,255,255,.05)" } }
      }
    }
  });
}

function renderSummary(expenses, allTx) {
  const totals = catTotals(expenses);
  const topId = Object.keys(totals).sort((a, b) => totals[b] - totals[a])[0];
  $("#an-top-cat").textContent = topId ? getCategoryById(topId).name : "—";

  const totalExpense = expenses.reduce((s, t) => s + Number(t.amount || 0), 0);
  const days = new Set(expenses.map(t => t.date)).size || 1;
  $("#an-avg-daily").textContent = formatCurrency(totalExpense / days);
  $("#an-tx-count").textContent = allTx.length;
}

function renderCategoryBreakdown(expenses) {
  const totals = catTotals(expenses);
  const total = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([id, amt]) => {
    const cat = getCategoryById(id);
    const pct = Math.round((amt / total) * 100);
    return `<div class="cat-row">
      <span class="dot" style="background:${cat.color}"></span>
      <span class="cat-name">${cat.name}</span>
      <div class="cat-track"><div class="cat-fill" style="width:${pct}%;background:${cat.color}"></div></div>
      <span class="cat-amt">${formatCurrency(amt)} · ${pct}%</span>
    </div>`;
  }).join("");
  $("#category-breakdown").innerHTML = rows || `<p class="muted small">No expense data for this period yet.</p>`;
}
