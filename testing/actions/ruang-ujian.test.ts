import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getStudentIdFromSession } from "@/lib/getStudentAuth";
import {
  autoSaveJawaban,
  submitUjianSiswa,
  catatPelanggaran,
  cekStatusAttempt,
  heartbeatUjian,
} from "@/actions/ruang-ujian";
import { AttemptStatus } from "@prisma/client";
import { AnswersMap } from "@/types/ruang-ujian";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    attempt: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/getStudentAuth", () => ({
  getStudentIdFromSession: vi.fn(),
}));

const NOW = new Date("2026-10-27T09:00:00Z");
const minutes = (m: number) => new Date(NOW.getTime() + m * 60_000);

type Found = Awaited<ReturnType<typeof prisma.attempt.findUnique>>;

const soal = [
  { id: "q-1", type: "MULTIPLE_CHOICE", score: 10, correctAnswer: "A" },
  { id: "q-2", type: "MULTIPLE_CHOICE", score: 10, correctAnswer: "C" },
  { id: "q-3", type: "MULTIPLE_CHOICE_COMPLEX", score: 10, correctAnswer: "A,B" },
  {
    id: "q-4",
    type: "MATCHING",
    score: 10,
    correctAnswer: JSON.stringify([{ left: "x", right: "y", point: 10 }]),
  },
  { id: "q-5", type: "ESSAY", score: 20, correctAnswer: "rubrik" },
];

const buatAttempt = (over: Record<string, unknown> = {}) =>
  ({
    id: "att-123",
    studentId: "std-1",
    startTime: minutes(-10),
    status: AttemptStatus.ONGOING,
    answers: null,
    essayScores: null,
    violationCount: 0,
    violationLogs: [],
    lastSeenAt: null,
    exam: { endTime: minutes(50), duration: 60, questions: soal },
    ...over,
  }) as unknown as Found;

