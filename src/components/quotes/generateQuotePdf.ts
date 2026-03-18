import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Quote, QuoteLineItem, LineItemType } from "@/hooks/useQuotes";
import type { CompanySettings } from "@/hooks/useCompanySettings";

interface EquipmentInfo {
  id: string;
  name: string;
  weight_kg: number | null;
  case_weight_kg: number | null;
  case_volume_m3: number | null;
  items_per_case: number | null;
}

interface PdfOptions {
  quote: Quote;
  lineItems: QuoteLineItem[];
  company?: CompanySettings | null;
  equipment?: EquipmentInfo[];
}

const typeLabels: Record<LineItemType, string> = {
  Equipment: "Ekipman",
  Personnel: "Personel",
  Vehicle: "Araç",
  Custom: "Özel",
};

const departmentOrder: LineItemType[] = ["Equipment", "Personnel", "Vehicle", "Custom"];

const makeFmt = (currency: string, symbol: string) => (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

export function generateQuotePdf({ quote, lineItems, company, equipment = [] }: PdfOptions) {
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

  // — Group line items by department —
  const grouped: Record<LineItemType, QuoteLineItem[]> = {
    Equipment: [], Personnel: [], Vehicle: [], Custom: [],
  };
  lineItems.forEach((item) => {
    grouped[item.item_type].push(item);
  });

  // Render each department as a separate table
  let itemCounter = 0;
  for (const type of departmentOrder) {
    const group = grouped[type];
    if (group.length === 0) continue;

    const groupTotal = group.reduce((s, i) => s + i.line_total, 0);

    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = 20;
    }

    // Department header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 4, w - margin * 2, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(typeLabels[type].toUpperCase(), margin + 3, y + 1);
    doc.setTextColor(100, 116, 139);
    doc.text(`${group.length} kalem  ·  ${fmt(groupTotal)}`, w - margin - 3, y + 1, { align: "right" });
    y += 8;

    const tableBody = group.map((item) => {
      itemCounter++;
      return [
        itemCounter.toString(),
        item.description,
        item.quantity.toString(),
        item.days.toString(),
        fmt(item.unit_price),
        fmt(item.line_total),
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Açıklama", "Adet", "Gün", "Birim Fiyat", "Toplam"]],
      body: tableBody,
      theme: "plain",
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [71, 85, 105],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 12, halign: "center" },
        3: { cellWidth: 12, halign: "center" },
        4: { cellWidth: 25, halign: "right" },
        5: { cellWidth: 28, halign: "right" },
      },
      alternateRowStyles: { fillColor: [252, 252, 253] },
    });

    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // — Weight & Volume summary (only if equipment data available) —
  const equipmentMap = new Map(equipment.map((e) => [e.id, e]));
  let totalWeight = 0;
  let totalCaseWeight = 0;
  let totalVolume = 0;

  grouped.Equipment.forEach((item) => {
    if (item.source_id) {
      const eq = equipmentMap.get(item.source_id);
      if (eq) {
        totalWeight += (eq.weight_kg || 0) * item.quantity;
        const casesNeeded = eq.items_per_case ? Math.ceil(item.quantity / eq.items_per_case) : item.quantity;
        totalCaseWeight += (eq.case_weight_kg || 0) * casesNeeded;
        totalVolume += (eq.case_volume_m3 || 0) * casesNeeded;
      }
    }
  });

  const grandWeight = totalWeight + totalCaseWeight;

  if (grandWeight > 0 || totalVolume > 0) {
    if (y > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 20;
    }

    // Logistics summary box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, w - margin * 2, 14, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("LOJISTIK OZETI", margin + 4, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const logParts = [
      `Ekipman: ${totalWeight.toFixed(1)} kg`,
      `Case: ${totalCaseWeight.toFixed(1)} kg`,
      `Hacim: ${totalVolume.toFixed(2)} m3`,
      `Toplam: ${grandWeight.toFixed(1)} kg`,
    ];
    doc.setTextColor(30, 41, 59);
    doc.text(logParts.join("    ·    "), margin + 4, y + 11);

    y += 20;
  }

  y += 4;

  // — Pricing summary (right-aligned) —
  if (y > doc.internal.pageSize.getHeight() - 50) {
    doc.addPage();
    y = 20;
  }

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
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 20;
    }
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

  // — Footer on every page —
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageH - 18, w - margin, pageH - 18);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`${companyName}  ·  ${companyLocation}  ·  All prices in ${currency}, excluding additional logistics unless stated.`, margin, pageH - 12);
    doc.text(`Generated ${new Date().toLocaleDateString("tr-TR")}  ·  Page ${p}/${totalPages}`, w - margin, pageH - 12, { align: "right" });
  }

  // Save
  doc.save(`${quote.quote_number}_${quote.customer_name.replace(/\s+/g, "_")}.pdf`);
}
