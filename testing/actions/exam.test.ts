import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createExam, deleteExam, recordViolation } from "@/actions/exam";

//  MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    question: {
      findMany: vi.fn(),
    },
    exam: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    attempt: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Pengujian Server Action - Manajemen Ujian & Pelanggaran", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockExamInput = {
    title: "Ujian Akhir Semester Gasal",
    subjectId: "mapel-web",
    examTypeId: "type-uas",
    academicYearId: "year-2026",
    startTime: "2026-05-20T08:00:00.000Z",
    endTime: "2026-05-20T10:00:00.000Z",
    duration: 90,
    randomizeQuestions: true,
    showResult: false,
    status: "PUBLISHED" as const,
    classes: ["class-rpl1", "class-rpl2"],
    supervisorId: "guru-pengawas",
  };

  // TES UNTUK CREATE EXAM

  describe("createExam", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "author-pian", role: "ADMIN", name: "Ruspian" },
        expires: "valid",
      });
    });

    test("Harus gagal jika Bank Soal kosong (0 soal cocok)", async () => {
      vi.mocked(prisma.question.findMany).mockResolvedValue([]);

      const hasil = await createExam(mockExamInput);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain(
        "Gagal! Tidak ada soal di Bank Soal yang cocok",
      );
      expect(prisma.exam.create).not.toHaveBeenCalled();
    });

    test("Harus sukses membuat jadwal ujian dan otomatis menyambungkan soal yang cocok", async () => {
      vi.mocked(prisma.question.findMany).mockResolvedValue([
        { id: "soal-1" },
        { id: "soal-2" },
      ] as unknown as Awaited<ReturnType<typeof prisma.question.findMany>>);

      const hasil = await createExam(mockExamInput);
      expect(hasil.success).toBe(true);
      expect(hasil.message).toContain(
        "Jadwal Ujian dibuat! Berhasil memasukkan 2 soal.",
      );

      expect(prisma.exam.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: mockExamInput.title,
          authorId: "author-pian",
          classes: {
            connect: [{ id: "class-rpl1" }, { id: "class-rpl2" }],
          },
          questions: {
            connect: [{ id: "soal-1" }, { id: "soal-2" }],
          },
        }),
      });
    });
  });

  // TES UNTUK DELETE EXAM

  describe("deleteExam", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });
    });

    test("Harus gagal menghapus jika ujian sudah pernah dikerjakan oleh siswa", async () => {
      vi.mocked(prisma.attempt.count).mockResolvedValue(3);

      const mockFormData = new FormData();
      mockFormData.append("id", "exam-terpakai");

      const hasil = await deleteExam(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe(
        "Gagal! Ujian ini sudah dikerjakan oleh siswa.",
      );
      expect(prisma.exam.delete).not.toHaveBeenCalled();
    });

    test("Harus sukses menghapus jika belum ada riwayat pengerjaan sama sekali", async () => {
      vi.mocked(prisma.attempt.count).mockResolvedValue(0);

      const mockFormData = new FormData();
      mockFormData.append("id", "exam-kosong");

      const hasil = await deleteExam(mockFormData);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Jadwal Ujian berhasil dihapus!");
      expect(prisma.exam.delete).toHaveBeenCalledWith({
        where: { id: "exam-kosong" },
      });
    });
  });

  // TES ANTI-CHEAT

  describe("recordViolation", () => {
    test("Harus gagal jika sesi attempt pengerjaan siswa tidak valid", async () => {
      vi.mocked(prisma.attempt.findUnique).mockResolvedValue(null);

      const hasil = await recordViolation("attempt-palsu", "Pindah Tab");

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Sesi tidak ditemukan");
    });

    test("Harus sukses menambahkan log baru ke dalam array JSON dan menaikkan violationCount", async () => {
      const mockPastLogs = [
        { time: "2026-05-20T10:00:00.000Z", action: "Pindah Tab Pertama" },
      ];

      vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
        id: "attempt-budi",
        violationCount: 1,
        violationLogs: mockPastLogs,
      } as unknown as Awaited<ReturnType<typeof prisma.attempt.findUnique>>);

      const hasil = await recordViolation(
        "attempt-budi",
        "Keluar dari Fullscreen",
      );
      expect(hasil.success).toBe(true);

      expect(prisma.attempt.update).toHaveBeenCalledWith({
        where: { id: "attempt-budi" },
        data: expect.objectContaining({
          violationCount: 2,
          violationLogs: expect.arrayContaining([
            mockPastLogs[0],
            expect.objectContaining({ action: "Keluar dari Fullscreen" }),
          ]),
        }),
      });
    });
  });
});
