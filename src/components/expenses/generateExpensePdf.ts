import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Expense } from "@/hooks/useExpenses";
import type { CompanySettings } from "@/hooks/useCompanySettings";

interface PdfOptions {
  expenses: Expense[];
  company?: CompanySettings | null;
  dateRange?: { label: string; from?: string; to?: string };
}

const categoryLabels: Record<string, string> = {
  Transport: "Ulaşım",
  Accommodation: "Konaklama",
  Meals: "Yemek",
  "Equipment Rental": "Ekipman Kiralama",
  Venue: "Mekan",
  Personnel: "Personel",
  Marketing: "Pazarlama",
  Other: "Diğer",
};

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  approved: "Onaylı",
  rejected: "Reddedildi",
};

const makeFmt = (currency: string) => (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

export function generateExpensePdf({ expenses, company, dateRange }: PdfOptions) {
  const companyName = company?.company_name || "PHANTOM";
  const companyTagline = "Event Production & Technical Services";
  const companyLocation = [company?.company_city, company?.company_country].filter(Boolean).join(", ") || "İstanbul, Turkey";
  const companyContact = [company?.company_email || "info@phantom.com.tr", company?.company_phone || "+90 212 555 0000"].join("  ·  ");
  const currency = company?.currency || "TRY";
  const fmt = makeFmt(currency);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  // — Brand header bar —
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, w, 32, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(companyTagline, margin, 20);
  doc.text(`${companyLocation}  ·  ${companyContact}`, margin, 26);

  // Title right side
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("MASRAF RAPORU", w - margin, 14, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  const rangeText = dateRange?.label || "Tüm Kayıtlar";
  doc.text(rangeText, w - margin, 22, { align: "right" });
  doc.text(`${expenses.length} kayıt`, w - margin, 28, { align: "right" });

  y = 38;

  // — Summary boxes —
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const approvedAmount = expenses.filter((e) => e.status === "approved").reduce((s, e) => s + e.amount, 0);
  const pendingAmount = expenses.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0);
  const rejectedAmount = expenses.filter((e) => e.status === "rejected").reduce((s, e) => s + e.amount, 0);

  const boxW = (w - margin * 2 - 12) / 4;
  const boxes = [
    { label: "TOPLAM", value: fmt(totalAmount), color: [37, 99, 235] },
    { label: "ONAYLANAN", value: fmt(approvedAmount), color: [34, 197, 94] },
    { label: "BEKLEYEN", value: fmt(pendingAmount), color: [245, 158, 11] },
    { label: "REDDEDİLEN", value: fmt(rejectedAmount), color: [239, 68, 68] },
  ];

  boxes.forEach((box, i) => {
    const bx = margin + i * (boxW + 4);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(bx, y, boxW, 16, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(box.label, bx + 4, y + 5);
    doc.setFontSize(11);
    doc.setTextColor(box.color[0], box.color[1], box.color[2]);
    doc.text(box.value, bx + 4, y + 13);
  });

  y += 22;

  // — Category breakdown —
  const categorySums: Record<string, number> = {};
  expenses.forEach((e) => {
    categorySums[e.category] = (categorySums[e.category] || 0) + e.amount;
  });
  const sortedCats = Object.entries(categorySums).sort((a, b) => b[1] - a[1]);

  if (sortedCats.length > 0) {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 4, w - margin * 2, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("KATEGORİ DAĞILIMI", margin + 3, y + 1);
    y += 8;

    const catBody = sortedCats.map(([cat, amount]) => [
      categoryLabels[cat] || cat,
      fmt(amount),
      totalAmount > 0 ? `%${Math.round((amount / totalAmount) * 100)}` : "%0",
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: w / 2 + 10 },
      head: [["Kategori", "Tutar", "Oran"]],
      body: catBody,
      theme: "plain",
      styles: {
        fontSize: 8,
        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [71, 85, 105],
        fontStyle: "bold",
        fontSize: 7,
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 30, halign: "right" },
        2: { cellWidth: 15, halign: "right" },
      },
    });

    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // — Expense detail table —
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 4, w - margin * 2, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("MASRAF DETAYLARI", margin + 3, y + 1);
  y += 8;

  const tableBody = expenses.map((e, i) => [
    (i + 1).toString(),
    fmtDate(e.expense_date),
    e.description.length > 35 ? e.description.substring(0, 32) + "..." : e.description,
    categoryLabels[e.category] || e.category,
    e.event_name || "—",
    e.submitted_by_name || "—",
    e.approved_by_name || "—",
    fmt(e.amount),
    statusLabels[e.status] || e.status,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Tarih", "Açıklama", "Kategori", "Etkinlik", "Gönderen", "Onaylayan", "Tutar", "Durum"]],
    body: tableBody,
    theme: "plain",
    styles: {
      fontSize: 7,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [71, 85, 105],
      fontStyle: "bold",
      fontSize: 6.5,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 24 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 24 },
      4: { cellWidth: 30 },
      5: { cellWidth: 28 },
      6: { cellWidth: 28 },
      7: { cellWidth: 25, halign: "right" },
      8: { cellWidth: 18, halign: "center" },
    },
    alternateRowStyles: { fillColor: [252, 252, 253] },
  });

  // — Footer on every page —
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageH - 14, w - margin, pageH - 14);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${companyName}  ·  ${companyLocation}  ·  Tüm tutarlar ${currency} cinsindendir.`,
      margin,
      pageH - 9
    );
    doc.text(
      `Oluşturulma: ${new Date().toLocaleDateString("tr-TR")}  ·  Sayfa ${p}/${totalPages}`,
      w - margin,
      pageH - 9,
      { align: "right" }
    );
  }

  // Save
  const dateStr = new Date().toISOString().split("T")[0];
  doc.save(`Masraf_Raporu_${dateStr}.pdf`);
}
