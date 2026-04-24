/**
 * Tiny RFC-4180-ish CSV parser and asset-row validator.
 * No external dependencies — handles quoted fields, escaped quotes, and CRLF.
 */

export type CsvRow = Record<string, string>;

export interface ParsedCsv {
  headers: string[];
  rows: CsvRow[];
}

/** Parse CSV text into headers + row objects. Throws on malformed input. */
export function parseCsv(text: string): ParsedCsv {
  // Strip UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      // Handle CRLF or lone CR.
      if (text[i + 1] === "\n") i++;
      row.push(field);
      records.push(row);
      field = "";
      row = [];
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      records.push(row);
      field = "";
      row = [];
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  // Flush any trailing field/row that wasn't terminated by a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  // Drop fully blank trailing rows.
  while (records.length && records[records.length - 1].every((c) => c.trim() === "")) {
    records.pop();
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0].map((h) => h.trim());
  const rows: CsvRow[] = records.slice(1).map((r) => {
    const obj: CsvRow = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });

  return { headers, rows };
}

// ─── Asset validation ────────────────────────────────────────────────────────

export const ASSET_REQUIRED_HEADERS = ["name"] as const;
export const ASSET_OPTIONAL_HEADERS = [
  "sku",
  "category",
  "quantity",
  "unit_price",
  "location",
  "status",
] as const;
export const ASSET_ALL_HEADERS = [
  ...ASSET_REQUIRED_HEADERS,
  ...ASSET_OPTIONAL_HEADERS,
] as const;

export const ASSET_STATUS_VALUES = [
  "available",
  "rented",
  "in_maintenance",
  "sold",
  "archived",
] as const;
export type ImportAssetStatus = (typeof ASSET_STATUS_VALUES)[number];

export interface HeaderCheck {
  ok: boolean;
  missing: string[];
  unknown: string[];
}

export function validateAssetHeaders(headers: string[]): HeaderCheck {
  const set = new Set(headers.map((h) => h.toLowerCase()));
  const missing = ASSET_REQUIRED_HEADERS.filter((h) => !set.has(h));
  const unknown = headers.filter(
    (h) => !ASSET_ALL_HEADERS.includes(h.toLowerCase() as (typeof ASSET_ALL_HEADERS)[number]),
  );
  return { ok: missing.length === 0, missing: [...missing], unknown };
}

export interface ValidatedAssetRow {
  /** 1-indexed row number in the CSV body (excluding the header). */
  lineNumber: number;
  raw: CsvRow;
  /** Field-level errors. Empty when the row is valid. */
  errors: { field: string; message: string }[];
  /** Normalized values, present even when there are errors (best-effort). */
  parsed: {
    name: string;
    sku: string | null;
    category: string | null;
    location: string | null;
    quantity: number;
    unit_price: number;
    status: ImportAssetStatus;
  };
}

/** Lowercase header keys so lookups are case-insensitive. */
function lowerKeys(row: CsvRow): CsvRow {
  const out: CsvRow = {};
  for (const k of Object.keys(row)) out[k.toLowerCase()] = row[k];
  return out;
}

export function validateAssetRow(row: CsvRow, lineNumber: number): ValidatedAssetRow {
  const r = lowerKeys(row);
  const errors: ValidatedAssetRow["errors"] = [];

  const name = (r.name ?? "").trim();
  if (!name) errors.push({ field: "name", message: "Name is required" });
  if (name.length > 200) errors.push({ field: "name", message: "Name must be ≤ 200 characters" });

  const sku = (r.sku ?? "").trim() || null;
  if (sku && sku.length > 100) errors.push({ field: "sku", message: "SKU must be ≤ 100 characters" });

  const category = (r.category ?? "").trim() || null;
  const location = (r.location ?? "").trim() || null;

  let quantity = 1;
  if (r.quantity !== undefined && r.quantity !== "") {
    const n = Number(r.quantity);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      errors.push({ field: "quantity", message: "Quantity must be a non-negative integer" });
    } else {
      quantity = n;
    }
  }

  let unit_price = 0;
  if (r.unit_price !== undefined && r.unit_price !== "") {
    const n = Number(r.unit_price);
    if (!Number.isFinite(n) || n < 0) {
      errors.push({ field: "unit_price", message: "Unit price must be a non-negative number" });
    } else {
      unit_price = n;
    }
  }

  let status: ImportAssetStatus = "available";
  if (r.status !== undefined && r.status !== "") {
    const s = r.status.toLowerCase() as ImportAssetStatus;
    if (!ASSET_STATUS_VALUES.includes(s)) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${ASSET_STATUS_VALUES.join(", ")}`,
      });
    } else {
      status = s;
    }
  }

  return {
    lineNumber,
    raw: row,
    errors,
    parsed: { name, sku, category, location, quantity, unit_price, status },
  };
}

/** Serialize rows back to CSV (used for the "download skipped rows" button). */
export function rowsToCsv(headers: string[], rows: CsvRow[]): string {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const head = headers.map(escape).join(",");
  const body = rows
    .map((r) => headers.map((h) => escape(r[h] ?? "")).join(","))
    .join("\n");
  return body ? `${head}\n${body}` : head;
}
