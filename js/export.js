// ============================================================
// EXPORT — CSV, Excel, PDF (uses jsPDF + SheetJS loaded via CDN <script> tags)
// ============================================================
import { $, $$, openModal, closeModal, showToast } from "./utils.js";
import { getCategoryById } from "./state.js";
import { getFilteredTransactions } from "./transactions.js";
import { formatCurrency } from "./utils.js";

export function initExport() {
  $("#export-btn").addEventListener("click", () => openModal($("#export-modal")));
  $$(".export-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      const rows = getFilteredTransactions();
      if (!rows.length) { showToast("No transactions to export.", "warn"); return; }
      const kind = btn.dataset.export;
      if (kind === "csv") exportCSV(rows);
      if (kind === "excel") exportExcel(rows);
      if (kind === "pdf") exportPDF(rows);
      closeModal();
    });
  });
}

function buildRows(rows) {
  return rows.map(tx => ({
    Date: tx.date,
    Type: tx.type,
    Category: getCategoryById(tx.category).name,
    Title: tx.title || "",
    Amount: tx.amount,
    Scope: tx.scope || "",
    Notes: tx.notes || ""
  }));
}

function exportCSV(rows) {
  const data = buildRows(rows);
  const headers = Object.keys(data[0]);
  const csv = [headers.join(",")].concat(
    data.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(","))
  ).join("\n");
  downloadBlob(csv, "vaultly-transactions.csv", "text/csv");
  showToast("CSV exported.", "success");
}

function exportExcel(rows) {
  if (typeof XLSX === "undefined") return showToast("Excel export library not loaded.", "error");
  const data = buildRows(rows);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, "vaultly-transactions.xlsx");
  showToast("Excel file exported.", "success");
}

function exportPDF(rows) {
  if (typeof window.jspdf === "undefined") return showToast("PDF export library not loaded.", "error");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Vaultly — Transaction Report", 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 22);

  const data = buildRows(rows);
  doc.autoTable({
    startY: 28,
    head: [["Date", "Type", "Category", "Title", "Amount", "Scope"]],
    body: data.map(r => [r.Date, r.Type, r.Category, r.Title, formatCurrency(r.Amount), r.Scope]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [124, 92, 255] }
  });

  doc.save("vaultly-transactions.pdf");
  showToast("PDF exported.", "success");
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
