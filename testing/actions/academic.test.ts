import { describe, test, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createAcademicYear, deleteAcademicYear } from "@/actions/academic";
import { AcademicYear, Semester } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    academicYear: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    exam: {
      count: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Pengujian Server Action - Academic Year (Folder Terpisah)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockAcademicYear = (
    overrides: Partial<AcademicYear>,
  ): AcademicYear => {
    return {
      id: "mock-id",
      year: "2025/2026",
      semester: Semester.GANJIL,
      active: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  };

  describe("createAcademicYear", () => {
    test("Harus gagal jika Tahun Ajaran sudah ada di database", async () => {
      vi.mocked(prisma.academicYear.findFirst).mockResolvedValue(
        createMockAcademicYear({
          id: "id-123",
          year: "2025/2026",
          semester: Semester.GANJIL,
        }),
      );

      const mockFormData = new FormData();
      mockFormData.append("year", "2025/2026");
      mockFormData.append("semester", "GANJIL");

      const hasil = await createAcademicYear(mockFormData);
      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Tahun Ajaran ini sudah ada di sistem!");
    });
  });

  describe("deleteAcademicYear", () => {
    test("Harus gagal jika mencoba menghapus Tahun Ajaran yang sedang AKTIF", async () => {
      vi.mocked(prisma.academicYear.findUnique).mockResolvedValue(
        createMockAcademicYear({
          id: "year-aktif",
          semester: Semester.GENAP,
          active: true, // Setel aktif
        }),
      );

      const mockFormData = new FormData();
      mockFormData.append("id", "year-aktif");

      const hasil = await deleteAcademicYear(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe(
        "Tidak bisa menghapus Tahun Ajaran yang sedang Aktif!",
      );
    });

    test("Harus gagal jika Tahun Ajaran masih terikat dengan jadwal ujian siswa", async () => {
      vi.mocked(prisma.academicYear.findUnique).mockResolvedValue(
        createMockAcademicYear({
          id: "year-terikat",
          active: false,
        }),
      );

      vi.mocked(prisma.exam.count).mockResolvedValue(3);

      const mockFormData = new FormData();
      mockFormData.append("id", "year-terikat");

      const hasil = await deleteAcademicYear(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain(
        "Gagal! Tahun ajaran ini dipakai di 3 jadwal ujian.",
      );
    });

    test("Harus sukses menghapus jika semua syarat terpenuhi", async () => {
      vi.mocked(prisma.academicYear.findUnique).mockResolvedValue(
        createMockAcademicYear({
          id: "year-aman",
          active: false,
        }),
      );
      vi.mocked(prisma.exam.count).mockResolvedValue(0);

      const mockFormData = new FormData();
      mockFormData.append("id", "year-aman");

      const hasil = await deleteAcademicYear(mockFormData);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Tahun Ajaran berhasil dihapus!");
      expect(prisma.academicYear.delete).toHaveBeenCalled();
    });
  });
});
