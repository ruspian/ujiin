import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { createFirstAdmin } from "@/actions/setup";

//  MOCKING SEMUA DEPENDENSI EKSTERNAL

const db = vi.hoisted(() => {
  const user = { findFirst: vi.fn(), create: vi.fn() };
  return {
    user,
    // transaksi tiruan: tx memakai mock yang sama + kunci advisory
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) =>
      cb({ user, $executeRaw: vi.fn() }),
    ),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: db }));

// Mock bcryptjs agar ramah default import dan return value-nya bisa dikontrol
vi.mock("bcryptjs", () => {
  const mockHash = vi.fn();
  return {
    hash: mockHash,
    default: {
      hash: mockHash,
    },
  };
});

describe("Pengujian Server Action - Initial Setup Wizard (First Admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  type MockUserFindFirst = Awaited<ReturnType<typeof prisma.user.findFirst>>;

  // Helper untuk menyuplai FormData registrasi admin baru
  const createMockFormData = () => {
    const formData = new FormData();
    formData.append("name", "Kepala Dusun Tech");
    formData.append("username", "superadmin");
    formData.append("password", "passwordRahasia123");
    return formData;
  };

  // SKENARIO 1: ADMIN SUDAH ADA (IDEMPOTENT)

  test("Harus langsung return sukses jika di database sudah terdaftar user ber-role ADMIN", async () => {
    // Pura-pura database mendeteksi sudah ada satu admin terdaftar
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "usr-admin-lama",
      role: "ADMIN",
    } as unknown as MockUserFindFirst);

    const mockFormData = createMockFormData();
    const hasil = await createFirstAdmin(mockFormData);

    expect(hasil).toEqual({ success: true, message: "Admin sudah ada!" });

    // Proteksi Keamanan: Pastikan bcrypt hash dan prisma create TIDAK BOLEH dipanggil!
    expect(bcryptjs.hash).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  // SKENARIO 2: DATABASE KOSONG & SUKSES REGISTER

  test("Harus sukses melakukan hashing password dan membuat user ADMIN pertama jika database kosong", async () => {
    // Pura-pura tidak ada admin sama sekali di DB (null)
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    // Setel hasil tiruan enkripsi password
    (vi.mocked(bcryptjs.hash) as Mock).mockResolvedValue(
      "$2a$10$mockedhashedsetup",
    );

    vi.mocked(prisma.user.create).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof prisma.user.create>>,
    );

    const mockFormData = createMockFormData();
    const hasil = await createFirstAdmin(mockFormData);

    expect(hasil).toEqual({ success: true });

    // Verifikasi proses enkripsi password berjalan tertib
    expect(bcryptjs.hash).toHaveBeenCalledWith("passwordRahasia123", 10);

    // Verifikasi pembuatan record ke Prisma dengan data payload yang tepat
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: "Kepala Dusun Tech",
        username: "superadmin",
        password: "$2a$10$mockedhashedsetup",
        role: "ADMIN",
      },
    });
  });

  // SKENARIO 3: VALIDATION ERROR (ZOD)

  test("Harus gagal jika data yang dikirimkan tidak lolos skema validasi", async () => {
    const mockFormDataCacat = createMockFormData();
    mockFormDataCacat.set("password", ""); // Kosongkan password agar memicu error Zod

    const hasil = await createFirstAdmin(mockFormDataCacat);

    expect(hasil.success).toBe(false);
    expect(hasil.message).toBeDefined(); // Memastikan ada pesan error terlempar dari Zod
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  // SKENARIO 4: BALAPAN (dua permintaan bersamaan)

  test("Bila admin dibuat permintaan lain tepat sebelum transaksi, tidak membuat admin kedua", async () => {
    // cek cepat: belum ada -> lolos; di dalam transaksi (di bawah kunci): sudah ada
    vi.mocked(prisma.user.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "usr-admin-lain",
        role: "ADMIN",
      } as unknown as MockUserFindFirst);
    (vi.mocked(bcryptjs.hash) as Mock).mockResolvedValue("$2a$10$x");

    const hasil = await createFirstAdmin(createMockFormData());

    expect(hasil).toEqual({ success: true, message: "Admin sudah ada!" });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test("Username disimpan huruf kecil tanpa spasi di tepi", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    (vi.mocked(bcryptjs.hash) as Mock).mockResolvedValue("$2a$10$x");
    const fd = createMockFormData();
    fd.set("username", "  SuperAdmin ");

    await createFirstAdmin(fd);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ username: "superadmin" }),
    });
  });
});
