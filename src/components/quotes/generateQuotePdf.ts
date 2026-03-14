import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Quote, QuoteLineItem } from "@/hooks/useQuotes";
import type { CompanySettings } from "@/hooks/useCompanySettings";

interface PdfOptions {
  quote: Quote;
  lineItems: QuoteLineItem[];
  company?: CompanySettings | null;
}

const makeFmt = (currency: string, symbol: string) => (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

export function generateQuotePdf({ quote, lineItems, company }: PdfOptions) {
  const companyName = company?.company_name || "PHANTOM";
  const companyTagline = "Event Production & Technical Services";
  const companyLocation = [
    company?.company_city,
    company?.company_country,
  ].filter(Boolean).join(", ") || "İstanbul, Turkey";
  const companyContact = [
    company?.company_email || "info@phantom.com.tr",
    company?.company_phone || "+90 212 555 0000",
  ].join("  ·  ");
  const currency = company?.currency || "TRY";
  const currencySymbol = company?.currency_symbol || "₺";
  const taxRate = company?.default_tax_rate ?? quote.tax_percent;
  const fmt = makeFmt(currency, currencySymbol);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // — Brand header bar —
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, w, 38, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(companyTagline, margin, 25);
  doc.text(`${companyLocation}  ·  ${companyContact}`, margin, 31);

  // — Quote title block (right side) —
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("QUOTE", w - margin, 18, { align: "right" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(quote.quote_number, w - margin, 26, { align: "right" });

  const statusLabel = quote.status.toUpperCase();
  doc.setFontSize(8);
  const statusColor =
    quote.status === "Approved" ? [34, 197, 94] :
    quote.status === "Sent" ? [59, 130, 246] :
    quote.status === "Rejected" ? [239, 68, 68] :
    [148, 163, 184];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(statusLabel, w - margin, 33, { align: "right" });

  y = 50;

  // — Info columns —
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", margin, y);
  doc.text("EVENT DETAILS", w / 2 + 10, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(quote.customer_name, margin, y);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  // Event details right column
  const details = [
    ["Event:", quote.event_name],
    ["Date:", `${fmtDate(quote.event_date)}${quote.event_end_date ? ` — ${fmtDate(quote.event_end_date)}` : ""}`],
    ["Venue:", quote.venue || "TBD"],
  ];
  let dy = y;
  for (const [label, val] of details) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(label, w / 2 + 10, dy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(val, w / 2 + 30, dy);
    dy += 5;
  }

  y = Math.max(y + 8, dy + 4);

  // — Divider —
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, w - margin, y);
  y += 6;

  // — Date issued —
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Issued: ${fmtDate(quote.created_at.split("T")[0])}`, margin, y);
  y += 8;

  // — Line items table —
  const tableBody = lineItems.map((item, i) => [
    (i + 1).toString(),
    item.description,
    item.item_type,
    item.quantity.toString(),
    item.days.toString(),
    fmt(item.unit_price),
    fmt(item.line_total),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Description", "Type", "Qty", "Days", "Unit Price", "Total"]],
    body: tableBody,
    theme: "plain",
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 22 },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 12, halign: "center" },
      5: { cellWidth: 25, halign: "right" },
      6: { cellWidth: 28, halign: "right" },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // @ts-ignore - autotable adds lastAutoTable
  y = (doc as any).lastAutoTable.finalY + 10;

  // — Pricing summary (right-aligned) —
  const summaryX = w - margin - 70;
  const valX = w - margin;

  const subtotal = quote.subtotal;
  const discountAmount = subtotal * (quote.discount_percent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (quote.tax_percent / 100);
  const total = afterDiscount + taxAmount;

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal", summaryX, y);
  doc.setTextColor(30, 41, 59);
  doc.text(fmt(subtotal), valX, y, { align: "right" });
  y += 6;

  if (quote.discount_percent > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text(`Discount (${quote.discount_percent}%)`, summaryX, y);
    doc.setTextColor(220, 38, 38);
    doc.text(`-${fmt(discountAmount)}`, valX, y, { align: "right" });
    y += 6;
  }

  doc.setTextColor(100, 116, 139);
  doc.text(`KDV (${quote.tax_percent}%)`, summaryX, y);
  doc.setTextColor(30, 41, 59);
  doc.text(fmt(taxAmount), valX, y, { align: "right" });
  y += 2;

  doc.setDrawColor(226, 232, 240);
  doc.line(summaryX, y, valX, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTAL", summaryX, y);
  doc.setTextColor(37, 99, 235);
  doc.text(fmt(total), valX, y, { align: "right" });

  y += 14;

  // — Notes —
  if (quote.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("NOTES", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(quote.notes, w - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 6;
  }

  // — Footer —
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageH - 18, w - margin, pageH - 18);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("PHANTOM Event Production  ·  İstanbul, Turkey  ·  All prices in TRY, excluding additional logistics unless stated.", margin, pageH - 12);
  doc.text(`Generated ${new Date().toLocaleDateString("tr-TR")}`, w - margin, pageH - 12, { align: "right" });

  // Save
  doc.save(`${quote.quote_number}_${quote.customer_name.replace(/\s+/g, "_")}.pdf`);
}
