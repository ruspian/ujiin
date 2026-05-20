import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  createReligion,
  updateReligion,
  deleteReligion,
} from "@/actions/religion";
import { Religion } from "@prisma/client";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    religion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    student: {
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

describe("Pengujian Server Action - Master Data Agama", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper blueprint data Religion tiruan yang type-safe
  const createMockReligion = (overrides: Partial<Religion>): Religion => {
    return {
      id: "rel-1",
      name: "Islam",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  };

  // TES UNTUK CREATE RELIGION

  describe("createReligion", () => {
    beforeEach(() => {
      // Setel default session login sebagai ADMIN yang sah
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });
    });

    test("Harus gagal jika nama agama sudah terdaftar di database", async () => {
      vi.mocked(prisma.religion.findUnique).mockResolvedValue(
        createMockReligion({ name: "Islam" }),
      );

      const mockFormData = new FormData();
      mockFormData.append("name", "Islam");

      const hasil = await createReligion(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Agama ini sudah terdaftar!");
      expect(prisma.religion.create).not.toHaveBeenCalled();
    });

    test("Harus sukses menambahkan data agama baru jika namanya unik", async () => {
      vi.mocked(prisma.religion.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.religion.create).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.religion.create>>,
      );

      const mockFormData = new FormData();
      mockFormData.append("name", "Kristen Protestan");

      const hasil = await createReligion(mockFormData);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Data Agama berhasil ditambahkan!");
      expect(prisma.religion.create).toHaveBeenCalledWith({
        data: { name: "Kristen Protestan" },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/admin/master/agama");
    });
  });

  // TES UNTUK UPDATE RELIGION

  describe("updateReligion", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });
    });

    test("Harus gagal mengubah jika nama agama baru ternyata sudah dipakai ID lain", async () => {
      vi.mocked(prisma.religion.findFirst).mockResolvedValue(
        createMockReligion({ id: "rel-orang-lain", name: "Katolik" }),
      );

      const mockFormData = new FormData();
      mockFormData.append("id", "rel-kita");
      mockFormData.append("name", "Katolik");

      const hasil = await updateReligion(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Nama Agama ini sudah ada!");
      expect(prisma.religion.update).not.toHaveBeenCalled();
    });

    test("Harus sukses memperbarui jika nama agama diubah ke string yang belum ada pemilik lain", async () => {
      vi.mocked(prisma.religion.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.religion.update).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.religion.update>>,
      );

      const mockFormData = new FormData();
      mockFormData.append("id", "rel-kita");
      mockFormData.append("name", "Hindu");

      const hasil = await updateReligion(mockFormData);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Data Agama berhasil diperbarui!");
      expect(prisma.religion.update).toHaveBeenCalledWith({
        where: { id: "rel-kita" },
        data: { name: "Hindu" },
      });
    });
  });

  // TES UNTUK DELETE RELIGION (RELASI LOCK)

  describe("deleteReligion", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });
    });

    test("Harus gagal menghapus jika data agama masih terikat dengan data siswa", async () => {
      // Pura-pura mendeteksi ada 12 siswa terikat dengan ID agama ini
      vi.mocked(prisma.student.count).mockResolvedValue(12);

      const mockFormData = new FormData();
      mockFormData.append("id", "rel-terpakai");

      const hasil = await deleteReligion(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain(
        "Gagal! Agama ini sedang digunakan oleh 12 siswa.",
      );
      expect(prisma.religion.delete).not.toHaveBeenCalled();
    });

    test("Harus sukses menghapus jika tidak ada siswa yang terikat", async () => {
      vi.mocked(prisma.student.count).mockResolvedValue(0);
      vi.mocked(prisma.religion.delete).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.religion.delete>>,
      );

      const mockFormData = new FormData();
      mockFormData.append("id", "rel-kosong");

      const hasil = await deleteReligion(mockFormData);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Data Agama berhasil dihapus!");
      expect(prisma.religion.delete).toHaveBeenCalledWith({
        where: { id: "rel-kosong" },
      });
    });
  });
});
