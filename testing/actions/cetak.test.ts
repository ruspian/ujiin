import { describe, test, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getHasilKelasDokumen } from "@/actions/cetak";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    exam: { findFirst: vi.fn() },
    subjectAssignment: { findUnique: vi.fn() },
    class: { findUnique: vi.fn() },
    student: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const exam = {
  id: "e1",
  title: "UAS",
  subjectId: "m1",
  supervisorId: "guru-lain",
  subject: { name: "Matematika" },
  examType: { name: "Ujian Akhir" },
  questions: [
    { id: "q1", type: "TRUE_FALSE", score: 10, correctAnswer: "BENAR", text: "<p>Benar?</p>", options: null },
  ],
};

const student = (id: string, name: string, attempt: object | null) => ({
  id,
  name,
  nisn: id,
  attempts: attempt ? [attempt] : [],
});

describe("getHasilKelasDokumen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: "guru-1", role: "GURU" } } as never);
    vi.mocked(prisma.exam.findFirst).mockResolvedValue(exam as never);
    vi.mocked(prisma.subjectAssignment.findUnique).mockResolvedValue({ teacherId: "guru-1" } as never);
    vi.mocked(prisma.class.findUnique).mockResolvedValue({ name: "XII A" } as never);
  });

  test("Selain guru ditolak", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "s", role: "ADMIN" } } as never);
    expect((await getHasilKelasDokumen("e1", "c1")).success).toBe(false);
  });

  test("Guru yang bukan pengampu/pengawas ditolak", async () => {
    vi.mocked(prisma.subjectAssignment.findUnique).mockResolvedValue({ teacherId: "guru-x" } as never);
    const res = await getHasilKelasDokumen("e1", "c1");
    expect(res).toEqual({ success: false, message: "Akses ditolak!" });
    expect(prisma.student.findMany).not.toHaveBeenCalled();
  });

  test("Dokumen memuat daftar nilai semua siswa dan hasil hanya yang sudah selesai", async () => {
    vi.mocked(prisma.student.findMany).mockResolvedValue([
      student("s1", "Ani", { status: "SUBMITTED", score: 100, answers: { q1: "BENAR" }, essayScores: null }),
      student("s2", "Budi", { status: "ONGOING", score: null, answers: {}, essayScores: null }),
      student("s3", "Cici", null),
    ] as never);

    const res = await getHasilKelasDokumen("e1", "c1");
    if (!res.success) throw new Error(res.message);
    const text = JSON.stringify(res.blocks);

    expect(text).toContain("Belum mengerjakan"); // Cici di daftar nilai
    expect(text).toContain("Mengerjakan"); // Budi di daftar nilai
    expect(text).toContain("HASIL PEKERJAAN SISWA"); // hasil Ani
    expect(res.blocks.filter((b) => b.kind === "pagebreak")).toHaveLength(1); // hanya Ani
    expect(res.fileName).toBe("Hasil_UAS_XII A");
  });

  test("Jawaban rusak tidak membuat gagal", async () => {
    vi.mocked(prisma.student.findMany).mockResolvedValue([
      student("s1", "Ani", { status: "SUBMITTED", score: 0, answers: "{bukan json", essayScores: null }),
    ] as never);
    expect((await getHasilKelasDokumen("e1", "c1")).success).toBe(true);
  });
});
