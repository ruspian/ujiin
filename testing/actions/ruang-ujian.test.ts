import { describe, test, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  autoSaveJawaban,
  submitUjianSiswa,
  catatPelanggaran,
  cekStatusAttempt,
} from "@/actions/ruang-ujian";
import { AttemptStatus, QuestionType } from "@prisma/client";
import { AnswersMap } from "@/types/ruang-ujian";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    attempt: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Pengujian Server Action - Sesi Ruang Ujian Siswa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  type MockAttemptFindUnique = Awaited<
    ReturnType<typeof prisma.attempt.findUnique>
  >;

  // Helper untuk menyusun blueprint soal tiruan
  const createMockQuestion = (
    id: string,
    type: QuestionType,
    score: number,
    correctAnswer: string,
  ) => {
    return {
      id,
      type,
      score,
      correctAnswer,
      createdAt: new Date(),
      updatedAt: new Date(),
      text: "Soal Ujian",
      options: {},
      classId: "class-1",
      authorId: "auth-1",
      subjectId: "sub-1",
      examTypeId: "ext-1",
    };
  };

  // TES AUTO SAVE JAWABAN

  describe("autoSaveJawaban", () => {
    test("Harus sukses melakukan background auto-save ke kolom JSON answers", async () => {
      vi.mocked(prisma.attempt.update).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.attempt.update>>,
      );

      const mockAnswers: AnswersMap = { "soal-1": "A", "soal-2": "B" };
      const hasil = await autoSaveJawaban("att-123", mockAnswers);

      expect(hasil.success).toBe(true);
      expect(prisma.attempt.update).toHaveBeenCalledWith({
        where: { id: "att-123" },
        data: { answers: mockAnswers },
      });
    });
  });

  // TES SUBMIT UJIAN & AUTO GRADING SCALING 100

  describe("submitUjianSiswa", () => {
    test("Harus sukses mengoreksi jawaban otomatis dan mengonversi nilai ke skala 100", async () => {
      const mockAnswers: AnswersMap = {
        "q-1": "A", // Benar (Skor 10)
        "q-2": "B", // Salah, harusnya C (Skor 0)
      };

      const mockQuestions = [
        createMockQuestion("q-1", "MULTIPLE_CHOICE", 10, "A"),
        createMockQuestion("q-2", "MULTIPLE_CHOICE", 10, "C"),
      ];

      vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
        id: "att-123",
        exam: { questions: mockQuestions },
      } as unknown as MockAttemptFindUnique);

      vi.mocked(prisma.attempt.update).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.attempt.update>>,
      );

      const hasil = await submitUjianSiswa("att-123", mockAnswers);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Ujian berhasil diselesaikan!");

      // Rumus penskalaan: (10 benar / 20 total bobot maksimal) * 100 = 50
      expect(prisma.attempt.update).toHaveBeenCalledWith({
        where: { id: "att-123" },
        data: expect.objectContaining({
          score: 50, // 👈 Nilai akhir wajib terkonversi tepat angka 50!
          status: AttemptStatus.SUBMITTED,
          endTime: expect.any(Date),
        }),
      });
    });
  });

  // TES ANTI-CHEAT ENGINE & AUTO KICK (3x VIOLATION)

  describe("catatPelanggaran & Auto-Kick", () => {
    test("Harus mencatat log pelanggaran baru dan menaikkan counter jika di bawah 3 kali", async () => {
      const mockPastLogs = [
        { waktu: "2026-05-20T10:00:00.000Z", jenis: "Pindah Tab" },
      ];

      vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
        violationCount: 1,
        violationLogs: mockPastLogs,
      } as unknown as MockAttemptFindUnique);

      vi.mocked(prisma.attempt.update).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.attempt.update>>,
      );

      const hasil = await catatPelanggaran("att-123", "Keluar dari Fullscreen");

      expect(hasil).toEqual({
        success: true,
        violationCount: 2, // 1 + 1 = 2
        isKicked: false, // Belaku kick karena belum menyentuh angka 3
      });

      expect(prisma.attempt.update).toHaveBeenCalledWith({
        where: { id: "att-123" },
        data: expect.objectContaining({
          violationCount: 2,
          status: undefined, // Status pengerjaan tidak diubah
        }),
      });
    });

    test("Harus mengubah status menjadi CHEATED dan menendang siswa (isKicked) jika pelanggaran mencapai 3 kali", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
        violationCount: 2, // Pelanggaran kedua sebelumnya
        violationLogs: [],
      } as unknown as MockAttemptFindUnique);

      vi.mocked(prisma.attempt.update).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.attempt.update>>,
      );

      const hasil = await catatPelanggaran("att-123", "Membuka Aplikasi Lain");

      // Verifikasi respon kick anti-cheat
      expect(hasil).toEqual({
        success: true,
        violationCount: 3,
        isKicked: true, // 🔥 Pemicu auto-kick wajib bernilai true!
      });

      expect(prisma.attempt.update).toHaveBeenCalledWith({
        where: { id: "att-123" },
        data: expect.objectContaining({
          violationCount: 3,
          status: "CHEATED", // Sesi dikunci dengan status curang
          endTime: expect.any(Date), // Sesi ditutup paksa saat itu juga
        }),
      });
    });
  });

  // TES CEK STATUS ATTEMPT

  describe("cekStatusAttempt", () => {
    test("Harus mengembalikan status pengerjaan siswa saat ini dengan benar", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
        status: AttemptStatus.SUBMITTED,
      } as unknown as MockAttemptFindUnique);

      const hasil = await cekStatusAttempt("att-123");

      expect(hasil).toEqual({ success: true, status: AttemptStatus.SUBMITTED });
    });
  });
});