describe("Pengujian Server Action - Sesi Ruang Ujian Siswa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.mocked(getStudentIdFromSession).mockResolvedValue("std-1");
    vi.mocked(prisma.attempt.update).mockResolvedValue({} as never);
    vi.mocked(prisma.attempt.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Kepemilikan sesi (anti-IDOR)", () => {
    test("menolak jika belum login", async () => {
      vi.mocked(getStudentIdFromSession).mockResolvedValue(null);
      const hasil = await autoSaveJawaban("att-123", { "q-1": "A" });
      expect(hasil.success).toBe(false);
      expect(prisma.attempt.update).not.toHaveBeenCalled();
    });

    test("menolak jika attempt milik siswa lain", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
        buatAttempt({ studentId: "std-LAIN" }),
      );
      expect((await autoSaveJawaban("att-123", { "q-1": "A" })).success).toBe(false);
      expect((await submitUjianSiswa("att-123", {})).success).toBe(false);
      expect((await catatPelanggaran("att-123", "x")).success).toBe(false);
      expect(prisma.attempt.update).not.toHaveBeenCalled();
      expect(prisma.attempt.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("autoSaveJawaban", () => {
    test("menyimpan jawaban & membuang kunci yang bukan soal ujian ini", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(buatAttempt());
      const hasil = await autoSaveJawaban("att-123", {
        "q-1": "A",
        "soal-asing": "Z",
      });
      expect(hasil.success).toBe(true);
      expect(prisma.attempt.update).toHaveBeenCalledWith({
        where: { id: "att-123" },
        data: { answers: { "q-1": "A" } },
      });
    });

    test("menolak simpan setelah sesi ditutup atau waktu habis", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
        buatAttempt({ status: AttemptStatus.SUBMITTED }),
      );
      expect((await autoSaveJawaban("att-123", { "q-1": "A" })).success).toBe(false);

      // durasi 60 menit, sudah mulai 2 jam lalu
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
        buatAttempt({ startTime: minutes(-120) }),
      );
      expect((await autoSaveJawaban("att-123", { "q-1": "A" })).success).toBe(false);
    });
  });

  describe("submitUjianSiswa & penilaian", () => {
    test("menilai SEMUA tipe otomatis, skala 0–100 dengan esai belum dinilai = 0", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(buatAttempt());
      const jawaban: AnswersMap = {
        "q-1": "A", // benar 10
        "q-2": "B", // salah
        "q-3": ["B", "A"], // benar 10 (dulu selalu 0)
        "q-4": { x: "y" }, // benar 10 (dulu selalu 0)
        "q-5": "esai siswa",
      };
      const hasil = await submitUjianSiswa("att-123", jawaban);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Ujian berhasil diselesaikan!");
      // 30 poin dari total bobot 60 => 50
      expect(prisma.attempt.updateMany).toHaveBeenCalledWith({
        where: { id: "att-123", status: AttemptStatus.ONGOING },
        data: expect.objectContaining({
          score: 50,
          status: AttemptStatus.SUBMITTED,
          endTime: expect.any(Date),
        }),
      });
    });

    test("auto-submit dengan jawaban kosong TIDAK menghapus jawaban yang sudah tersimpan", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
        buatAttempt({ answers: { "q-1": "A", "q-3": ["A", "B"] } }),
      );
      await submitUjianSiswa("att-123", {});
      expect(prisma.attempt.updateMany).toHaveBeenCalledWith({
        where: { id: "att-123", status: AttemptStatus.ONGOING },
        data: expect.objectContaining({
          answers: { "q-1": "A", "q-3": ["A", "B"] },
          score: 33.33,
        }),
      });
    });

    test("submit terlambat: kiriman client diabaikan, pakai jawaban tersimpan", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
        buatAttempt({ startTime: minutes(-120), answers: { "q-1": "A" } }),
      );
      await submitUjianSiswa("att-123", { "q-2": "C", "q-1": "A" });
      expect(prisma.attempt.updateMany).toHaveBeenCalledWith({
        where: { id: "att-123", status: AttemptStatus.ONGOING },
        data: expect.objectContaining({ answers: { "q-1": "A" }, score: 16.67 }),
      });
    });

    test("sesi CHEATED tidak bisa berubah menjadi SUBMITTED", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
        buatAttempt({ status: AttemptStatus.CHEATED }),
      );
      const hasil = await submitUjianSiswa("att-123", { "q-1": "A" });
      expect(hasil.success).toBe(false);
      expect(prisma.attempt.updateMany).not.toHaveBeenCalled();
    });

    test("submit ulang pada sesi SUBMITTED bersifat idempoten", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
        buatAttempt({ status: AttemptStatus.SUBMITTED }),
      );
      const hasil = await submitUjianSiswa("att-123", { "q-1": "A" });
      expect(hasil.success).toBe(true);
      expect(prisma.attempt.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("catatPelanggaran & Auto-Kick", () => {
    test("menaikkan counter dan menyimpan sumber", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
        buatAttempt({
          violationCount: 1,
          violationLogs: [{ waktu: "2026-10-27T08:00:00.000Z", jenis: "Pindah Tab" }],
        }),
      );
      const hasil = await catatPelanggaran("att-123", "Keluar dari Fullscreen");
      expect(hasil).toEqual({ success: true, violationCount: 2, isKicked: false });
      expect(prisma.attempt.update).toHaveBeenCalledWith({
        where: { id: "att-123" },
        data: expect.objectContaining({
          violationCount: 2,
          status: undefined,
          violationLogs: expect.arrayContaining([
            expect.objectContaining({ jenis: "Keluar dari Fullscreen", sumber: "web" }),
          ]),
        }),
      });
    });

    test("pelanggaran ke-3 mengubah status menjadi CHEATED", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
        buatAttempt({ violationCount: 2 }),
      );
      const hasil = await catatPelanggaran("att-123", "Membuka Aplikasi Lain", "android");
      expect(hasil).toEqual({ success: true, violationCount: 3, isKicked: true });
      expect(prisma.attempt.update).toHaveBeenCalledWith({
        where: { id: "att-123" },
        data: expect.objectContaining({
          status: "CHEATED",
          endTime: expect.any(Date),
        }),
      });
    });

    test("event identik dalam hitungan detik dihitung SEKALI", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
        buatAttempt({
          violationCount: 1,
          violationLogs: [{ waktu: NOW.toISOString(), jenis: "Pindah Tab" }],
        }),
      );
      const hasil = await catatPelanggaran("att-123", "Pindah Tab");
      expect(hasil).toEqual({ success: true, violationCount: 1, isKicked: false });
      expect(prisma.attempt.update).not.toHaveBeenCalled();
    });

    test("sesi yang sudah selesai tidak bisa dipakai menambah pelanggaran", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
        buatAttempt({ status: AttemptStatus.SUBMITTED }),
      );
      await catatPelanggaran("att-123", "apa saja");
      expect(prisma.attempt.update).not.toHaveBeenCalled();
    });
  });

  describe("cekStatusAttempt & heartbeat", () => {
    test("mengembalikan status pengerjaan", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
        buatAttempt({ status: AttemptStatus.SUBMITTED }),
      );
      expect(await cekStatusAttempt("att-123")).toEqual({
        success: true,
        status: AttemptStatus.SUBMITTED,
      });
    });

    test("heartbeat mengembalikan sisa waktu dari server (mulai + durasi)", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(buatAttempt());
      const hasil = await heartbeatUjian("att-123");
      expect(hasil.success).toBe(true);
      // mulai 10 menit lalu, durasi 60 => sisa 50 menit
      expect(hasil.remainingSeconds).toBe(50 * 60);
      expect(prisma.attempt.update).toHaveBeenCalledWith({
        where: { id: "att-123" },
        data: expect.objectContaining({ lastSeenAt: expect.any(Date) }),
      });
    });
  });
});
