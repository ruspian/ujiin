import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parseWordBlocks, convertWordSoal } from "@/lib/word-soal";

const p = (text: string) => ({ t: "p" as const, text, heading: false });

describe("pembaca Word toleran", () => {
  it("dokumen tanpa judul bagian, opsi (A), kunci di bawah soal", () => {
    const r = parseWordBlocks([
      p("1. Ibu kota Indonesia adalah..."),
      p("(A) Bandung"), p("(B) Jakarta"), p("(C) Medan"),
      p("Kunci: B"),
      p("2. Jelaskan arti proklamasi!"),
      p("Jawaban: Pernyataan kemerdekaan bangsa Indonesia"),
    ], 100, true);
    expect(r.rows[0].Tipe_Soal).toBe("MULTIPLE_CHOICE");
    expect(r.rows[0].Opsi_B).toBe("Jakarta");
    expect(r.rows[0].Kunci_Jawaban).toBe("B");
    expect(r.rows[1].Tipe_Soal).toBe("ESSAY");
    expect(r.rows[1].Kunci_Jawaban).toContain("kemerdekaan");
    expect(r.rows[0].Skor! + r.rows[1].Skor!).toBe(100);
  });

  it("kunci satu baris '1. A 2. C' tanpa judul bagian", () => {
    const r = parseWordBlocks([
      p("1. Soal satu"), p("A. a"), p("B. b"),
      p("2. Soal dua"), p("A. a"), p("B. b"),
      p("KUNCI JAWABAN"),
      p("1. A  2. B"),
    ], 100, true);
    expect(r.rows.map((x) => x.Kunci_Jawaban)).toEqual(["A", "B"]);
  });

  it("kunci dari opsi yang ditebalkan di file .docx", async () => {
    const run = (t: string, b = false) =>
      `<w:r>${b ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${t}</w:t></w:r>`;
    const para = (...runs: string[]) => `<w:p>${runs.join("")}</w:p>`;
    const body =
      para(run("1. Warna langit?")) +
      para(run("A. Merah")) + para(run("B. Biru", true)) + para(run("C. Hijau"));
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
    );
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    const r = await convertWordSoal(buf, 100, true);
    expect(r.rows[0].Kunci_Jawaban).toBe("B");
  });

  it("tanda * di akhir opsi dianggap kunci", () => {
    const r = parseWordBlocks([p("1. Q"), p("a. x"), p("b. y *"), p("c. z")], 100, true);
    expect(r.rows[0].Kunci_Jawaban).toBe("B");
    expect(r.rows[0].Opsi_B).toBe("y");
  });
});
