// ============================================================
// TRANSACTIONS — add/edit modal, list rendering, filters, search
// ============================================================
import { $, $$, showToast, setBtnLoading, openModal, closeModal, confirmDialog, todayISO, debounce, escapeHTML, sanitizeInput } from "./utils.js";
import { state, emit, getCategoryById } from "./state.js";
import { addTransaction, updateTransaction, deleteTransaction, uploadReceipt } from "./db.js";
import { renderTxRow, populateCategorySelect, populateFilterCategorySelect } from "./render-helpers.js";

let currentTxType = "expense";
let currentScope = "personal";
let pendingReceiptFile = null;

export function initTransactionsUI() {
  // Open "add" modal from various entry points
  ["add-tx-btn", "fab-add", "quick-add-btn"].forEach(id => {
    $(`#${id}`)?.addEventListener("click", () => openTxModal());
  });

  // Type toggle (expense/income)
  $$("#tx-type-toggle button").forEach(btn => {
    btn.addEventListener("click", () => {
      $$("#tx-type-toggle button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTxType = btn.dataset.txType;
      populateCategorySelect($("#tx-category"), currentTxType);
      $("#scope-row").classList.toggle("hidden", currentTxType !== "expense");
    });
  });

  // Scope toggle (personal/business)
  $$("#tx-scope-toggle button").forEach(btn => {
    btn.addEventListener("click", () => {
      $$("#tx-scope-toggle button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentScope = btn.dataset.scope;
    });
  });

  // Receipt preview
  $("#tx-receipt").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pendingReceiptFile = file;
    const img = $("#receipt-preview");
    img.src = URL.createObjectURL(file);
    img.classList.remove("hidden");
  });

  // Submit form
  $("#tx-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const id = $("#tx-id").value;
    const amount = parseFloat($("#tx-amount").value);
    if (!amount || amount <= 0) return showToast("Enter a valid amount.", "error");

    const payload = {
      type: currentTxType,
      amount,
      category: $("#tx-category").value,
      title: sanitizeInput($("#tx-title").value) || getCategoryById($("#tx-category").value).name,
      notes: sanitizeInput($("#tx-notes").value),
      date: $("#tx-date").value || todayISO(),
      scope: currentTxType === "expense" ? currentScope : "personal"
    };

    setBtnLoading(btn, true);
    try {
      let txId = id;
      if (pendingReceiptFile) {
        payload.receiptURL = await uploadReceipt(pendingReceiptFile, id || undefined);
      }
      if (id) {
        await updateTransaction(id, payload);
        showToast("Transaction updated.", "success");
      } else {
        await addTransaction(payload);
        if (state.settings.notifications.success) showToast("Transaction added successfully.", "success");
      }
      closeModal();
    } catch (err) {
      console.error(err);
      showToast("Couldn't save transaction. Please try again.", "error");
    } finally {
      setBtnLoading(btn, false);
    }
  });

  // Delegate edit/delete clicks (recent list + full list + calendar day list)
  document.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-tx]");
    const delBtn = e.target.closest("[data-delete-tx]");
    if (editBtn) {
      const tx = state.transactions.find(t => t.id === editBtn.dataset.editTx);
      if (tx) openTxModal(tx);
    }
    if (delBtn) {
      const ok = await confirmDialog("Delete transaction?", "This transaction will be permanently removed.");
      if (ok) {
        try {
          await deleteTransaction(delBtn.dataset.deleteTx);
          showToast("Transaction deleted.", "success");
        } catch (err) {
          showToast("Couldn't delete transaction.", "error");
        }
      }
    }
  });

  // ---------- Filters ----------
  $$(".chip[data-type-filter]").forEach(chip => {
    chip.addEventListener("click", () => {
      $$(".chip[data-type-filter]").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.filters.type = chip.dataset.typeFilter;
      renderFullList();
    });
  });
  $("#filter-category").addEventListener("change", (e) => { state.filters.category = e.target.value; renderFullList(); });
  $("#filter-scope").addEventListener("change", (e) => { state.filters.scope = e.target.value; renderFullList(); });
  $("#filter-date-from").addEventListener("change", (e) => { state.filters.dateFrom = e.target.value; renderFullList(); });
  $("#filter-date-to").addEventListener("change", (e) => { state.filters.dateTo = e.target.value; renderFullList(); });
  $("#filter-amount-min").addEventListener("input", debounce((e) => { state.filters.amountMin = e.target.value; renderFullList(); }, 300));
  $("#filter-amount-max").addEventListener("input", debounce((e) => { state.filters.amountMax = e.target.value; renderFullList(); }, 300));
  $("#clear-filters-btn").addEventListener("click", () => {
    state.filters = { type: "all", category: "all", scope: "all", dateFrom: "", dateTo: "", amountMin: "", amountMax: "", search: "" };
    $("#filter-category").value = "all";
    $("#filter-scope").value = "all";
    $("#filter-date-from").value = "";
    $("#filter-date-to").value = "";
    $("#filter-amount-min").value = "";
    $("#filter-amount-max").value = "";
    $$(".chip[data-type-filter]").forEach(c => c.classList.toggle("active", c.dataset.typeFilter === "all"));
    renderFullList();
  });

  // Global search
  $("#global-search-input").addEventListener("input", debounce((e) => {
    doGlobalSearch(e.target.value.trim().toLowerCase());
  }, 200));
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".global-search")) $("#global-search-results").classList.add("hidden");
  });

  emit("transactions:refresh-categories");
  on_data_change();
}

