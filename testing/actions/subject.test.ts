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
    $transaction: vi.fn(),
  },
}));

// Objek transaksi yang dipakai di dalam prisma.$transaction
const tx = {
  subject: { create: vi.fn(), update: vi.fn() },
  subjectAssignment: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
};

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
    vi.mocked(prisma.$transaction).mockImplementation((async (
      fn: (t: typeof tx) => Promise<unknown>,
    ) => fn(tx)) as never);
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
    formData.append(
      "assignments",
      JSON.stringify([
        { classId: "class-rpl1", teacherId: "guru-pian" },
        { classId: "class-rpl2", teacherId: "guru-zaki" },
      ]),
    );
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

    test("Harus gagal jika data nama/plot guru tidak lengkap", async () => {
      const fd = new FormData();
      fd.append("name", "Mapel");
      const hasil = await createSubject(fd);
      expect(hasil.success).toBe(false);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    test("Mapel yang sudah ada (case-insensitive) dipakai ulang, tidak dibuat ganda", async () => {
      vi.mocked(prisma.subject.findFirst).mockResolvedValue({
        id: "sub-old",
        name: "PEMROGRAMAN WEB NEXT.JS",
      } as unknown as MockSubjectFindFirst);

      const hasil = await createSubject(
        createMockFormData({ name: "  pemrograman web next.js  " }),
      );

      expect(hasil.success).toBe(true);
      expect(tx.subject.create).not.toHaveBeenCalled();
      expect(tx.subjectAssignment.upsert).toHaveBeenCalledTimes(2);
      expect(tx.subjectAssignment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: {
            subjectId: "sub-old",
            classId: "class-rpl1",
            teacherId: "guru-pian",
          },
        }),
      );
    });

    test("Harus sukses membuat mapel baru beserta plot guru per kelas", async () => {
      vi.mocked(prisma.subject.findFirst).mockResolvedValue(null);
      tx.subject.create.mockResolvedValue({ id: "sub-baru" });

      const hasil = await createSubject(
        createMockFormData({ name: "Dasar Desain Grafis" }),
      );

      expect(hasil).toEqual({
        success: true,
        message: "Mata pelajaran & jadwal berhasil disimpan!",
      });
      expect(tx.subject.create).toHaveBeenCalledWith({
        data: { name: "Dasar Desain Grafis", religionId: "rel-umum" },
      });
      expect(tx.subjectAssignment.upsert).toHaveBeenCalledWith({
        where: {
          subjectId_classId: { subjectId: "sub-baru", classId: "class-rpl2" },
        },
        update: { teacherId: "guru-zaki" },
        create: {
          subjectId: "sub-baru",
          classId: "class-rpl2",
          teacherId: "guru-zaki",
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

    test("Harus gagal jika nama dipakai mapel lain", async () => {
      vi.mocked(prisma.subject.findFirst).mockResolvedValue({
        id: "sub-lain",
      } as unknown as MockSubjectFindFirst);
      const hasil = await updateSubject(
        createMockFormData({ id: "sub-123", name: "Sama" }),
      );
      expect(hasil).toEqual({
        success: false,
        message: "Nama mata pelajaran sudah dipakai!",
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    test("Harus sukses memperbarui mapel dan mengganti seluruh plot guru-kelas", async () => {
      vi.mocked(prisma.subject.findFirst).mockResolvedValue(null);

      const hasil = await updateSubject(
        createMockFormData({
          id: "sub-123",
          name: "Pemrograman Berorientasi Objek",
        }),
      );

      expect(hasil).toEqual({
        success: true,
        message: "Mata pelajaran berhasil diperbarui!",
      });
      expect(tx.subject.update).toHaveBeenCalledWith({
        where: { id: "sub-123" },
        data: {
          name: "Pemrograman Berorientasi Objek",
          religionId: "rel-umum",
        },
      });
      expect(tx.subjectAssignment.deleteMany).toHaveBeenCalledWith({
        where: { subjectId: "sub-123" },
      });
      expect(tx.subjectAssignment.createMany).toHaveBeenCalledWith({
        data: [
          { subjectId: "sub-123", classId: "class-rpl1", teacherId: "guru-pian" },
          { subjectId: "sub-123", classId: "class-rpl2", teacherId: "guru-zaki" },
        ],
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

    test("Harus gagal (tanpa melempar) jika database menolak penghapusan", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(prisma.subject.delete).mockRejectedValue(new Error("FK"));

      const hasil = await deleteSubject("sub-terikat");

      expect(hasil).toEqual({
        success: false,
        message: "Gagal menghapus mata pelajaran!",
      });
    });

    test("Harus sukses menghapus mapel", async () => {
      vi.mocked(prisma.subject.delete).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.subject.delete>>,
      );

      const hasil = await deleteSubject("sub-aman");

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Mata pelajaran berhasil dihapus!");
      expect(prisma.subject.delete).toHaveBeenCalledWith({
        where: { id: "sub-aman" },
      });
    });
  });
});
