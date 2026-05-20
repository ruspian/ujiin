import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getSchoolProfile, updateSchoolProfile } from "@/actions/school";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    schoolProfile: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Pengujian Server Action - Profil Sekolah (School Profile)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  type MockSchoolProfileFind = Awaited<
    ReturnType<typeof prisma.schoolProfile.findFirst>
  >;

  // Helper data profil tiruan yang sah sesuai tipe data Prisma
  const createMockProfile = () => ({
    id: "1",
    name: "SMK Negeri 1 Gorontalo",
    npsn: "40301234",
    address: "Jl. Pendidikan No. 1",
    phone: "0435123456",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // TES AMBIL DATA PROFIL

  describe("getSchoolProfile", () => {
    test("Harus sukses mengambil data profil sekolah dari database jika ada", async () => {
      const mockProfile = createMockProfile();
      vi.mocked(prisma.schoolProfile.findFirst).mockResolvedValue(
        mockProfile as MockSchoolProfileFind,
      );

      const hasil = await getSchoolProfile();

      expect(hasil).toEqual({
        success: true,
        message: "Profil sekolah berhasil diambil!",
        data: mockProfile,
      });
    });

    test("Harus mengembalikan respon kegagalan jika query ke database bermasalah", async () => {
      vi.mocked(prisma.schoolProfile.findFirst).mockRejectedValue(
        new Error("Database Terkunci"),
      );

      const hasil = await getSchoolProfile();

      expect(hasil).toEqual({
        success: false,
        message: "Kesalahan pada server!",
        data: null,
      });
    });
  });

  // TES PERBARUI DATA PROFIL (UPSERT ENGINE)

  describe("updateSchoolProfile", () => {
    test("Harus menolak pembaruan data jika pengguna bukan ber-role ADMIN", async () => {
      // Login sebagai GURU (Harus ditolak karena syaratnya wajib ADMIN)
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "guru-1", role: "GURU" },
        expires: "valid",
      });

      const mockFormData = new FormData();
      const hasil = await updateSchoolProfile(mockFormData);

      expect(hasil).toEqual({ success: false, message: "Akses ditolak!" });
      expect(prisma.schoolProfile.upsert).not.toHaveBeenCalled();
    });

    test("Harus sukses melakukan operasi upsert dengan ID '1' jika data valid dan diinput oleh ADMIN", async () => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });

      vi.mocked(prisma.schoolProfile.upsert).mockResolvedValue(
        {} as unknown as Awaited<
          ReturnType<typeof prisma.schoolProfile.upsert>
        >,
      );

      // Susun data input baru lewat FormData
      const mockFormData = new FormData();
      mockFormData.append("name", "SMK Negeri 2 Gorontalo");
      mockFormData.append("npsn", "40309999");
      mockFormData.append("address", "Jl. Kebangsaan No. 2");
      mockFormData.append("phone", "0435888888");

      const hasil = await updateSchoolProfile(mockFormData);

      expect(hasil).toEqual({
        success: true,
        message: "Profil Sekolah berhasil diperbarui!",
      });

      // Verifikasi penguncian ID tunggal '1' pada mekanisme upsert Prisma
      expect(prisma.schoolProfile.upsert).toHaveBeenCalledWith({
        where: { id: "1" },
        update: {
          name: "SMK Negeri 2 Gorontalo",
          npsn: "40309999",
          address: "Jl. Kebangsaan No. 2",
          phone: "0435888888",
        },
        create: {
          id: "1",
          name: "SMK Negeri 2 Gorontalo",
          npsn: "40309999",
          address: "Jl. Kebangsaan No. 2",
          phone: "0435888888",
        },
      });

      // Pastikan cache halaman pengaturan langsung di-refresh real-time
      expect(revalidatePath).toHaveBeenCalledWith("/admin/pengaturan");
    });
  });
});
