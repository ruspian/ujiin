import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { resetSesiSiswa } from "@/actions/monitoring";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    attempt: {
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Pengujian Server Action - Reset Sesi Siswa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockFormData = (
    examId: string | null,
    studentId: string | null,
  ): FormData => {
    const formData = new FormData();
    if (examId) formData.append("examId", examId);
    if (studentId) formData.append("studentId", studentId);
    return formData;
  };

  // TES GERBANG RBAC

  describe("Gerbang Otorisasi Multi-Role", () => {
    test("Harus melempar Error jika role pengguna adalah STUDENT (Ditolak)", async () => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "std-budi", role: "STUDENT" },
        expires: "valid",
      });

      const mockFormData = createMockFormData("exam-1", "student-1");

      await expect(resetSesiSiswa(mockFormData)).rejects.toThrow(
        "Akses ditolak!",
      );
      expect(prisma.attempt.delete).not.toHaveBeenCalled();
    });

    test("Harus lolos validasi jika role pengguna adalah GURU", async () => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "guru-pian", role: "GURU" },
        expires: "valid",
      });

      vi.mocked(prisma.attempt.delete).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.attempt.delete>>,
      );

      const mockFormData = createMockFormData("exam-1", "student-1");
      await resetSesiSiswa(mockFormData);

      expect(prisma.attempt.delete).toHaveBeenCalled();
    });

    test("Harus lolos validasi jika role pengguna adalah ADMIN", async () => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });

      vi.mocked(prisma.attempt.delete).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.attempt.delete>>,
      );

      const mockFormData = createMockFormData("exam-1", "student-1");
      await resetSesiSiswa(mockFormData);

      expect(prisma.attempt.delete).toHaveBeenCalled();
    });
  });

  // TES VALIDASI INPUT & LOGIKA BUSINESS

  describe("Validasi Parameter & Eksekusi Data", () => {
    beforeEach(() => {
      // Pasang session Guru sebagai default untuk sub-blok ini
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "guru-eko", role: "GURU" },
        expires: "valid",
      });
    });

    test("Harus langsung keluar (return) jika parameter examId atau studentId tidak lengkap", async () => {
      const mockFormDataSalah = createMockFormData(null, "student-1"); // examId absen

      const hasil = await resetSesiSiswa(mockFormDataSalah);

      // Pastikan fungsi berhenti tanpa memanggil prisma ataupun melempar error
      expect(hasil).toBeUndefined();
      expect(prisma.attempt.delete).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    test("Harus sukses menghapus data pengerjaan menggunakan Compound Id dan melakukan refresh cache", async () => {
      vi.mocked(prisma.attempt.delete).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.attempt.delete>>,
      );

      const mockFormData = createMockFormData("exam-framer", "student-budi");
      await resetSesiSiswa(mockFormData);

      // Verifikasi query penghapusan komposit Prisma sesuai kode asli
      expect(prisma.attempt.delete).toHaveBeenCalledWith({
        where: {
          studentId_examId: {
            studentId: "student-budi",
            examId: "exam-framer",
          },
        },
      });

      // Meringankan beban cache rute monitoring terkait secara real-time
      expect(revalidatePath).toHaveBeenCalledWith(
        "/guru/monitoring/exam-framer",
      );
    });
  });
});
