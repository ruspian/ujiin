/**
 * Mengubah HTML soal/jawaban (dari editor) menjadi teks biasa untuk dokumen
 * cetak (Word/PDF). Gambar diganti penanda "[gambar]"; rumus diambil LaTeX-nya.
 */

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : "";
    });
}

export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  let s = String(html);

  // rumus: <span data-type="inline-math" data-latex="x^2"></span>
  s = s.replace(
    /<(span|div)\b[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/\1>/gi,
    (_m, _tag, latex: string) => ` ${decodeEntities(latex)} `,
  );
  s = s.replace(/<img\b[^>]*>/gi, " [gambar] ");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<li\b[^>]*>/gi, "• ");
  s = s.replace(/<\/(p|div|li|h[1-6]|tr|pre|blockquote)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);

  return s
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
