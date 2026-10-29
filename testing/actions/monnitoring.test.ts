import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { resetSesiSiswa } from "@/actions/monitoring";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    exam: { findUnique: vi.fn() },
    attempt: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const NOW = new Date("2026-10-27T09:00:00Z");

describe("Pengujian Server Action - Reset Sesi Siswa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.mocked(prisma.exam.findUnique).mockResolvedValue({
      supervisorId: "guru-pian",
      authorId: "guru-lain",
    } as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
      startTime: new Date("2026-10-27T08:00:00Z"),
      endTime: new Date("2026-10-27T08:20:00Z"), // dikunci setelah 20 menit
    } as never);
    vi.mocked(prisma.attempt.update).mockResolvedValue({} as never);
  });

  const form = (examId: string | null, studentId: string | null) => {
    const f = new FormData();
    if (examId) f.append("examId", examId);
    if (studentId) f.append("studentId", studentId);
    return f;
  };

  test("menolak role selain ADMIN/GURU", async () => {
    (vi.mocked(auth) as Mock).mockResolvedValue({
      user: { id: "std-budi", role: "STUDENT" },
    });
    await expect(resetSesiSiswa(form("exam-1", "student-1"))).rejects.toThrow(
      "Akses ditolak!",
    );
    expect(prisma.attempt.update).not.toHaveBeenCalled();
  });

  test("guru yang BUKAN pengawas/pembuat ujian tidak bisa mereset", async () => {
    (vi.mocked(auth) as Mock).mockResolvedValue({
      user: { id: "guru-asing", role: "GURU" },
    });
    await resetSesiSiswa(form("exam-1", "student-1"));
    expect(prisma.attempt.update).not.toHaveBeenCalled();
  });

  test("pengawas mereset sesi: jawaban dipertahankan & sisa waktu tidak hilang", async () => {
    (vi.mocked(auth) as Mock).mockResolvedValue({
      user: { id: "guru-pian", role: "GURU" },
    });
    await resetSesiSiswa(form("exam-framer", "student-budi"));

    expect(prisma.attempt.update).toHaveBeenCalledWith({
      where: {
        studentId_examId: { studentId: "student-budi", examId: "exam-framer" },
      },
      data: expect.objectContaining({
        status: "ONGOING",
        violationCount: 0,
        violationLogs: [],
        endTime: null,
        // 20 menit sudah terpakai -> titik mulai digeser ke 20 menit sebelum sekarang
        startTime: new Date("2026-10-27T08:40:00Z"),
      }),
    });
    // jawaban tidak ikut dihapus
    const data = vi.mocked(prisma.attempt.update).mock.calls[0][0].data;
    expect(data).not.toHaveProperty("answers");
    expect(revalidatePath).toHaveBeenCalledWith("/guru/monitoring/exam-framer");
  });

  test("ADMIN boleh mereset tanpa cek pengawas", async () => {
    (vi.mocked(auth) as Mock).mockResolvedValue({
      user: { id: "admin", role: "ADMIN" },
    });
    await resetSesiSiswa(form("exam-1", "student-1"));
    expect(prisma.exam.findUnique).not.toHaveBeenCalled();
    expect(prisma.attempt.update).toHaveBeenCalled();
  });

  test("berhenti diam-diam jika parameter tidak lengkap", async () => {
    (vi.mocked(auth) as Mock).mockResolvedValue({
      user: { id: "guru-pian", role: "GURU" },
    });
    expect(await resetSesiSiswa(form(null, "student-1"))).toBeUndefined();
    expect(prisma.attempt.update).not.toHaveBeenCalled();
  });
});
