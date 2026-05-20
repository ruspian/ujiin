import { describe, test, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createClass, updateClass, deleteClass } from "@/actions/class"; // Sesuaikan dengan nama file asli lu
import { Class } from "@prisma/client";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    class: {
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Pengujian Server Action - Manajemen Kelas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockClass = (overrides: Partial<Class>): Class => {
    return {
      id: "class-123",
      name: "XII RPL 1",
      level: 12,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  };

  // TES UNTUK CREATE CLASS

  describe("createClass", () => {
    test("Harus gagal jika nama kelas sudah ada di database (Case Insensitive)", async () => {
      // Setel prisma findFirst agar pura-pura menemukan kelas dengan nama yang sama
      vi.mocked(prisma.class.findFirst).mockResolvedValue(
        createMockClass({ name: "xii rpl 1" }),
      );

      const mockFormData = new FormData();
      mockFormData.append("name", "XII RPL 1");
      mockFormData.append("level", "12");

      const hasil = await createClass(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Nama kelas sudah ada!");
    });

    test("Harus sukses membuat kelas baru jika nama belum terdaftar", async () => {
      // Setel tidak ada kelas yang kembar (null)
      vi.mocked(prisma.class.findFirst).mockResolvedValue(null);

      const mockFormData = new FormData();
      mockFormData.append("name", "XI TKJ 2");
      mockFormData.append("level", "11");

      const hasil = await createClass(mockFormData);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Data kelas berhasil ditambahkan!");
      expect(prisma.class.create).toHaveBeenCalled();
    });
  });

  // TES UNTUK UPDATE CLASS

  describe("updateClass", () => {
    test("Harus gagal jika nama kelas baru ternyata sudah dipakai oleh kelas dengan ID lain", async () => {
      vi.mocked(prisma.class.findFirst).mockResolvedValue(
        createMockClass({ id: "class-orang-lain", name: "X MM 1" }),
      );

      const mockFormData = new FormData();
      mockFormData.append("id", "class-kita");
      mockFormData.append("name", "X MM 1");
      mockFormData.append("level", "10");

      const hasil = await updateClass(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Nama kelas sudah dipakai!");
    });
  });

  // TES UNTUK DELETE CLASS

  describe("deleteClass", () => {
    test("Harus gagal jika mencoba menghapus kelas yang masih berisi siswa", async () => {
      // Pura-pura mendeteksi ada 25 siswa di dalam kelas tersebut
      vi.mocked(prisma.student.count).mockResolvedValue(25);

      const hasil = await deleteClass("class-berisi");

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain(
        "Gagal! Masih ada 25 siswa di kelas ini.",
      );
      // Pastikan fungsi delete prisma TIDAK dipanggil demi keamanan data
      expect(prisma.class.delete).not.toHaveBeenCalled();
    });

    test("Harus sukses menghapus jika kelas sudah kosong (0 siswa)", async () => {
      vi.mocked(prisma.student.count).mockResolvedValue(0);

      const hasil = await deleteClass("class-kosong");

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Kelas berhasil dihapus!");
      expect(prisma.class.delete).toHaveBeenCalledWith({
        where: { id: "class-kosong" },
      });
    });
  });
});
