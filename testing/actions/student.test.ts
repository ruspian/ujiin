import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import {
  createStudent,
  deleteStudent,
  importStudents,
  randomizeSessions,
  prepareExamCards,
} from "@/actions/student";
import { Student } from "@prisma/client";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    class: {
      findMany: vi.fn(),
    },
    attempt: {
      count: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

vi.mock("bcryptjs", () => {
  const mockHash = vi.fn();
  return {
    hash: mockHash,
    default: { hash: mockHash },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Pengujian Server Action - Manajemen Data Siswa & Sesi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  type MockStudentFindUnique = Awaited<
    ReturnType<typeof prisma.student.findUnique>
  >;
  type MockStudentFindMany = Awaited<
    ReturnType<typeof prisma.student.findMany>
  >;
  type MockClassFindMany = Awaited<ReturnType<typeof prisma.class.findMany>>;
  type MockStudentUpdate = Awaited<ReturnType<typeof prisma.student.update>>;

  const createMockStudent = (overrides: Partial<Student>): Student => {
    return {
      id: "std-123",
      nisn: "0012345678",
      name: "Budi Santoso",
      password: null,
      classId: "class-rpl1",
      religionId: "rel-1",
      session: null,
      room: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  };

  // TES CREATE STUDENT

  describe("createStudent", () => {
    test("Harus gagal jika NISN siswa sudah terdaftar di sistem", async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue(
        createMockStudent({ nisn: "0012345678" }) as MockStudentFindUnique,
      );

      const mockFormData = new FormData();
      mockFormData.append("nisn", "0012345678");
      mockFormData.append("name", "Budi Santoso");
      mockFormData.append("classId", "class-rpl1");
      // 🔥 SOLUSI ERROR 1: Tambahkan religionId agar lulus sensor Zod schema bawaan lu!
      mockFormData.append("religionId", "rel-1");

      const hasil = await createStudent(mockFormData);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("NISN sudah terdaftar!");
      expect(prisma.student.create).not.toHaveBeenCalled();
    });
  });

  // TES DELETE STUDENT LOCK

  describe("deleteStudent", () => {
    test("Harus gagal menghapus jika siswa sudah memiliki riwayat pengerjaan ujian (Attempt)", async () => {
      vi.mocked(prisma.attempt.count).mockResolvedValue(2);

      const hasil = await deleteStudent("std-123");

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain(
        "Gagal! Siswa ini sudah memiliki riwayat ujian.",
      );
      expect(prisma.student.delete).not.toHaveBeenCalled();
    });
  });

  // TES EXCEL IMPORT SISWA (MAP & SET VALIDATION)

  describe("importStudents (Excel Parser Engine)", () => {
    test("Harus sukses menyortir baris data valid dan mengabaikan NISN duplikat atau kelas gaib", async () => {
      vi.mocked(prisma.class.findMany).mockResolvedValue([
        { id: "class-rpl1", name: "XII RPL 1" },
      ] as MockClassFindMany);

      vi.mocked(prisma.student.findMany).mockResolvedValue([
        { nisn: "9999999999" },
      ] as unknown as MockStudentFindMany);

      const mockExcelInput = [
        { nisn: "0011223344", name: "Rian", className: "XII RPL 1" },
        { nisn: "9999999999", name: "Duplikat DB", className: "XII RPL 1" },
        { nisn: "0011223344", name: "Duplikat File", className: "XII RPL 1" },
        { nisn: "0055667788", name: "Zaki", className: "X TKJ 2" },
      ];

      vi.mocked(prisma.student.createMany).mockResolvedValue({ count: 1 });

      const hasil = await importStudents(mockExcelInput);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toContain(
        "Berhasil import 1 siswa. Gagal memproses 3 baris.",
      );

      expect(hasil.errors).toContain(
        "Baris 3: NISN 9999999999 sudah terdaftar",
      );
      expect(hasil.errors).toContain(
        "Baris 5: Kelas 'X TKJ 2' tidak ditemukan",
      );

      expect(prisma.student.createMany).toHaveBeenCalledWith({
        data: [{ nisn: "0011223344", name: "Rian", classId: "class-rpl1" }],
        skipDuplicates: true,
      });
    });
  });

  // TES PENGOCOKAN SESI & TRANSACTION ENGINE

  describe("randomizeSessions (Transaction Modulo)", () => {
    test("Harus sukses membagi rata siswa ke dalam total sesi menggunakan Prisma $transaction", async () => {
      vi.mocked(prisma.student.findMany).mockResolvedValue([
        { id: "s1" },
        { id: "s2" },
        { id: "s3" },
        { id: "s4" },
      ] as unknown as MockStudentFindMany);

      vi.mocked(prisma.student.update).mockResolvedValue(
        {} as unknown as MockStudentUpdate,
      );

      const mockFormData = new FormData();
      mockFormData.append("classId", "class-rpl1");
      mockFormData.append("totalSessions", "2");
      mockFormData.append("room", "Lab Komputer 1");

      await randomizeSessions(mockFormData);

      expect(prisma.$transaction).toHaveBeenCalled();

      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: expect.any(String) },
          data: expect.objectContaining({
            room: "Lab Komputer 1",
            session: expect.stringMatching(/^Sesi [1-2]$/),
          }),
        }),
      );
    });
  });

  // TES GENERATOR PIN KARTU UJIAN

  describe("prepareExamCards (PIN Card Generator)", () => {
    test("Harus sukses men-generate PIN acak 6 digit dan meng-hashing-nya untuk setiap siswa", async () => {
      vi.mocked(prisma.student.findMany).mockResolvedValue([
        {
          id: "std-pian",
          name: "Pian",
          nisn: "001",
          session: "Sesi 1",
          room: "Lab 1",
          class: { name: "XII RPL 1" },
        },
      ] as unknown as MockStudentFindMany);

      (vi.mocked(bcryptjs.hash) as Mock).mockResolvedValue(
        "$2a$10$hashedpinbaruwow",
      );
      vi.mocked(prisma.student.update).mockResolvedValue(
        {} as unknown as MockStudentUpdate,
      );

      const hasil = await prepareExamCards("class-rpl1");

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe(
        "Kartu ujian berhasil disiapkan dengan PIN baru!",
      );

      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: "std-pian" },
        data: { password: "$2a$10$hashedpinbaruwow" },
      });

      expect(hasil.data?.[0]).toEqual(
        expect.objectContaining({
          name: "Pian",
          className: "XII RPL 1",
          password: expect.stringMatching(/^[A-Za-z0-9]{6}$/),
        }),
      );
    });
  });
});
