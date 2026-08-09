// ============================================================
// APP STATE — single source of truth, simple pub/sub
// ============================================================

export const DEFAULT_CATEGORIES = [
  { id: "food", name: "Food", icon: "fa-utensils", color: "#FF6B6B", type: "expense" },
  { id: "transport", name: "Transport", icon: "fa-car", color: "#4DABF7", type: "expense" },
  { id: "shopping", name: "Shopping", icon: "fa-bag-shopping", color: "#FF922B", type: "expense" },
  { id: "bills", name: "Bills", icon: "fa-file-invoice-dollar", color: "#845EF7", type: "expense" },
  { id: "entertainment", name: "Entertainment", icon: "fa-film", color: "#E64980", type: "expense" },
  { id: "education", name: "Education", icon: "fa-graduation-cap", color: "#22B8CF", type: "expense" },
  { id: "health", name: "Health", icon: "fa-heart-pulse", color: "#F06595", type: "expense" },
  { id: "rent", name: "Rent", icon: "fa-house", color: "#FAB005", type: "expense" },
  { id: "travel", name: "Travel", icon: "fa-plane", color: "#15AABF", type: "expense" },
  { id: "investment", name: "Investment", icon: "fa-chart-line", color: "#2DD4BF", type: "both" },
  { id: "salary", name: "Salary", icon: "fa-sack-dollar", color: "#40C057", type: "income" },
  { id: "freelancing", name: "Freelancing", icon: "fa-laptop-code", color: "#7C5CFF", type: "income" },
  { id: "other", name: "Other", icon: "fa-ellipsis", color: "#868E96", type: "both" }
];

export const state = {
  user: null,               // firebase auth user
  profile: null,             // { name, photoURL, ... }
  transactions: [],          // all tx docs {id, type, amount, category, title, notes, date, scope, receiptURL, createdAt}
  categories: [...DEFAULT_CATEGORIES],
  budget: { amount: 0 },
  categoryBudgets: [],       // [{category, amount}]
  settings: {
    theme: "dark",
    currency: "INR",
    language: "en",
    notifications: { budget: true, daily: false, monthly: true, success: true }
  },
  filters: { type: "all", category: "all", scope: "all", dateFrom: "", dateTo: "", amountMin: "", amountMax: "", search: "" },
  currentView: "dashboard",
  calendarCursor: new Date(),
  selectedCalendarDate: null,
  unsubscribers: []
};

const listeners = {};
export function on(event, cb) {
  (listeners[event] = listeners[event] || []).push(cb);
}
export function emit(event, payload) {
  (listeners[event] || []).forEach(cb => cb(payload));
}

export function getCategoryById(id) {
  return state.categories.find(c => c.id === id) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
}

export function resetState() {
  state.user = null;
  state.profile = null;
  state.transactions = [];
  state.categories = [...DEFAULT_CATEGORIES];
  state.budget = { amount: 0 };
  state.categoryBudgets = [];
  state.unsubscribers.forEach(fn => { try { fn(); } catch (e) {} });
  state.unsubscribers = [];
}
