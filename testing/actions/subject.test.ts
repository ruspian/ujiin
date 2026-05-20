import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSubject, updateSubject, deleteSubject } from "@/actions/subject";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subject: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    question: {
      count: vi.fn(),
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

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    const error = new Error("NEXT_REDIRECT");
    (error as unknown as { digest: string }).digest =
      `NEXT_REDIRECT;303;${url};false;`;
    throw error;
  }),
}));

describe("Pengujian Server Action - Manajemen Mata Pelajaran (Subject)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  type MockSubjectFindFirst = Awaited<
    ReturnType<typeof prisma.subject.findFirst>
  >;

  // Helper mandiri untuk menyuplai FormData mapel agar kode tes scannable
  const createMockFormData = (overrides?: { name?: string; id?: string }) => {
    const formData = new FormData();
    if (overrides?.id) formData.append("id", overrides.id);
    formData.append("name", overrides?.name ?? "Pemrograman Web Next.js");
    formData.append("religionId", "rel-umum");
    formData.append("teacherIds", "guru-pian");
    formData.append("teacherIds", "guru-zaki");
    formData.append("classIds", "class-rpl1");
    formData.append("classIds", "class-rpl2");
    return formData;
  };

  // TES PROTEKSI AUTH & REDIRECT LOCK

  describe("Gerbang Otorisasi Admin", () => {
    test("Harus langsung melempar redirect ke /login jika pengguna bukan ADMIN", async () => {
      // Setel session login sebagai GURU
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "guru-1", role: "GURU" },
        expires: "valid",
      });

      const mockFormData = createMockFormData();

      // Tangkap error internal redirect Next.js
      await expect(createSubject(mockFormData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );

      expect(redirect).toHaveBeenCalledWith("/login");
      expect(prisma.subject.create).not.toHaveBeenCalled();
    });
  });

  // TES UNTUK CREATE SUBJECT

  describe("createSubject", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });
    });

    test("Harus gagal jika nama mata pelajaran sudah terdaftar (Case-Insensitive)", async () => {
      // Pura-pura nama mapel sudah kembar di DB
      vi.mocked(prisma.subject.findFirst).mockResolvedValue({
        id: "sub-old",
        name: "PEMROGRAMAN WEB NEXT.JS",
      } as unknown as MockSubjectFindFirst);

      const mockFormData = createMockFormData({
        name: "  pemrograman web next.js  ",
      }); // Simulasikan spasi kotor
      const hasil = await createSubject(mockFormData);

      expect(hasil).toEqual({
        success: false,
        message: "Mata pelajaran sudah ada!",
      });
      expect(prisma.subject.create).not.toHaveBeenCalled();
    });

    test("Harus sukses menyimpan data mapel beserta koneksi array Many-to-Many", async () => {
      vi.mocked(prisma.subject.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.subject.create).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.subject.create>>,
      );

      const mockFormData = createMockFormData({ name: "Dasar Desain Grafis" });
      const hasil = await createSubject(mockFormData);

      expect(hasil).toEqual({
        success: true,
        message: "Mata pelajaran berhasil ditambahkan!",
      });

      // Verifikasi struktur data connect relasi Prisma
      expect(prisma.subject.create).toHaveBeenCalledWith({
        data: {
          name: "Dasar Desain Grafis",
          religionId: "rel-umum",
          teachers: {
            connect: [{ id: "guru-pian" }, { id: "guru-zaki" }],
          },
          classes: {
            connect: [{ id: "class-rpl1" }, { id: "class-rpl2" }],
          },
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/admin/master/mapel");
    });
  });

  // TES UNTUK UPDATE SUBJECT

  describe("updateSubject", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });
    });

    test("Harus sukses memperbarui mapel dan mengganti relasi lama via method SET", async () => {
      vi.mocked(prisma.subject.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.subject.update).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.subject.update>>,
      );

      const mockFormData = createMockFormData({
        id: "sub-123",
        name: "Pemrograman Berorientasi Objek",
      });
      const hasil = await updateSubject(mockFormData);

      expect(hasil).toEqual({
        success: true,
        message: "Mata pelajaran berhasil diperbarui!",
      });

      // Verifikasi penggunaan method SET untuk pembersihan relasi Many-to-Many lama
      expect(prisma.subject.update).toHaveBeenCalledWith({
        where: { id: "sub-123" },
        data: {
          name: "Pemrograman Berorientasi Objek",
          religionId: "rel-umum",
          teachers: {
            set: [{ id: "guru-pian" }, { id: "guru-zaki" }],
          },
          classes: {
            set: [{ id: "class-rpl1" }, { id: "class-rpl2" }],
          },
        },
      });
    });
  });

  // TES UNTUK DELETE SUBJECT CONSTRAINTS

  describe("deleteSubject", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });
    });

    test("Harus gagal menghapus jika mapel terikat dengan bank soal atau jadwal ujian", async () => {
      // Pura-pura mapel terikat di 5 soal dan 2 jadwal ujian
      vi.mocked(prisma.question.count).mockResolvedValue(5);
      vi.mocked(prisma.exam.count).mockResolvedValue(2);

      const formData = new FormData();
      formData.append("id", "sub-terikat");

      const hasil = await deleteSubject(formData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain(
        "Gagal! Mapel ini sedang digunakan pada 5 soal dan 2 jadwal ujian.",
      );
      expect(prisma.subject.delete).not.toHaveBeenCalled();
    });

    test("Harus sukses menghapus mapel jika tidak memiliki keterikatan data", async () => {
      vi.mocked(prisma.question.count).mockResolvedValue(0);
      vi.mocked(prisma.exam.count).mockResolvedValue(0);
      vi.mocked(prisma.subject.delete).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.subject.delete>>,
      );

      const formData = new FormData();
      formData.append("id", "sub-aman");

      const hasil = await deleteSubject(formData);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Mata pelajaran berhasil dihapus!");
      expect(prisma.subject.delete).toHaveBeenCalledWith({
        where: { id: "sub-aman" },
      });
    });
  });
});
