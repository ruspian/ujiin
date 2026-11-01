import { describe, test, expect } from "vitest";
import { htmlToText } from "@/lib/report-text";
import { docToHtml } from "@/lib/report-doc";
import { buildStudentWorkBlocks, type WorkQuestion } from "@/lib/student-work-report";
import { buildRekapBlocks } from "@/lib/rekap-nilai-report";
import { buildDocx } from "@/lib/report-docx";

describe("htmlToText", () => {
  test("membersihkan tag, entitas, gambar, dan rumus", () => {
    const html =
      '<p>Hitung <span data-type="inline-math" data-latex="x^2 + 1"></span> &amp; lihat</p><p><img src="a.png"></p><ul><li>satu</li><li>dua</li></ul>';
    const text = htmlToText(html);
    expect(text).toContain("Hitung x^2 + 1 & lihat");
    expect(text).toContain("[gambar]");
    expect(text).toContain("• satu");
    expect(text).not.toContain("<");
  });
  test("null/undefined menjadi teks kosong", () => {
    expect(htmlToText(null)).toBe("");
    expect(htmlToText(undefined)).toBe("");
  });
});

describe("docToHtml", () => {
  test("teks pengguna di-escape (tidak bisa menyisipkan HTML/script)", () => {
    const html = docToHtml("Judul <b>", [
      { kind: "paragraph", text: '<script>alert("x")</script>' },
      { kind: "table", header: ["A"], rows: [["<img onerror=1>"]] },
    ]);
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&lt;script&gt;");
  });
  test("orientasi landscape dipakai bila diminta", () => {
    expect(docToHtml("t", [], { landscape: true })).toContain("A4 landscape");
  });
});

const questions: WorkQuestion[] = [
  {
    id: "q1",
    type: "MULTIPLE_CHOICE",
    score: 10,
    correctAnswer: "B",
    text: "<p>Ibu kota?</p>",
    options: [
      { id: "A", text: "<p>Bandung</p>" },
      { id: "B", text: "<p>Jakarta</p>" },
    ],
  },
  {
    id: "q2",
    type: "MATCHING",
    score: 10,
    correctAnswer: JSON.stringify([
      { left: "1+1", right: "2", point: 5 },
      { left: "2+2", right: "4", point: 5 },
    ]),
    text: "<p>Jodohkan</p>",
    options: null,
  },
  {
    id: "q3",
    type: "ESSAY",
    score: 20,
    correctAnswer: "<p>Rubrik</p>",
    text: "<p>Jelaskan</p>",
    options: null,
  },
];

describe("buildStudentWorkBlocks", () => {
  const blocks = buildStudentWorkBlocks({
    studentName: "Budi",
    nisn: "001",
    className: "XII TKJ",
    examTitle: "UAS",
    subjectName: "Matematika",
    status: "SUBMITTED",
    score: 55,
    answers: { q1: "A", q2: { "1+1": "2", "2+2": "5" }, q3: "Jawaban esai" },
    essayScores: { q3: 15 },
    questions,
  });
  const text = JSON.stringify(blocks);

  test("memuat identitas, nilai, dan poin per soal", () => {
    expect(text).toContain("Budi");
    expect(text).toContain("XII TKJ");
    expect(text).toContain("Poin 0 / 10"); // PG salah
    expect(text).toContain("Poin 5 / 10"); // menjodohkan separuh benar
    expect(text).toContain("Poin 15 / 20"); // esai dari nilai guru
  });
  test("menandai pilihan siswa dan kunci", () => {
    expect(text).toContain("[x] A. Bandung  (dipilih siswa)");
    expect(text).toContain("[ ] B. Jakarta  (kunci)");
  });
  test("soal tak dijawab ditandai", () => {
    const kosong = buildStudentWorkBlocks({
      studentName: "Ani", nisn: "2", className: "X", examTitle: "U", subjectName: "M",
      status: "CHEATED", score: null, answers: {}, questions: [questions[0]],
    });
    expect(JSON.stringify(kosong)).toContain("tidak menjawab");
    expect(JSON.stringify(kosong)).toContain("Belum dinilai");
  });
});

describe("buildRekapBlocks", () => {
  const blocks = buildRekapBlocks({
    subjectName: "Fisika",
    className: "XI A",
    academicYear: "2026/2027 - Ganjil",
    teacherName: "Pak Guru",
    students: [
      { id: "s1", name: "Ani", nisn: "1" },
      { id: "s2", name: "Budi", nisn: "2" },
    ],
    exams: [
      { id: "e1", title: "UH 1", examType: { name: "Ulangan" } },
      { id: "e2", title: "UH 2", examType: { name: "Ulangan" } },
    ],
    attemptsMap: { s1_e1: 80, s1_e2: 90, s2_e1: 60 },
    dateLabel: "1 November 2026",
  });
  const table = blocks.find((b) => b.kind === "table");

  test("rata-rata siswa dan kelas benar; belum mengerjakan = '-'", () => {
    if (!table || table.kind !== "table") throw new Error("tabel tidak ada");
    expect(table.rows[0]).toEqual(["1", "Ani", "1", "80", "90", "85"]);
    expect(table.rows[1]).toEqual(["2", "Budi", "2", "60", "-", "60"]);
    expect(table.rows[2]).toEqual(["", "Rata-rata kelas", "", "70", "90", "73"]);
  });
  test("ada tanda tangan guru", () => {
    expect(blocks.some((b) => b.kind === "signature")).toBe(true);
  });
  test("dokumen Word bisa dibangun dari blok yang sama", () => {
    expect(() => buildDocx(blocks, { landscape: true })).not.toThrow();
  });
});
