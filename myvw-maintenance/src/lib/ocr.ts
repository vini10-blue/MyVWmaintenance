// On-device receipt OCR. Runs entirely in the browser via tesseract.js — no
// image ever leaves the device. Returns best-effort guesses the user confirms.
//
// tesseract.js is imported lazily so the (large) worker/wasm only loads when a
// receipt is actually scanned.

export interface ScannedReceipt {
  rawText: string;
  amount?: number;
  date?: string; // ISO yyyy-mm-dd
  vendor?: string;
}

export async function scanReceipt(file: Blob): Promise<ScannedReceipt> {
  const { recognize } = await import("tesseract.js");
  const { data } = await recognize(file, "eng");
  const text = data.text ?? "";
  return {
    rawText: text,
    amount: guessAmount(text),
    date: guessDate(text),
    vendor: guessVendor(text),
  };
}

function guessAmount(text: string): number | undefined {
  const lines = text.split(/\r?\n/);
  // Prefer lines that look like a total.
  const totalLines = lines.filter((l) => /total|amount|balance|due/i.test(l));
  const candidates: number[] = [];
  const moneyRe = /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g;
  const collect = (line: string) => {
    let m: RegExpExecArray | null;
    while ((m = moneyRe.exec(line))) {
      const n = parseMoney(m[1]);
      if (n != null) candidates.push(n);
    }
  };
  totalLines.forEach(collect);
  if (candidates.length === 0) lines.forEach(collect);
  if (candidates.length === 0) return undefined;
  // The largest money-looking value is usually the grand total.
  return Math.max(...candidates);
}

function parseMoney(s: string): number | undefined {
  // Normalise "1.234,56" and "1,234.56" to a plain number.
  let v = s;
  const lastComma = v.lastIndexOf(",");
  const lastDot = v.lastIndexOf(".");
  if (lastComma > lastDot) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else {
    v = v.replace(/,/g, "");
  }
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function guessDate(text: string): string | undefined {
  // Match common dd/mm/yyyy, mm/dd/yyyy and yyyy-mm-dd forms.
  const iso = text.match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) {
    return toIso(+iso[1], +iso[2], +iso[3]);
  }
  const dmy = text.match(/(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})/);
  if (dmy) {
    let year = +dmy[3];
    if (year < 100) year += 2000;
    // Ambiguous: assume day-first; clamp if impossible.
    let day = +dmy[1];
    let month = +dmy[2];
    if (month > 12 && day <= 12) [day, month] = [month, day];
    return toIso(year, month, day);
  }
  return undefined;
}

function toIso(y: number, m: number, d: number): string | undefined {
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function guessVendor(text: string): string | undefined {
  // Heuristic: first non-empty, mostly-letters line near the top.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    const letters = line.replace(/[^a-z]/gi, "").length;
    if (letters >= 3 && letters / line.length > 0.5) {
      return line.slice(0, 40);
    }
  }
  return undefined;
}
