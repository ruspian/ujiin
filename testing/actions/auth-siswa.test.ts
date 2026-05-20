import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcryptjs from "bcryptjs";
import { loginSiswaAction, logoutSiswaAction } from "@/actions/auth-siswa";
import { Student } from "@prisma/client";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("bcryptjs", () => {
  const mockCompare = vi.fn();
  return {
    compare: mockCompare,
    default: {
      compare: mockCompare,
    },
  };
});

describe("Pengujian Server Action - Autentikasi Siswa", () => {
  const mockCookieSet = vi.fn();
  const mockCookieDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(cookies).mockImplementation(() => {
      return {
        set: mockCookieSet,
        delete: mockCookieDelete,
      } as unknown as ReturnType<typeof cookies>;
    });
  });

  const createMockStudent = (overrides: Partial<Student>): Student => {
    return {
      id: "std-123",
      nisn: "0012345678",
      name: "Budi Santoso",
      password: "$2a$10$hashedpasswordjwt",
      classId: "class-rpl",
      religionId: null,
      session: null,
      room: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  };

  // TES UNTUK LOGIN SISWA

  describe("loginSiswaAction", () => {
    test("Harus gagal jika NISN tidak terdaftar di database", async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue(null);

      const hasil = await loginSiswaAction("99999999", "password123");

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("NISN tidak terdaftar!");
    });

    test("Harus gagal jika akun siswa belum aktif (password masih kosong di DB)", async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue(
        createMockStudent({ password: null }),
      );

      const hasil = await loginSiswaAction("0012345678", "password123");

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Akun belum aktif. Hubungi Admin!");
    });

    test("Harus gagal jika password yang diinput salah/tidak cocok", async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue(
        createMockStudent({}),
      );

      (vi.mocked(bcryptjs.compare) as Mock).mockResolvedValue(false);

      const hasil = await loginSiswaAction("0012345678", "passwordSalah");
      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("NISN atau Password salah!");
    });

    test("Harus sukses jika NISN dan password benar, serta berhasil menyimpan cookie", async () => {
      const mockStudent = createMockStudent({});
      vi.mocked(prisma.student.findUnique).mockResolvedValue(mockStudent);

      (vi.mocked(bcryptjs.compare) as Mock).mockResolvedValue(true);

      const hasil = await loginSiswaAction("0012345678", "passwordBenar");
      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Login berhasil! Mengalihkan...");

      expect(mockCookieSet).toHaveBeenCalledWith(
        "student_id",
        mockStudent.id,
        expect.objectContaining({
          httpOnly: true,
          path: "/",
        }),
      );
    });
  });

  // TES UNTUK LOGOUT SISWA
  describe("logoutSiswaAction", () => {
    test("Harus berhasil menghapus cookie student_id saat logout", async () => {
      const hasil = await logoutSiswaAction();

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Berhasil keluar");

      expect(mockCookieDelete).toHaveBeenCalledWith("student_id");
    });
  });
});
