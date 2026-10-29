import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcryptjs from "bcryptjs";
import { revalidatePath } from "next/cache";
import {
  createUser,
  updateUser,
  deleteUser,
  importUsersBulk,
} from "@/actions/user";
import { Prisma, User } from "@prisma/client";
import { ImportUserData } from "@/types/user.admin";

const sandiUji = (n: string) => `uji-sandi-${n}`; // data palsu khusus tes

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
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

describe("Pengujian Server Action - Manajemen Pengguna (User Management)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  type MockUserFindUnique = Awaited<ReturnType<typeof prisma.user.findUnique>>;
  type MockUserDelete = Awaited<ReturnType<typeof prisma.user.delete>>;

  const createMockUser = (overrides: Partial<User>): User => {
    return {
      id: "usr-123",
      name: "Pak Guru Eko",
      username: "ekoguru",
      password: "$2a$10$hashedoldpassword",
      role: "GURU",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  };

  const createMockFormData = (overrides?: Record<string, string>) => {
    const formData = new FormData();
    formData.append("name", overrides?.name ?? "Pak Guru Eko");
    formData.append("username", overrides?.username ?? "ekoguru");
    formData.append("password", overrides?.password ?? "passwordSah123");
    formData.append("role", overrides?.role ?? "GURU");
    if (overrides?.id) formData.append("id", overrides.id);
    return formData;
  };

  // TES CREATE USER & PRISMA ERROR HANDLING

  describe("createUser", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });
    });

    test("Harus gagal jika username sudah terdaftar di database", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(
        createMockUser({ username: "ekoguru" }) as MockUserFindUnique,
      );

      const mockFormData = createMockFormData();
      const hasil = await createUser(mockFormData);

      expect(hasil).toEqual({
        success: false,
        message: "Username/NIP sudah terdaftar!",
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    test("Username dicek tanpa beda huruf besar/kecil dan disimpan huruf kecil", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      (vi.mocked(bcryptjs.hash) as Mock).mockResolvedValue("$2a$10$hashed");
      vi.mocked(prisma.user.create).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.user.create>>,
      );

      const hasil = await createUser(
        createMockFormData({ username: "  EkoGuru " }),
      );

      expect(hasil.success).toBe(true);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: { equals: "ekoguru", mode: "insensitive" } },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ username: "ekoguru" }),
      });
    });

    test("Harus menangkap error P2002 dari Prisma jika terjadi balapan data (race condition)", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      (vi.mocked(bcryptjs.hash) as Mock).mockResolvedValue("$2a$10$hashed");

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "5.0.0",
        },
      );
      vi.mocked(prisma.user.create).mockRejectedValue(prismaError);

      const mockFormData = createMockFormData();
      const hasil = await createUser(mockFormData);

      expect(hasil).toEqual({
        success: false,
        message: "Username sudah terdaftar!",
      });
    });
  });

  // TES UPDATE USER (CONDITIONAL PASSWORD)

  describe("updateUser", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });
    });

    test("Harus menolak menurunkan role admin TERAKHIR", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: "ADMIN",
      } as unknown as MockUserFindUnique);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const hasil = await updateUser(
        createMockFormData({ id: "usr-admin", role: "GURU", password: "" }),
      );

      expect(hasil).toEqual({
        success: false,
        message: "Tidak bisa menurunkan role admin terakhir!",
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    test("Boleh menurunkan role admin bila masih ada admin lain", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: "ADMIN",
      } as unknown as MockUserFindUnique);
      vi.mocked(prisma.user.count).mockResolvedValue(2);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.update).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.user.update>>,
      );

      const hasil = await updateUser(
        createMockFormData({ id: "usr-admin", role: "GURU", password: "" }),
      );

      expect(hasil.success).toBe(true);
    });

    test("Harus memperbarui data tanpa mengubah password jika input password kosong", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: "GURU",
      } as unknown as MockUserFindUnique);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.update).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.user.update>>,
      );

      const mockFormData = createMockFormData({ id: "usr-123", password: "" });
      const hasil = await updateUser(mockFormData);

      expect(hasil.success).toBe(true);

      expect(bcryptjs.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "usr-123" },
        data: {
          name: "Pak Guru Eko",
          username: "ekoguru",
          role: "GURU",
        },
      });
    });
  });

  // TES UNTUK DELETE USER

  describe("deleteUser", () => {
    test("Harus menolak penghapusan jika role pengguna bukan ADMIN", async () => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "guru-biasa", role: "GURU" },
        expires: "valid",
      });

      const hasil = await deleteUser("usr-target");

      expect(hasil).toEqual({ success: false, message: "Akses ditolak!" });
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    test("Harus sukses menghapus data pengguna jika dieksekusi oleh ADMIN", async () => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: "GURU",
      } as unknown as MockUserFindUnique);
      vi.mocked(prisma.user.delete).mockResolvedValue(
        {} as unknown as MockUserDelete,
      );

      const hasil = await deleteUser("usr-dipecat");

      expect(hasil).toEqual({
        success: true,
        message: "Pengguna berhasil dihapus!",
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: "usr-dipecat" },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/admin/pengguna");
    });
  });

  describe("deleteUser - pengaman", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });
    });

    test("Tidak boleh menghapus akun yang sedang dipakai sendiri", async () => {
      const hasil = await deleteUser("admin-pian");

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain("sedang Anda pakai");
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    test("Tidak boleh menghapus admin terakhir", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: "ADMIN",
      } as unknown as MockUserFindUnique);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const hasil = await deleteUser("usr-admin-lain");

      expect(hasil).toEqual({
        success: false,
        message: "Tidak bisa menghapus admin terakhir!",
      });
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    test("Pengguna yang masih dipakai data lain (P2003) mendapat pesan yang jelas", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        role: "GURU",
      } as unknown as MockUserFindUnique);
      vi.mocked(prisma.user.delete).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("fk", {
          code: "P2003",
          clientVersion: "5.0.0",
        }),
      );

      const hasil = await deleteUser("usr-guru");

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain("masih dipakai data lain");
    });
  });

  // TES BULK IMPORT USER (SEQUENTIAL LOOP)

  describe("importUsersBulk", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });
    });

    test("Harus sukses memproses baris data unik dan melewati username yang sudah kembar di DB", async () => {
      vi.mocked(prisma.user.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          createMockUser({ username: "guru-bentrok" }) as MockUserFindUnique,
        );

      (vi.mocked(bcryptjs.hash) as Mock).mockResolvedValue("$2a$10$hashedbulk");
      vi.mocked(prisma.user.create).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.user.create>>,
      );

      const mockImportData: ImportUserData[] = [
        {
          name: "Guru Baru",
          username: "gurubaru",
          password: sandiUji("b"),
          role: "GURU",
        },
        {
          name: "Guru Bentrok",
          username: "guru-bentrok",
          password: sandiUji("b"),
          role: "GURU",
        },
      ];

      const hasil = await importUsersBulk(mockImportData);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toContain("Import selesai! 1 berhasil, 1 dilewati");

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(revalidatePath).toHaveBeenCalledWith("/admin/pengguna");
    });

    test("Baris dengan username/password terlalu pendek dilewati, tidak membuat akun lemah", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      (vi.mocked(bcryptjs.hash) as Mock).mockResolvedValue("$2a$10$h");
      vi.mocked(prisma.user.create).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.user.create>>,
      );

      const hasil = await importUsersBulk([
        { name: "A", username: "abc", password: sandiUji("b"), role: "GURU" },
        { name: "B", username: "gurubaru", password: sandiUji("c").slice(0, 2), role: "GURU" },
        { name: "C", username: "gurubagus", password: sandiUji("b"), role: "GURU" },
      ] as ImportUserData[]);

      expect(hasil.message).toContain("1 berhasil, 2 dilewati");
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    test("Import lebih dari 500 baris ditolak", async () => {
      const banyak = Array.from({ length: 501 }, (_, i) => ({
        name: `G${i}`,
        username: `guru${i}xx`,
        password: sandiUji("b"),
        role: "GURU",
      })) as ImportUserData[];

      const hasil = await importUsersBulk(banyak);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain("Maksimal 500");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });
});
