import { describe, test, expect } from "vitest";
import {
  GradableQuestion,
  clampEssayScore,
  gradeAttempt,
  gradeQuestion,
  parseKeyList,
  toPercent,
} from "@/lib/grading";
import { getAttemptDeadline } from "@/lib/exam-config";

const q = (
  id: string,
  type: GradableQuestion["type"],
  score: number,
  correctAnswer: string,
): GradableQuestion => ({ id, type, score, correctAnswer });

describe("gradeQuestion", () => {
  test("PG: benar, salah, case & spasi tidak masalah", () => {
    const soal = q("1", "MULTIPLE_CHOICE", 10, "B");
    expect(gradeQuestion(soal, "B")).toBe(10);
    expect(gradeQuestion(soal, " b ")).toBe(10);
    expect(gradeQuestion(soal, "A")).toBe(0);
    expect(gradeQuestion(soal, undefined)).toBe(0);
    expect(gradeQuestion(soal, "")).toBe(0);
  });

  test("Benar/Salah", () => {
    const soal = q("1", "TRUE_FALSE", 5, "BENAR");
    expect(gradeQuestion(soal, "BENAR")).toBe(5);
    expect(gradeQuestion(soal, "SALAH")).toBe(0);
  });

  test("PG kompleks: urutan bebas, harus persis sama, format koma atau JSON", () => {
    const soal = q("1", "MULTIPLE_CHOICE_COMPLEX", 10, "A,C");
    expect(gradeQuestion(soal, ["C", "A"])).toBe(10);
    expect(gradeQuestion(soal, ["A"])).toBe(0);
    expect(gradeQuestion(soal, ["A", "B", "C"])).toBe(0);
    const json = q("2", "MULTIPLE_CHOICE_COMPLEX", 10, '["A","C"]');
    expect(gradeQuestion(json, ["a", "c"])).toBe(10);
  });

  test("PG kompleks: jawaban ganda ['A','A'] tidak bisa menipu panjang array", () => {
    const soal = q("1", "MULTIPLE_CHOICE_COMPLEX", 10, "A,B");
    expect(gradeQuestion(soal, ["A", "A"])).toBe(0);
  });

  test("Menjodohkan: poin per pasangan, parsial, tidak melebihi bobot", () => {
    const key = JSON.stringify([
      { left: "L1", right: "R1", point: 5 },
      { left: "L2", right: "R2", point: 5 },
    ]);
    const soal = q("1", "MATCHING", 10, key);
    expect(gradeQuestion(soal, { L1: "R1", L2: "R2" })).toBe(10);
    expect(gradeQuestion(soal, { L1: "R1", L2: "X" })).toBe(5);
    expect(gradeQuestion(soal, {})).toBe(0);

    const tanpaPoin = q(
      "2",
      "MATCHING",
      10,
      JSON.stringify([
        { left: "A", right: "1" },
        { left: "B", right: "2" },
      ]),
    );
    expect(gradeQuestion(tanpaPoin, { A: "1" })).toBe(5);

    const kelebihan = q(
      "3",
      "MATCHING",
      4,
      JSON.stringify([{ left: "A", right: "1", point: 10 }]),
    );
    expect(gradeQuestion(kelebihan, { A: "1" })).toBe(4);
  });

  test("Esai selalu 0 otomatis, kunci rusak tidak melempar error", () => {
    expect(gradeQuestion(q("1", "ESSAY", 20, "rubrik"), "jawaban")).toBe(0);
    expect(gradeQuestion(q("2", "MATCHING", 10, "bukan json"), { a: "b" })).toBe(0);
  });
});

describe("gradeAttempt & skala nilai", () => {
  const soal: GradableQuestion[] = [
    q("pg", "MULTIPLE_CHOICE", 10, "A"),
    q("kmp", "MULTIPLE_CHOICE_COMPLEX", 10, "A,B"),
    q("mj", "MATCHING", 10, JSON.stringify([{ left: "x", right: "y", point: 10 }])),
    q("esai", "ESSAY", 20, "rubrik"),
  ];

  test("semua tipe otomatis ikut dihitung (dulu PG kompleks & menjodohkan = 0)", () => {
    const r = gradeAttempt(soal, { pg: "A", kmp: ["A", "B"], mj: { x: "y" } });
    expect(r.autoPoints).toBe(30);
    expect(r.maxPoints).toBe(50);
    expect(r.percent).toBe(60);
  });

  test("nilai esai guru ditambahkan dan tetap skala 0–100", () => {
    const r = gradeAttempt(
      soal,
      { pg: "A", kmp: ["A", "B"], mj: { x: "y" } },
      { esai: 15 },
    );
    expect(r.totalPoints).toBe(45);
    expect(r.percent).toBe(90);
  });

  test("skala tidak bergantung total bobot (bobot 200 -> tetap max 100)", () => {
    const besar = [q("a", "MULTIPLE_CHOICE", 100, "A"), q("b", "MULTIPLE_CHOICE", 100, "A")];
    expect(gradeAttempt(besar, { a: "A", b: "A" }).percent).toBe(100);
    expect(gradeAttempt(besar, { a: "A" }).percent).toBe(50);
  });

  test("esai di atas bobot dipotong; nilai negatif jadi 0", () => {
    expect(clampEssayScore(999, 20)).toBe(20);
    expect(clampEssayScore(-5, 20)).toBe(0);
    expect(clampEssayScore("abc", 20)).toBe(0);
    expect(gradeAttempt(soal, {}, { esai: 999 }).totalPoints).toBe(20);
  });

  test("tanpa soal / tanpa jawaban -> 0, tidak NaN", () => {
    expect(gradeAttempt([], {}).percent).toBe(0);
    expect(gradeAttempt(soal, null).percent).toBe(0);
    expect(toPercent(1, 0)).toBe(0);
  });

  test("pembulatan 2 desimal", () => {
    expect(toPercent(1, 3)).toBe(33.33);
    expect(toPercent(2, 3)).toBe(66.67);
  });
});

describe("parseKeyList", () => {
  test("format koma dan JSON", () => {
    expect(parseKeyList("a, c")).toEqual(["A", "C"]);
    expect(parseKeyList('["a","c"]')).toEqual(["A", "C"]);
    expect(parseKeyList("")).toEqual([]);
  });
});

describe("getAttemptDeadline", () => {
  test("durasi membatasi waktu, jadwal berakhir tetap jadi batas atas", () => {
    const mulai = new Date("2026-10-27T08:00:00Z");
    const selesaiJadwal = new Date("2026-10-27T10:00:00Z");
    expect(getAttemptDeadline(mulai, selesaiJadwal, 60).toISOString()).toBe(
      "2026-10-27T09:00:00.000Z",
    );
    // masuk telat: jadwal selesai lebih dulu daripada mulai+durasi
    const telat = new Date("2026-10-27T09:30:00Z");
    expect(getAttemptDeadline(telat, selesaiJadwal, 60).toISOString()).toBe(
      "2026-10-27T10:00:00.000Z",
    );
  });
});
