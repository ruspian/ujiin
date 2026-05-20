import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  masukUjian,
  verifikasiTokenUjian,
  generateExamToken,
} from "@/actions/ujian";
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
  },
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

  type MockStudentFindUnique = Awaited<
    ReturnType<typeof prisma.student.findUnique>
  >;
  type MockExamFindFirst = Awaited<ReturnType<typeof prisma.exam.findFirst>>;
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

  // TES MASUK UJIAN (GATEKEEPING ENGINE)

  describe("masukUjian", () => {
    test("Harus gagal masuk jika kelas siswa tidak terdaftar dalam target kelas ujian", async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue({
        id: "std-pian",
        classId: "class-rpl1",
      } as unknown as MockStudentFindUnique);

      // Ujian ini di-setel khusus untuk kelas TKJ saja
      vi.mocked(prisma.exam.findFirst).mockResolvedValue({
        id: "exam-uts",
        classes: [{ id: "class-tkj1" }, { id: "class-tkj2" }],
      } as unknown as MockExamFindFirst);

      const hasil = await masukUjian("0012345", "TOK123");

      expect(hasil).toEqual({
        success: false,
        message: "Ujian ini bukan untuk kelas Anda!",
      });
      expect(prisma.attempt.create).not.toHaveBeenCalled();
    });

    test("Harus gagal masuk jika waktu sekarang belum menyentuh jam mulai ujian (startTime)", async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue({
        id: "std-pian",
        classId: "class-rpl1",
      } as unknown as MockStudentFindUnique);

      vi.mocked(prisma.exam.findFirst).mockResolvedValue({
        id: "exam-uts",
        classes: [{ id: "class-rpl1" }],
        startTime: getMockTime(2), // Ujian baru mulai 2 jam lagi (Jam 11 WITA)
        endTime: getMockTime(4),
      } as unknown as MockExamFindFirst);

      const hasil = await masukUjian("0012345", "TOK123");

      expect(hasil).toEqual({
        success: false,
        message: "Ujian belum dimulai!",
      });
    });

    test("Harus sukses membuat attempt baru dengan status ONGOING jika semua validasi lolos", async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue({
        id: "std-pian",
        classId: "class-rpl1",
      } as unknown as MockStudentFindUnique);

      vi.mocked(prisma.exam.findFirst).mockResolvedValue({
        id: "exam-uts",
        classes: [{ id: "class-rpl1" }],
        startTime: getMockTime(-1), // Sudah mulai 1 jam yang lalu (Jam 08 WITA)
        endTime: getMockTime(1), // Berakhir 1 jam lagi (Jam 10 WITA)
      } as unknown as MockExamFindFirst);

      // Murid belum pernah buat sesi (null)
      vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.attempt.create).mockResolvedValue({
        id: "att-baru-789",
      } as unknown as Awaited<ReturnType<typeof prisma.attempt.create>>);

      const hasil = await masukUjian("0012345", "tok123"); // Input huruf kecil otomatis dicarry ke UpperCase

      expect(hasil).toEqual({
        success: true,
        message: "Berhasil masuk! Mengalihkan ke ruang ujian...",
        attemptId: "att-baru-789",
      });

      expect(prisma.attempt.create).toHaveBeenCalledWith({
        data: {
          studentId: "std-pian",
          examId: "exam-uts",
          status: "ONGOING",
        },
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
