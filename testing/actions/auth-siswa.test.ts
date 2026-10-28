import { describe, test, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcryptjs from "bcryptjs";
import { loginSiswaAction, logoutSiswaAction } from "@/actions/auth-siswa";
import { isRateLimited, recordFailure, resetRateLimit } from "@/lib/rate-limit";
import { STUDENT_COOKIE, verifyStudentSession } from "@/lib/student-session";
import { Student } from "@prisma/client";

const sandiUji = (n: string) => `uji-sandi-${n}`; // data palsu khusus tes

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
  headers: vi.fn(async () => ({
    get: (name: string) => (name === "x-forwarded-for" ? "10.0.0.7" : null),
  })),
}));

vi.mock("bcryptjs", () => {
  const mockCompare = vi.fn();
  return {
    compare: mockCompare,
    default: { compare: mockCompare },
  };
});

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  isRateLimited: vi.fn(),
  recordFailure: vi.fn(),
  resetRateLimit: vi.fn(),
}));

const GENERIC = "NISN atau Password salah!";

describe("Pengujian Server Action - Autentikasi Siswa", () => {
  const mockCookieSet = vi.fn();
  const mockCookieDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRateLimited).mockResolvedValue(false);
    vi.mocked(cookies).mockImplementation(() => {
      return {
        set: mockCookieSet,
        delete: mockCookieDelete,
      } as unknown as ReturnType<typeof cookies>;
    });
  });

  const createMockStudent = (overrides: Partial<Student> = {}): Student => ({
    id: "std-123",
    nisn: "0012345678",
    name: "Budi Santoso",
    password: sandiUji("hash"),
    classId: "class-rpl",
    religionId: null,
    session: null,
    room: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe("loginSiswaAction", () => {
    test("NISN tidak terdaftar: pesan generik, tetap menjalankan bcrypt (anti timing), dan dicatat sebagai gagal", async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue(null);
      vi.mocked(bcryptjs.compare).mockResolvedValue(false as never);

      const hasil = await loginSiswaAction("9999999999", "apasaja");

      expect(hasil).toEqual({ success: false, message: GENERIC });
      expect(bcryptjs.compare).toHaveBeenCalledTimes(1);
      expect(recordFailure).toHaveBeenCalled();
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    test("Password salah: pesan sama dengan NISN tidak terdaftar (tidak membocorkan NISN valid)", async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue(createMockStudent());
      vi.mocked(bcryptjs.compare).mockResolvedValue(false as never);

      const hasil = await loginSiswaAction("0012345678", sandiUji("salah"));

      expect(hasil).toEqual({ success: false, message: GENERIC });
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    test("Akun belum punya sandi, diminta menghubungi admin", async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue(
        createMockStudent({ password: null }),
      );
      vi.mocked(bcryptjs.compare).mockResolvedValue(false as never);

      const hasil = await loginSiswaAction("0012345678", "x");

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Akun belum aktif. Hubungi Admin!");
    });

    test("Password benar tapi akun tidak ACTIVE (lulus/nonaktif): ditolak tanpa cookie", async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue(
        createMockStudent({ status: "GRADUATED" as Student["status"] }),
      );
      vi.mocked(bcryptjs.compare).mockResolvedValue(true as never);

      const hasil = await loginSiswaAction("0012345678", "benar");

      expect(hasil.success).toBe(false);
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    test("Terlalu banyak percobaan gagal: ditolak sebelum menyentuh database", async () => {
      vi.mocked(isRateLimited).mockResolvedValue(true);

      const hasil = await loginSiswaAction("0012345678", "tebak");

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain("Terlalu banyak percobaan");
      expect(prisma.student.findUnique).not.toHaveBeenCalled();
    });

    test("Input tidak wajar (bukan string / terlalu panjang) ditolak", async () => {
      const a = await loginSiswaAction("0012345678", "x".repeat(500));
      const b = await loginSiswaAction("1".repeat(80), "x");
      const c = await loginSiswaAction(undefined as unknown as string, "x");
      for (const r of [a, b, c]) expect(r).toEqual({ success: false, message: GENERIC });
      expect(prisma.student.findUnique).not.toHaveBeenCalled();
    });

    test("Sukses: cookie httpOnly berisi token BERTANDA TANGAN (bukan ID mentah) dan rate limit di-reset", async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue(createMockStudent());
      vi.mocked(bcryptjs.compare).mockResolvedValue(true as never);

      const hasil = await loginSiswaAction("0012345678", "benar");

      expect(hasil.success).toBe(true);
      expect(resetRateLimit).toHaveBeenCalled();

      const [name, value, options] = mockCookieSet.mock.calls[0];
      expect(name).toBe(STUDENT_COOKIE);
      expect(value).not.toBe("std-123"); // bukan ID mentah
      expect(await verifyStudentSession(value)).toBe("std-123");
      expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    });
  });

  describe("logoutSiswaAction", () => {
    test("Harus menghapus cookie sesi siswa", async () => {
      const hasil = await logoutSiswaAction();

      expect(hasil.success).toBe(true);
      expect(mockCookieDelete).toHaveBeenCalledWith(STUDENT_COOKIE);
    });
  });
});
