import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { verifikasiTokenUjian, generateExamToken } from "@/actions/ujian";
import { AttemptStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
    },
    exam: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    attempt: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    rateLimit: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "guru-1", role: "GURU" } }),
}));

vi.mock("@/lib/getStudentAuth", () => ({
  getStudentAuth: vi
    .fn()
    .mockResolvedValue({ id: "std-pian", classId: "kelas-1" }),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  isRateLimited: vi.fn().mockResolvedValue(false),
  recordFailure: vi.fn(),
  resetRateLimit: vi.fn(),
}));

vi.mock("@/lib/generateRandomPassword", () => ({
  generateRandomPassword: vi.fn().mockReturnValue("TOK123"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Pengujian Server Action - Autentikasi Token & Akses Ujian", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 🔥 BEKUKAN WAKTU: Kunci waktu berjalan tetap di Jam 09:00 Siang WITA (2026-05-20)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T09:00:00+08:00"));
  });

  afterEach(() => {
    // Kembalikan waktu asli setelah pengujian selesai
    vi.useRealTimers();
  });

  type MockExamFindUnique = Awaited<ReturnType<typeof prisma.exam.findUnique>>;
  type MockAttemptFindFirst = Awaited<
    ReturnType<typeof prisma.attempt.findFirst>
  >;

  // Helper pencetak waktu relatif agar kode tes scannable
  const getMockTime = (hoursOffset: number) => {
    const d = new Date("2026-05-20T09:00:00+08:00");
    d.setHours(d.getHours() + hoursOffset);
    return d;
  };

  // TES GERBANG MASUK UJIAN

  describe("verifikasiTokenUjian - gerbang masuk", () => {
    const examOk = (over: object = {}) =>
      ({
        id: "exam-uts",
        status: "PUBLISHED",
        token: "TOK123",
        classes: [{ id: "kelas-1" }],
        startTime: getMockTime(-1),
        endTime: getMockTime(1),
        ...over,
      }) as unknown as MockExamFindUnique;

    test("Menolak jika studentId dari client berbeda dengan siswa yang login", async () => {
      const hasil = await verifikasiTokenUjian("exam-uts", "std-lain", "TOK123");
      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain("Sesi login tidak valid");
      expect(prisma.attempt.create).not.toHaveBeenCalled();
    });

    test("Menolak jika kelas siswa bukan target ujian", async () => {
      vi.mocked(prisma.exam.findUnique).mockResolvedValue(
        examOk({ classes: [{ id: "kelas-lain" }] }),
      );
      const hasil = await verifikasiTokenUjian("exam-uts", "std-pian", "TOK123");
      expect(hasil).toEqual({
        success: false,
        message: "Ujian ini bukan untuk kelas Anda!",
      });
    });

    test("Menolak token salah dan tidak membuat sesi", async () => {
      vi.mocked(prisma.exam.findUnique).mockResolvedValue(examOk());
      vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null);
      const hasil = await verifikasiTokenUjian("exam-uts", "std-pian", "SALAH1");
      expect(hasil).toEqual({ success: false, message: "Token salah!" });
      expect(prisma.attempt.create).not.toHaveBeenCalled();
    });

    test("Menolak jika ujian belum dimulai", async () => {
      vi.mocked(prisma.exam.findUnique).mockResolvedValue(
        examOk({ startTime: getMockTime(2), endTime: getMockTime(4) }),
      );
      vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null);
      const hasil = await verifikasiTokenUjian("exam-uts", "std-pian", "TOK123");
      expect(hasil).toEqual({
        success: false,
        message: "Waktu ujian belum dimulai!",
      });
    });

    test("Token benar (huruf kecil diterima) membuat sesi ONGOING baru", async () => {
      vi.mocked(prisma.exam.findUnique).mockResolvedValue(examOk());
      vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.attempt.create).mockResolvedValue({
        id: "att-baru",
        status: AttemptStatus.ONGOING,
      } as unknown as Awaited<ReturnType<typeof prisma.attempt.create>>);

      const hasil = await verifikasiTokenUjian("exam-uts", "std-pian", "tok123");

      expect(hasil.success).toBe(true);
      expect(hasil.attemptId).toBe("att-baru");
      expect(prisma.attempt.create).toHaveBeenCalledWith({
        data: { studentId: "std-pian", examId: "exam-uts", status: "ONGOING" },
      });
    });

    test("Siswa yang sesinya MASIH BERJALAN bisa masuk lagi tanpa token (token sudah diganti guru)", async () => {
      vi.mocked(prisma.exam.findUnique).mockResolvedValue(
        examOk({ token: "TOKENBARU" }),
      );
      vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
        id: "att-lama",
        status: AttemptStatus.ONGOING,
      } as unknown as MockAttemptFindFirst);

      const hasil = await verifikasiTokenUjian("exam-uts", "std-pian", "TOKENLAMA");

      expect(hasil.success).toBe(true);
      expect(hasil.attemptId).toBe("att-lama");
      expect(prisma.attempt.create).not.toHaveBeenCalled();
    });

    test("Sesi lama yang SUDAH selesai tidak bisa dibuka lagi walau token benar", async () => {
      vi.mocked(prisma.exam.findUnique).mockResolvedValue(examOk());
      vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
        id: "att-selesai",
        status: AttemptStatus.SUBMITTED,
      } as unknown as MockAttemptFindFirst);
      const hasil = await verifikasiTokenUjian("exam-uts", "std-pian", "TOK123");
      expect(hasil).toEqual({
        success: false,
        message: "Anda sudah menyelesaikan ujian ini!",
      });
    });
  });

  // TES VERIFIKASI TOKEN & CEK STATUS BLACKLIST

  describe("verifikasiTokenUjian", () => {
    test("Harus menolak akses jika murid terdeteksi membawa status CHEATED (Banned)", async () => {
      vi.mocked(prisma.exam.findUnique).mockResolvedValue({
        id: "exam-uts",
        status: "PUBLISHED",
        token: "TOK123",
        classes: [{ id: "kelas-1" }],
        startTime: getMockTime(-1),
        endTime: getMockTime(1),
      } as unknown as MockExamFindUnique);

      // Riwayat terdeteksi sudah ditendang karena curang
      vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
        id: "att-banned",
        status: AttemptStatus.CHEATED,
      } as unknown as MockAttemptFindFirst);

      const hasil = await verifikasiTokenUjian(
        "exam-uts",
        "std-pian",
        "TOK123",
      );

      expect(hasil).toEqual({
        success: false,
        message: "Akses diblokir karena indikasi kecurangan!",
      });
      expect(prisma.attempt.create).not.toHaveBeenCalled();
    });
  });

  // TES RE-GENERATE TOKEN JADWAL

  describe("generateExamToken", () => {
    test("Harus sukses meng-update token acak baru ke dalam database jadwal terkait", async () => {
      vi.mocked(prisma.exam.update).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.exam.update>>,
      );

      const hasil = await generateExamToken("exam-uts");

      expect(hasil).toEqual({
        success: true,
        message: "Token ujian berhasil di-generate!",
        token: "TOK123",
      });

      expect(prisma.exam.update).toHaveBeenCalledWith({
        where: { id: "exam-uts" },
        data: { token: "TOK123" },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/admin/jadwal");
    });
  });
});
