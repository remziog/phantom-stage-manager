import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock jsPDF before importing the module
const mockText = vi.fn();
const mockSave = vi.fn();
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetFillColor = vi.fn();
const mockSetDrawColor = vi.fn();
const mockRect = vi.fn();
const mockLine = vi.fn();
const mockSplitTextToSize = vi.fn().mockReturnValue(["note line"]);

const mockDoc = {
  text: mockText,
  save: mockSave,
  setFont: mockSetFont,
  setFontSize: mockSetFontSize,
  setTextColor: mockSetTextColor,
  setFillColor: mockSetFillColor,
  setDrawColor: mockSetDrawColor,
  rect: mockRect,
  line: mockLine,
  splitTextToSize: mockSplitTextToSize,
  internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
  lastAutoTable: { finalY: 150 },
};

vi.mock("jspdf", () => ({
  default: vi.fn(() => mockDoc),
}));

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}));

import { generateQuotePdf } from "@/components/quotes/generateQuotePdf";
import type { Quote, QuoteLineItem } from "@/hooks/useQuotes";
import type { CompanySettings } from "@/hooks/useCompanySettings";

const baseQuote: Quote = {
  id: "q1",
  quote_number: "QT-00001",
  event_name: "Test Event",
  customer_name: "Acme Corp",
  customer_id: null,
  status: "Draft",
  subtotal: 10000,
  discount_percent: 10,
  tax_percent: 20,
  total: 10800,
  event_date: "2026-06-01",
  event_end_date: "2026-06-03",
  venue: "Convention Center",
  notes: "Payment within 30 days",
  created_by: null,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

const lineItems: QuoteLineItem[] = [
  {
    id: "li1",
    quote_id: "q1",
    description: "LED Panel",
    item_type: "Equipment",
    quantity: 4,
    days: 3,
    unit_price: 500,
    line_total: 6000,
    sort_order: 0,
    source_id: null,
    created_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "li2",
    quote_id: "q1",
    description: "Sound Technician",
    item_type: "Personnel",
    quantity: 2,
    days: 3,
    unit_price: 666,
    line_total: 4000,
    sort_order: 1,
    source_id: null,
    created_at: "2026-03-01T00:00:00Z",
  },
];

describe("generateQuotePdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses default company values when no company settings provided", () => {
    generateQuotePdf({ quote: baseQuote, lineItems, company: null });

    // Should use "PHANTOM" as default company name
    expect(mockText).toHaveBeenCalledWith("PHANTOM", 20, 18);
    // Should call save with correct filename
    expect(mockSave).toHaveBeenCalledWith("QT-00001_Acme_Corp.pdf");
  });

  it("uses custom company name from settings", () => {
    const company: CompanySettings = {
      id: "cs1",
      company_name: "Stellar Events",
      company_email: "hello@stellar.com",
      company_phone: "+1 555 1234",
      company_address: "123 Main St",
      company_city: "New York",
      company_country: "USA",
      tax_id: "US123",
      logo_url: null,
      default_tax_rate: 8,
      currency: "USD",
      currency_symbol: "$",
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    generateQuotePdf({ quote: baseQuote, lineItems, company });

    // Should use custom company name (uppercased)
    expect(mockText).toHaveBeenCalledWith("STELLAR EVENTS", 20, 18);

    // Should include custom location in contact line
    const contactCalls = mockText.mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("New York")
    );
    expect(contactCalls.length).toBeGreaterThan(0);

    // Should include custom email in contact info
    const emailCalls = mockText.mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("hello@stellar.com")
    );
    expect(emailCalls.length).toBeGreaterThan(0);
  });

  it("uses custom currency from settings in footer", () => {
    const company: CompanySettings = {
      id: "cs1",
      company_name: "Euro Co",
      company_email: null,
      company_phone: null,
      company_address: null,
      company_city: "Berlin",
      company_country: "Germany",
      tax_id: null,
      logo_url: null,
      default_tax_rate: 19,
      currency: "EUR",
      currency_symbol: "€",
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    generateQuotePdf({ quote: baseQuote, lineItems, company });

    // Footer should mention EUR currency
    const footerCalls = mockText.mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("EUR")
    );
    expect(footerCalls.length).toBeGreaterThan(0);
  });

  it("falls back to defaults when company fields are null", () => {
    const company: CompanySettings = {
      id: "cs1",
      company_name: "Test Co",
      company_email: null,
      company_phone: null,
      company_address: null,
      company_city: null,
      company_country: null,
      tax_id: null,
      logo_url: null,
      default_tax_rate: 20,
      currency: "TRY",
      currency_symbol: "₺",
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    generateQuotePdf({ quote: baseQuote, lineItems, company });

    // Location should fall back to default
    const locationCalls = mockText.mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("İstanbul, Turkey")
    );
    expect(locationCalls.length).toBeGreaterThan(0);

    // Contact should fall back to defaults
    const contactCalls = mockText.mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("info@phantom.com.tr")
    );
    expect(contactCalls.length).toBeGreaterThan(0);
  });

  it("renders line items table via autoTable", async () => {
    const autoTable = (await import("jspdf-autotable")).default;

    generateQuotePdf({ quote: baseQuote, lineItems, company: null });

    expect(autoTable).toHaveBeenCalledTimes(1);
    const call = (autoTable as any).mock.calls[0];
    // Second arg is the config object
    const config = call[1];
    expect(config.body).toHaveLength(2);
    expect(config.body[0][1]).toBe("LED Panel");
    expect(config.body[1][1]).toBe("Sound Technician");
  });

  it("renders notes section when quote has notes", () => {
    generateQuotePdf({ quote: baseQuote, lineItems, company: null });

    const notesCalls = mockText.mock.calls.filter(
      (call: any[]) => call[0] === "NOTES"
    );
    expect(notesCalls.length).toBe(1);
  });

  it("skips notes section when quote has no notes", () => {
    const noNotesQuote = { ...baseQuote, notes: null };

    generateQuotePdf({ quote: noNotesQuote, lineItems, company: null });

    const notesCalls = mockText.mock.calls.filter(
      (call: any[]) => call[0] === "NOTES"
    );
    expect(notesCalls.length).toBe(0);
  });
});
