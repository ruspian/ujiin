import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { convertWordSoal, type SoalRow } from "@/lib/word-soal";

const fx = (n: string) => fs.readFileSync(path.join(__dirname, "../fixtures/word", n));

/** Total skor semua baris: matching = jumlah poin pasangan. */
function total(rows: SoalRow[]) {
  return rows.reduce((s, r) => {
    if (r.Tipe_Soal !== "MATCHING") return s + (r.Skor ?? 0);
    return (
      s +
      ["Opsi_A", "Opsi_B", "Opsi_C", "Opsi_D", "Opsi_E"].reduce((a, k) => {
        const v = (r as Record<string, unknown>)[k] as string | undefined;
        return a + (v ? Number(v.split("|").pop()) : 0);
      }, 0)
    );
  }, 0);
}

describe("convertWordSoal — Bahasa Indonesia kelas X (kunci tabel, pilihan bersama)", () => {
  it("membaca semua jenis soal, kunci, dan total bobot 100", async () => {
    const r = await convertWordSoal(fx("bahasa-indonesia-x.docx"));
    expect(r.warnings).toEqual([]);
    expect(r.counts).toEqual({
      MULTIPLE_CHOICE: 7,
      MULTIPLE_CHOICE_COMPLEX: 7,
      MATCHING: 2, // 7 pasangan dipecah (maks 5 per baris)
      ESSAY: 7,
      TRUE_FALSE: 7,
    });
    expect(total(r.rows)).toBe(100);

    const pg = r.rows[0];
    expect(pg.Tipe_Soal).toBe("MULTIPLE_CHOICE");
    expect(pg.Kunci_Jawaban).toBe("B");
    expect(pg.Teks_Soal).toContain("Stimulus 1");
    expect(pg.Opsi_E).toBe("Berisi pendapat pribadi penulis");

    const pgk = r.rows.find((x) => x.Tipe_Soal === "MULTIPLE_CHOICE_COMPLEX")!;
    expect(pgk.Kunci_Jawaban).toBe("A,B,D");

    const mj = r.rows.filter((x) => x.Tipe_Soal === "MATCHING");
    expect(mj[0].Opsi_A).toMatch(/^Cerita yang mengandung humor dan kritik \| .+ \| \d+$/);
    // kunci 15 = C, 17 = D (dibaca dari tabel kunci)
    expect(mj[0].Opsi_A).toContain("| Gambaran umum tentang objek |");
    expect(mj[0].Opsi_C).toContain("| Bagian penutup atau perubahan situasi |");

    const tf = r.rows.filter((x) => x.Tipe_Soal === "TRUE_FALSE");
    expect(tf.map((x) => x.Kunci_Jawaban).slice(0, 2)).toEqual(["BENAR", "SALAH"]);

    const es = r.rows.find((x) => x.Tipe_Soal === "ESSAY")!;
    expect(es.Kunci_Jawaban).toBe("Pohon mangga.");
  });
});

describe("convertWordSoal — Sejarah kelas XI (menjodohkan per soal, benar-salah baris)", () => {
  it("membaca tabel Kolom A/B dengan kunci 1-B,2-C,3-A", async () => {
    const r = await convertWordSoal(fx("sejarah-xi.docx"));
    expect(r.warnings).toEqual([]);
    expect(r.counts.MATCHING).toBe(6);
    expect(r.counts.TRUE_FALSE).toBe(6);
    expect(r.counts.MULTIPLE_CHOICE_COMPLEX).toBe(8);
    expect(total(r.rows)).toBe(100);

    const mj = r.rows.find((x) => x.Tipe_Soal === "MATCHING")!;
    expect(mj.Opsi_A).toMatch(/^Pattimura \| Pemimpin perlawanan di Maluku \| \d+$/);
    expect(mj.Opsi_B).toMatch(/^Pangeran Diponegoro \| Pemimpin Perang Diponegoro \| \d+$/);

    const tf = r.rows.find((x) => x.Tipe_Soal === "TRUE_FALSE")!;
    expect(tf.Teks_Soal).not.toContain("Jawaban:");
    expect(tf.Kunci_Jawaban).toBe("BENAR");
  });
});

describe("convertWordSoal — kasus tepi", () => {
  it("file yang bukan docx ditolak", async () => {
    await expect(convertWordSoal(Buffer.from("bukan docx"))).rejects.toThrow();
  });
  it("tanpa pembagian bobot memakai skor bawaan", async () => {
    const r = await convertWordSoal(fx("sejarah-xi.docx"), null);
    expect(r.rows.find((x) => x.Tipe_Soal === "MULTIPLE_CHOICE")!.Skor).toBe(2);
  });
});
