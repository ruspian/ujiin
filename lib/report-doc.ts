import { decodeEntities } from "@/lib/report-text";

/**
 * Model dokumen sederhana yang bisa dirender menjadi HTML (untuk Cetak/PDF)
 * dan Word (.docx) dari satu sumber, sehingga isinya selalu sama.
 * Semua blok berupa data biasa (aman dikirim dari server ke komponen client).
 */
export type DocColor = "green" | "red" | "blue" | "gray";

export type DocBlock =
  | { kind: "title"; text: string }
  | { kind: "subtitle"; text: string }
  | { kind: "heading"; text: string }
  | {
      kind: "paragraph";
      text: string;
      bold?: boolean;
      italic?: boolean;
      color?: DocColor;
      indent?: boolean;
    }
  | { kind: "kv"; rows: [string, string][] }
  | {
      kind: "table";
      header: string[];
      rows: string[][];
      /** rata kiri (default) atau tengah per kolom */
      center?: boolean[];
      widths?: number[];
    }
  | { kind: "signature"; place: string; role: string; name: string }
  | { kind: "pagebreak" }
  | { kind: "spacer" };

export interface DocOptions {
  landscape?: boolean;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COLORS: Record<DocColor, string> = {
  green: "#047857",
  red: "#b91c1c",
  blue: "#1d4ed8",
  gray: "#6b7280",
};

const multiline = (text: string) => escapeHtml(text).replace(/\n/g, "<br>");

export function docToHtml(
  title: string,
  blocks: DocBlock[],
  options: DocOptions = {},
): string {
  const body = blocks
    .map((b) => {
      switch (b.kind) {
        case "title":
          return `<h1>${escapeHtml(b.text)}</h1>`;
        case "subtitle":
          return `<h2>${escapeHtml(b.text)}</h2>`;
        case "heading":
          return `<h3>${escapeHtml(b.text)}</h3>`;
        case "paragraph": {
          const style = [
            b.bold ? "font-weight:700" : "",
            b.italic ? "font-style:italic" : "",
            b.color ? `color:${COLORS[b.color]}` : "",
            b.indent ? "margin-left:18px" : "",
          ]
            .filter(Boolean)
            .join(";");
          return `<p style="${style}">${multiline(b.text)}</p>`;
        }
        case "kv":
          return `<table class="kv">${b.rows
            .map(
              ([k, v]) =>
                `<tr><td class="k">${escapeHtml(k)}</td><td>:</td><td>${multiline(v)}</td></tr>`,
            )
            .join("")}</table>`;
        case "table": {
          const cols = b.header.length;
          const widths = b.widths ?? [];
          const th = b.header
            .map(
              (h, i) =>
                `<th${widths[i] ? ` style="width:${widths[i]}%"` : ""}>${escapeHtml(h)}</th>`,
            )
            .join("");
          const tr = b.rows
            .map(
              (row) =>
                `<tr>${Array.from({ length: cols }, (_, i) => `<td${b.center?.[i] ? ' class="c"' : ""}>${multiline(row[i] ?? "")}</td>`).join("")}</tr>`,
            )
            .join("");
          return `<table class="grid"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
        }
        case "signature":
          return `<div class="sign"><p>${escapeHtml(b.place)}</p><p>${escapeHtml(b.role)}</p><div class="space"></div><p><b><u>${escapeHtml(b.name)}</u></b></p></div>`;
        case "pagebreak":
          return `<div style="page-break-after:always"></div>`;
        case "spacer":
          return `<div style="height:10px"></div>`;
      }
    })
    .join("\n");

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
@page { size: A4 ${options.landscape ? "landscape" : "portrait"}; margin: 15mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111; margin: 0; }
h1 { font-size: 16pt; text-align: center; margin: 0 0 4px; }
h2 { font-size: 12pt; text-align: center; margin: 0 0 14px; font-weight: 600; }
h3 { font-size: 11.5pt; margin: 16px 0 4px; border-bottom: 1px solid #ccc; padding-bottom: 3px; page-break-after: avoid; }
p { margin: 3px 0; line-height: 1.4; }
table { border-collapse: collapse; width: 100%; }
table.kv { width: auto; margin-bottom: 8px; }
table.kv td { padding: 1px 6px 1px 0; vertical-align: top; }
table.kv td.k { font-weight: 600; white-space: nowrap; }
table.grid { margin: 8px 0; }
table.grid th, table.grid td { border: 1px solid #888; padding: 4px 6px; font-size: 10pt; vertical-align: top; }
table.grid th { background: #f1f5f9; text-align: center; }
table.grid td.c { text-align: center; }
table.grid tr { page-break-inside: avoid; }
.sign { width: 220px; margin: 24px 0 0 auto; text-align: center; page-break-inside: avoid; }
.sign .space { height: 56px; }
</style></head><body>${body}</body></html>`;
}

/** Buka dialog cetak browser (pilih "Simpan sebagai PDF" untuk PDF). */
export function printDoc(
  title: string,
  blocks: DocBlock[],
  options: DocOptions = {},
) {
  const html = docToHtml(title, blocks, options);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    throw new Error("Tidak bisa membuka jendela cetak");
  }
  doc.open();
  doc.write(html);
  doc.close();

  const remove = () => setTimeout(() => iframe.remove(), 1000);
  win.addEventListener("afterprint", remove);
  // cadangan bila afterprint tidak terpanggil di browser tertentu
  setTimeout(() => iframe.remove(), 5 * 60 * 1000);

  // beri waktu gambar/font selesai dirender
  setTimeout(() => {
    win.focus();
    win.print();
  }, 250);
}

export { decodeEntities };