function on_data_change() {
  populateFilterCategorySelect($("#filter-category"));
}

export function openTxModal(tx = null) {
  const form = $("#tx-form");
  form.reset();
  $("#receipt-preview").classList.add("hidden");
  pendingReceiptFile = null;
  $("#tx-id").value = tx?.id || "";
  $("#tx-modal-title").textContent = tx ? "Edit Transaction" : "Add Transaction";
  currentTxType = tx?.type || "expense";
  currentScope = tx?.scope || "personal";

  $$("#tx-type-toggle button").forEach(b => b.classList.toggle("active", b.dataset.txType === currentTxType));
  $$("#tx-scope-toggle button").forEach(b => b.classList.toggle("active", b.dataset.scope === currentScope));
  $("#scope-row").classList.toggle("hidden", currentTxType !== "expense");

  populateCategorySelect($("#tx-category"), currentTxType);
  $("#tx-amount").value = tx?.amount || "";
  $("#tx-date").value = tx?.date || todayISO();
  $("#tx-title").value = tx?.title || "";
  $("#tx-notes").value = tx?.notes || "";
  if (tx?.category) $("#tx-category").value = tx.category;
  if (tx?.receiptURL) {
    $("#receipt-preview").src = tx.receiptURL;
    $("#receipt-preview").classList.remove("hidden");
  }

  openModal($("#tx-modal"));
}

// ---------- Filtering logic (shared) ----------
export function getFilteredTransactions() {
  const f = state.filters;
  return state.transactions.filter(tx => {
    if (f.type !== "all" && tx.type !== f.type) return false;
    if (f.category !== "all" && tx.category !== f.category) return false;
    if (f.scope !== "all" && tx.type === "expense" && tx.scope !== f.scope) return false;
    if (f.dateFrom && tx.date < f.dateFrom) return false;
    if (f.dateTo && tx.date > f.dateTo) return false;
    if (f.amountMin && Number(tx.amount) < Number(f.amountMin)) return false;
    if (f.amountMax && Number(tx.amount) > Number(f.amountMax)) return false;
    return true;
  });
}

export function renderFullList() {
  const list = getFilteredTransactions();
  const container = $("#tx-full-list");
  const empty = $("#tx-empty");
  if (!list.length) {
    container.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  container.innerHTML = list.map(renderTxRow).join("");
}

function doGlobalSearch(term) {
  const resultsEl = $("#global-search-results");
  if (!term) { resultsEl.classList.add("hidden"); return; }
  const matches = state.transactions.filter(tx => {
    const cat = getCategoryById(tx.category);
    return (tx.title || "").toLowerCase().includes(term) ||
      (tx.notes || "").toLowerCase().includes(term) ||
      cat.name.toLowerCase().includes(term);
  }).slice(0, 8);

  if (!matches.length) {
    resultsEl.innerHTML = `<div class="notif-item">No matches for "${escapeHTML(term)}"</div>`;
  } else {
    resultsEl.innerHTML = matches.map(renderTxRow).join("");
  }
  resultsEl.classList.remove("hidden");
}

export function refreshCategoryDropdowns() {
  populateFilterCategorySelect($("#filter-category"));
  populateCategorySelect($("#tx-category"), currentTxType);
}
