import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { getCloudinarySignature } from "@/actions/cloudinary"; // Sesuaikan dengan path file asli lu

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// MOCKING MODUL CRYPTO BAWAAN NODE.JS

vi.mock("crypto", () => {
  const mockUpdate = vi.fn().mockReturnThis(); // Agar method chaining .update().digest() bekerja
  const mockDigest = vi.fn().mockReturnValue("mocked-sha1-signature");

  return {
    default: {
      createHash: vi.fn().mockImplementation(() => ({
        update: mockUpdate,
        digest: mockDigest,
      })),
    },
    // Sediakan juga untuk named export jika dipanggil tanpa default
    createHash: vi.fn().mockImplementation(() => ({
      update: mockUpdate,
      digest: mockDigest,
    })),
  };
});

describe("Pengujian Server Action - Cloudinary Signature", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "guru-1", role: "GURU" },
    } as never);
    // Salin env asli agar manipulasi variabel env tidak merusak test file lain
    process.env = { ...ORIGINAL_ENV };

    // 🔥 BEKUKAN WAKTU: Setel waktu tetap ke Jam 12 Siang Wita biar timestamp selalu konsisten "1774008000"
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T12:00:00+08:00"));
  });

  afterEach(() => {
    // Kembalikan waktu asli setelah tes selesai
    vi.useRealTimers();
    process.env = ORIGINAL_ENV;
  });

  // KONTROL AKSES

  test("Harus menolak permintaan tanpa login atau dengan role yang tidak berhak", async () => {
    process.env.CLOUDINARY_API_SECRET = "fake-test-value";
    for (const session of [null, { user: { id: "x", role: "SISWA" } }]) {
      vi.mocked(auth).mockResolvedValue(session as never);
      await expect(getCloudinarySignature()).rejects.toThrow("Akses ditolak!");
    }
  });

  // SKENARIO 1: ERROR VARIABEL ENV KOSONG

  test("Harus melempar Error jika CLOUDINARY_API_SECRET tidak terdefinisi di env", async () => {
    delete process.env.CLOUDINARY_API_SECRET;

    // Cara ngetes fungsi yang melempar Error (throw) adalah dengan membungkusnya di arrow function
    await expect(getCloudinarySignature()).rejects.toThrow(
      "CLOUDINARY_API_SECRET belum di-setting",
    );
  });

  // SUKSES GENERATE SIGNATURE

  test("Harus sukses membuat signature dengan format SHA-1 dan mengembalikan data payload yang lengkap", async () => {
    // Setel variabel env tiruan untuk kebutuhan testing
    process.env.CLOUDINARY_API_SECRET = "fake-test-value";
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY = "key-xyz";
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "ujiin-cloud";

    const hasil = await getCloudinarySignature();

    // Kalkulasi timestamp buatan dari waktu yang kita bekukan tadi (2026-03-20 T12:00:00 WITA -> epoch seconds)
    const expectedTimestamp = Math.round(
      new Date("2026-03-20T12:00:00+08:00").getTime() / 1000,
    ).toString();

    // Verifikasi output data sesuai kontrak CloudinarySignature
    expect(hasil).toEqual({
      timestamp: expectedTimestamp,
      signature: "mocked-sha1-signature", // Diambil dari hasil mock crypto di atas
      apiKey: "key-xyz",
      cloudName: "ujiin-cloud",
      folder: "ujiin",
    });

    // Verifikasi rumus string signature yang di-hash beneran menggunakan formula yang sah
    const expectedSignatureString = `folder=ujiin&timestamp=${expectedTimestamp}fake-test-value`;

    // Ambil instance mock crypto untuk memastikan update() menerima string string yang tepat
    const spyHash = crypto.createHash("sha1");
    expect(spyHash.update).toHaveBeenCalledWith(expectedSignatureString);
  });
});
