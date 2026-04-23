import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceWithCustomer } from "./invoices";
import type { Company } from "./companies";

export function generateInvoicePdf(invoice: InvoiceWithCustomer, company: Company) {
  const doc = new jsPDF();
  const primary = company.primary_color || "#4F46E5";

  // Header
  doc.setFillColor(primary);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(company.name, 14, 19);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Powered by Apex Cloud", 14, 25);

  // Invoice meta
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice ${invoice.invoice_number}`, 14, 45);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Issue date: ${invoice.issue_date}`, 14, 53);
  if (invoice.due_date) doc.text(`Due date: ${invoice.due_date}`, 14, 59);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 14, 65);

  // Bill to
  doc.setFont("helvetica", "bold");
  doc.text("Bill to:", 130, 45);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.customer?.name ?? "—", 130, 53);
  if (invoice.customer?.email) doc.text(invoice.customer.email, 130, 59);
  if (invoice.customer?.address) doc.text(invoice.customer.address.slice(0, 40), 130, 65);

  // Line table (from total only — we keep simple line for v1)
  autoTable(doc, {
    startY: 80,
    head: [["Description", "Amount"]],
    body: [["Rental services", `${invoice.currency} ${invoice.total.toFixed(2)}`]],
    headStyles: { fillColor: primary },
    theme: "striped",
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Total: ${invoice.currency} ${invoice.total.toFixed(2)}`, 150, finalY);

  if (invoice.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Notes: ${invoice.notes}`, 14, finalY + 15);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`${company.name}${company.tax_id ? ` • Tax ID: ${company.tax_id}` : ""}`, 14, 285);

  doc.save(`${invoice.invoice_number}.pdf`);
}
