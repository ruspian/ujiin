import { describe, test, expect, beforeEach } from "vitest";
import { useExamStore } from "@/store/useExamStore";

describe("useExamStore - nomor urut simpan (seq)", () => {
  beforeEach(() => {
    localStorage.clear();
    useExamStore.getState().clearExam();
  });

  test("perangkat baru melanjutkan dari saveSeq server, bukan mulai dari 0", () => {
    // Regresi: dulu seq mulai dari 0 sehingga simpanan ke-1..N ditolak server
    // sebagai "basi" (server sudah di saveSeq N) dan jawaban hilang diam-diam.
    const s = useExamStore.getState();
    s.initExam("att-1", { q1: "A" }, 7);
    useExamStore.getState().saveAnswers({ q1: "B" });

    const after = useExamStore.getState();
    expect(after.seq).toBe(8);
    expect(after.syncedSeq).toBe(7);
    expect(after.seq).toBeGreaterThan(7);
  });

  test("jawaban lokal yang belum terkirim menang atas data server saat halaman dibuka ulang", () => {
    const s = useExamStore.getState();
    s.initExam("att-1", { q1: "A" }, 2);
    useExamStore.getState().saveAnswers({ q1: "C", q2: "D" });

    useExamStore.getState().initExam("att-1", { q1: "A" }, 2);

    const after = useExamStore.getState();
    expect(after.answers).toEqual({ q1: "C", q2: "D" });
    expect(after.seq).toBe(3);
  });

  test("ujian lain: data ujian sebelumnya tidak ikut terbawa", () => {
    const s = useExamStore.getState();
    s.initExam("att-1", {}, 0);
    useExamStore.getState().saveAnswers({ q1: "A" });
    useExamStore.getState().enqueueViolation({
      jenis: "x",
      sumber: "web",
      at: new Date().toISOString(),
    });

    useExamStore.getState().initExam("att-2", { z: "1" }, 5);

    const after = useExamStore.getState();
    expect(after.attemptId).toBe("att-2");
    expect(after.answers).toEqual({ z: "1" });
    expect(after.violations).toHaveLength(0);
    expect(after.seq).toBe(5);
  });
});
