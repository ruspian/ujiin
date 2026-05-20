import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { updateAttemptScore } from "@/actions/koreksi";
import { UpdateCorrectionParams } from "@/types/attempt";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    attempt: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Pengujian Server Action - Koreksi Nilai Guru", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  type JawabanSah = UpdateCorrectionParams["updatedAnswers"][string];

  const mockParams: UpdateCorrectionParams = {
    attemptId: "att-siswa-01",
    examId: "exam-framer-motion",
    updatedAnswers: {
      // Kita penuhi properti wajibnya (score) dan biarkan TypeScript melakukan autocomplete
      "q-soal1": { score: 20 } as JawabanSah,
      "q-soal2": { score: 0 } as JawabanSah,
      "q-soal3": { score: 50 } as JawabanSah,
    },
  };

  // TES PROTEKSI GERBANG ROLE GURU

  describe("Proteksi Autentikasi & Otorisasi", () => {
    test("Harus gagal jika pengguna yang masuk bukan ber-role GURU", async () => {
      // Kita setel session-nya login sebagai ADMIN
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "admin-pian", role: "ADMIN" },
        expires: "valid",
      });

      const hasil = await updateAttemptScore(mockParams);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Akses ditolak!");
      expect(prisma.attempt.update).not.toHaveBeenCalled();
    });
  });

  // TES LOGIKA UTAMA KOREKSI NILAI

  describe("Proses Update Nilai", () => {
    beforeEach(() => {
      // Setel default session login sebagai GURU yang sah untuk sub-blok ini
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "guru-rpl", role: "GURU", name: "Pak Eko" },
        expires: "valid",
      });
    });

    test("Harus sukses menghitung total skor akumulatif dan memperbarui data di database", async () => {
      vi.mocked(prisma.attempt.update).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.attempt.update>>,
      );

      const hasil = await updateAttemptScore(mockParams);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Nilai berhasil diperbarui!");

      expect(prisma.attempt.update).toHaveBeenCalledWith({
        where: { id: "att-siswa-01" },
        data: {
          answers: mockParams.updatedAnswers,
          score: 70,
        },
      });

      expect(revalidatePath).toHaveBeenCalledWith(
        "/guru/koreksi/exam-framer-motion",
      );
      expect(revalidatePath).toHaveBeenCalledWith(
        "/guru/koreksi/exam-framer-motion/att-siswa-01",
      );
      expect(revalidatePath).toHaveBeenCalledTimes(2);
    });

    test("Harus mengembalikan pesan kesalahan jika query ke database mengalami kegagalan", async () => {
      vi.mocked(prisma.attempt.update).mockRejectedValue(
        new Error("Database Timeout"),
      );

      const hasil = await updateAttemptScore(mockParams);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toBe("Terjadi kesalahan saat menyimpan nilai.");
    });
  });
});
