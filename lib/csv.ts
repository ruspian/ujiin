/** Aman untuk Excel: netralkan sel yang diawali rumus (=, +, -, @) lalu kutip. */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+([.,]\d+)?$/.test(text)) {
    text = `'${text}`;
  }
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Bangun CSV (pemisah koma, CRLF) dengan BOM UTF-8 agar terbaca benar di Excel. */
export function buildCsv(rows: unknown[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
