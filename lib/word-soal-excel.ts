import type { ExcelCell } from "write-excel-file";
import type { SoalRow } from "@/lib/word-soal";

/** Nama sheet sama dengan Template_Soal.xlsx (importer menentukan jenis soal dari nama sheet). */
export const SHEET_BY_TYPE: Record<SoalRow["Tipe_Soal"], string> = {
  MULTIPLE_CHOICE: "PG",
  MULTIPLE_CHOICE_COMPLEX: "PG Kompleks",
  MATCHING: "Menjodohkan",
  ESSAY: "Esai",
  TRUE_FALSE: "Benar Salah",
};

const HEAD_FULL = ["Teks_Soal", "Opsi_A", "Opsi_B", "Opsi_C", "Opsi_D", "Opsi_E", "Kunci_Jawaban", "Skor"] as const;
const HEAD_MATCH = ["Teks_Soal", "Opsi_A", "Opsi_B", "Opsi_C", "Opsi_D", "Opsi_E"] as const;

/**
 * Susun baris hasil konversi menjadi sheet-sheet seperti template.
 * Hanya sheet yang ada isinya yang dibuat.
 */
export function buildSoalSheets(rows: SoalRow[]): { sheets: string[]; data: ExcelCell[][][] } {
  const sheets: string[] = [];
  const data: ExcelCell[][][] = [];
  for (const tipe of Object.keys(SHEET_BY_TYPE) as SoalRow["Tipe_Soal"][]) {
    const subset = rows.filter((r) => r.Tipe_Soal === tipe);
    if (!subset.length) continue;
    const head = tipe === "MATCHING" ? HEAD_MATCH : HEAD_FULL;
    const table: ExcelCell[][] = [head.map((h) => ({ value: h, fontWeight: "bold" as const }))];
    for (const r of subset) {
      table.push(
        head.map((h) => {
          const v = (r as Record<string, unknown>)[h];
          if (h === "Skor" && typeof v === "number") return { value: v, type: Number };
          return { value: v === undefined || v === "" ? null : String(v), type: String };
        }),
      );
    }
    sheets.push(SHEET_BY_TYPE[tipe]);
    data.push(table);
  }
  return { sheets, data };
}

/** Teks polos pendek untuk pratinjau: hanya kalimat soal (stimulus dibuang), tanpa tag HTML. */
export function plainPreview(html: string, max = 140): string {
  const cut = html.lastIndexOf("<br><br>");
  const soal = cut >= 0 ? html.slice(cut + 8) : html;
  const t = soal
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}
