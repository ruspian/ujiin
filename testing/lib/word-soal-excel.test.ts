import { describe, it, expect } from "vitest";
import { buildSoalSheets, plainPreview } from "@/lib/word-soal-excel";
import type { SoalRow } from "@/lib/word-soal";

const rows: SoalRow[] = [
  { Tipe_Soal: "MULTIPLE_CHOICE", Teks_Soal: "S1", Opsi_A: "a", Opsi_B: "b", Kunci_Jawaban: "A", Skor: 5 },
  { Tipe_Soal: "TRUE_FALSE", Teks_Soal: "S2", Kunci_Jawaban: "BENAR", Skor: 5 },
  { Tipe_Soal: "MATCHING", Teks_Soal: "S3", Opsi_A: "x | y | 5" },
];

describe("buildSoalSheets", () => {
  it("membuat sheet sesuai template hanya untuk jenis yang ada", () => {
    const { sheets, data } = buildSoalSheets(rows);
    expect(sheets).toEqual(["PG", "Menjodohkan", "Benar Salah"]);
    expect(data[0][0].map((c) => c.value)).toContain("Kunci_Jawaban");
    expect(data[1][0].map((c) => c.value)).not.toContain("Skor"); // matching tanpa Skor
    expect(data[0][1][7]).toEqual({ value: 5, type: Number });
  });
  it("plainPreview membuang tag dan memendekkan", () => {
    expect(plainPreview("<b>Stimulus</b><br>Isi &amp; lain<br><br>Soalnya &amp; ini?")).toBe("Soalnya & ini?");
    expect(plainPreview("Tanpa stimulus<br>baris dua")).toBe("Tanpa stimulus baris dua");
    expect(plainPreview("x".repeat(300), 50).length).toBeLessThanOrEqual(51);
  });
});
