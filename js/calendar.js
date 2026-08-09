// ============================================================
// CALENDAR VIEW
// ============================================================
import { $ } from "./utils.js";
import { state } from "./state.js";
import { renderTxRow } from "./render-helpers.js";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function initCalendar() {
  $("#cal-prev").addEventListener("click", () => {
    state.calendarCursor.setMonth(state.calendarCursor.getMonth() - 1);
    renderCalendar();
  });
  $("#cal-next").addEventListener("click", () => {
    state.calendarCursor.setMonth(state.calendarCursor.getMonth() + 1);
    renderCalendar();
  });
}

export function renderCalendar() {
  const cursor = state.calendarCursor;
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  $("#cal-month-label").textContent = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  let html = DOW.map(d => `<div class="cal-dow">${d}</div>`).join("");
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayTx = state.transactions.filter(t => t.date === dateStr);
    const hasIncome = dayTx.some(t => t.type === "income");
    const hasExpense = dayTx.some(t => t.type === "expense");
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === state.selectedCalendarDate;
    html += `<div class="cal-cell${isToday ? " today" : ""}${isSelected ? " selected" : ""}" data-date="${dateStr}">
      <span class="cal-date-num">${day}</span>
      <div class="cal-dots">
        ${hasIncome ? '<span style="background:#2DD4BF"></span>' : ""}
        ${hasExpense ? '<span style="background:#FF6B6B"></span>' : ""}
      </div>
    </div>`;
  }

  const grid = $("#calendar-grid");
  grid.innerHTML = html;
  grid.querySelectorAll(".cal-cell[data-date]").forEach(cell => {
    cell.addEventListener("click", () => {
      state.selectedCalendarDate = cell.dataset.date;
      renderCalendar();
      renderCalendarDay();
    });
  });

  if (state.selectedCalendarDate) renderCalendarDay();
}

function renderCalendarDay() {
  const dateStr = state.selectedCalendarDate;
  if (!dateStr) return;
  const dayTx = state.transactions.filter(t => t.date === dateStr);
  $("#cal-day-title").textContent = new Date(dateStr).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("#cal-day-list").innerHTML = dayTx.length
    ? dayTx.map(renderTxRow).join("")
    : `<p class="muted small">No transactions on this day.</p>`;
}
