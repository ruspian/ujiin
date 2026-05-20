import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  createExamType,
  updateExamType,
  deleteExamType,
} from "@/actions/exam-type";
import { ExamType } from "@prisma/client";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    examType: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    exam: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Pengujian Server Action - Jenis Ujian (Exam Type)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper untuk membuat objek ExamType tiruan yang type-safe
  const createMockExamType = (overrides: Partial<ExamType>): ExamType => {
    return {
      id: "ext-123",
      name: "Ujian Tengah Semester",
      code: "UTS",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  };

  // TES PROTEKSI GERBANG AUTENTIKASI

  describe("Proteksi Autentikasi", () => {
    test("Harus gagal jika pengguna tidak login (Session null)", async () => {
      (vi.mocked(auth) as Mock).mockResolvedValue(null);

      const mockFormData = new FormData();
      const hasil = await createExamType(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Akses ditolak!");
    });

    test("Harus gagal jika pengguna login tapi rolenya bukan ADMIN", async () => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "user-1", role: "STUDENT", name: "Rian" },
        expires: "token-expired-date",
      });

      const mockFormData = new FormData();
      const hasil = await createExamType(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Akses ditolak!");
    });
  });

  // TES UNTUK CREATE EXAM TYPE

  describe("createExamType", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN", name: "Pak Admin" },
        expires: "valid",
      });
    });

    test("Harus gagal jika kode ujian sudah terdaftar di sistem", async () => {
      vi.mocked(prisma.examType.findUnique).mockResolvedValue(
        createMockExamType({ code: "UTS" }),
      );

      const mockFormData = new FormData();
      mockFormData.append("name", "Ujian Tulis Semester");
      mockFormData.append("code", "uts");

      const hasil = await createExamType(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Kode ujian ini sudah terdaftar!");
    });

    test("Harus sukses jika kode ujian unik dan data valid", async () => {
      vi.mocked(prisma.examType.findUnique).mockResolvedValue(null);

      const mockFormData = new FormData();
      mockFormData.append("name", "Ujian Akhir Semester");
      mockFormData.append("code", "uas");

      const hasil = await createExamType(mockFormData);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Jenis Ujian berhasil ditambahkan!");
      expect(prisma.examType.create).toHaveBeenCalledWith({
        data: { name: "Ujian Akhir Semester", code: "UAS" },
      });
    });
  });

  describe("updateExamType", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN", name: "Pak Admin" },
        expires: "valid",
      });
    });

    test("Harus gagal jika kode ujian baru sudah dipakai oleh ID lain", async () => {
      vi.mocked(prisma.examType.findFirst).mockResolvedValue(
        createMockExamType({ id: "ext-orang-lain", code: "UH" }),
      );

      const mockFormData = new FormData();
      mockFormData.append("id", "ext-kita");
      mockFormData.append("name", "Ulangan Harian");
      mockFormData.append("code", "uh");

      const hasil = await updateExamType(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Kode ujian ini sudah dipakai!");
    });

    test("Harus sukses memperbarui jika kode ujian belum dipakai ID lain", async () => {
      // Mengembalikan data milik kita sendiri, berarti aman
      vi.mocked(prisma.examType.findFirst).mockResolvedValue(
        createMockExamType({ id: "ext-kita", code: "UH" }),
      );

      const mockFormData = new FormData();
      mockFormData.append("id", "ext-kita");
      mockFormData.append("name", "Ulangan Harian Bersama");
      mockFormData.append("code", "uh");

      const hasil = await updateExamType(mockFormData);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Jenis Ujian berhasil diperbarui!");
      expect(prisma.examType.update).toHaveBeenCalled();
    });
  });

  // TES UNTUK DELETE EXAM TYPE

  describe("deleteExamType", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN", name: "Pak Admin" },
        expires: "valid",
      });
    });

    test("Harus gagal jika jenis ujian masih dipakai di jadwal ujian", async () => {
      vi.mocked(prisma.exam.count).mockResolvedValue(5);

      const mockFormData = new FormData();
      mockFormData.append("id", "ext-terikat");

      const hasil = await deleteExamType(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain(
        "Gagal! Jenis ujian ini sedang dipakai di 5 jadwal ujian.",
      );
      expect(prisma.examType.delete).not.toHaveBeenCalled();
    });

    test("Harus sukses menghapus jika data bersih", async () => {
      vi.mocked(prisma.exam.count).mockResolvedValue(0);

      const mockFormData = new FormData();
      mockFormData.append("id", "ext-aman");

      const hasil = await deleteExamType(mockFormData);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Jenis Ujian berhasil dihapus!");
      expect(prisma.examType.delete).toHaveBeenCalledWith({
        where: { id: "ext-aman" },
      });
    });
  });
});
