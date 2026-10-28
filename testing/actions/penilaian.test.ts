import { describe, test, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { simpanKoreksi } from "@/actions/penilaian";
import { QuestionType } from "@prisma/client";
import { auth } from "@/lib/auth";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    attempt: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subjectAssignment: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Kita tiru perilaku redirect Next.js asli yang melempar error internal redirect
vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    const error = new Error("NEXT_REDIRECT");
    (error as unknown as { digest: string }).digest =
      `NEXT_REDIRECT;303;${url};false;`;
    throw error;
  }),
}));

describe("Pengujian Server Action - Auto-Grading Engine (Simpan Koreksi)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth as unknown as () => Promise<unknown>).mockResolvedValue({
      user: { id: "guru-1", role: "GURU" },
    });
  });

  // Bagian ujian/siswa yang dibutuhkan pengecekan hak akses guru
  const examMeta = {
    authorId: "guru-1",
    supervisorId: null,
    subjectId: "sub-1",
  };

  // Tipe data ringkas untuk menyimulasikan return query findUnique Prisma secara legal
  type MockAttemptResult = Awaited<
    ReturnType<typeof prisma.attempt.findUnique>
  >;

  // Helper untuk menyusun blueprint soal-soal ujian tiruan
  const createMockQuestion = (
    id: string,
    type: QuestionType,
    score: number,
    correctAnswer: string,
  ) => {
    return {
      id,
      type,
      score,
      correctAnswer,
      createdAt: new Date(),
      updatedAt: new Date(),
      text: "Pertanyaan Ujiin",
      options: {},
      classId: "class-1",
      authorId: "auth-1",
      subjectId: "sub-1",
      examTypeId: "ext-1",
    };
  };

  test("Harus sukses mengkalkulasi berbagai tipe soal (Pilihan Ganda, Kompleks, Menjodohkan, Esai) dengan total nilai akurat", async () => {
    const mockStudentAnswers = {
      "q-pg": "A", // Benar (Skor +10)
      "q-tf": "true", // Salah (Skor +0)
      "q-complex": ["A", "C"], // Benar (Skor +20)
      "q-matching": { Kucing: "Mamalia", Elang: "Aves" }, // Benar semua (Skor +10 + 10 = +20)
    };

    const mockQuestions = [
      createMockQuestion("q-pg", "MULTIPLE_CHOICE", 10, "a "),
      createMockQuestion("q-tf", "TRUE_FALSE", 10, "false"),
      createMockQuestion(
        "q-complex",
        "MULTIPLE_CHOICE_COMPLEX",
        20,
        '["A","C"]',
      ),
      createMockQuestion(
        "q-matching",
        "MATCHING",
        20,
        '[{"left":"Kucing","right":"Mamalia","point":10},{"left":"Elang","right":"Aves","point":10}]',
      ),
      createMockQuestion("q-essay", "ESSAY", 40, ""), // Nilai manual dari guru
    ];

    vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
      id: "att-siswa-01",
      examId: "exam-uts",
      answers: mockStudentAnswers,
      essayScores: null,
      student: { classId: "kelas-1" },
      exam: {
        ...examMeta,
        questions: mockQuestions,
      },
    } as unknown as MockAttemptResult);

    vi.mocked(prisma.attempt.update).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof prisma.attempt.update>>,
    );

    // Guru menginput nilai Esai lewat FormData: diberi nilai 35 dari total bobot 40
    const mockFormData = new FormData();
    mockFormData.append("nilai_q-essay", "35");

    // Eksekusi & tangkap pelemparan redirect Next.js secara aman
    await expect(
      simpanKoreksi("subject-rpl", "exam-uts", "att-siswa-01", mockFormData),
    ).rejects.toThrow("NEXT_REDIRECT");

    // 10 (PG) + 0 (TF) + 20 (Complex) + 20 (Matching) + 35 (Esai) = 85 poin
    // dari total bobot 100 => nilai 85 (skala 0–100). Nilai esai ikut disimpan
    // per soal supaya tidak hilang saat halaman koreksi dibuka lagi.
    expect(prisma.attempt.update).toHaveBeenCalledWith({
      where: { id: "att-siswa-01" },
      data: { score: 85, essayScores: { "q-essay": 35 } },
    });

    // Pastikan cache halaman dibersihkan dengan benar
    expect(revalidatePath).toHaveBeenCalledWith(
      "/guru/penilaian/subject-rpl/exam-uts/att-siswa-01",
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      "/guru/penilaian/subject-rpl/exam-uts",
    );

    // Verifikasi tujuan redirect halaman guru pasca-koreksi sukses
    expect(redirect).toHaveBeenCalledWith(
      "/guru/penilaian/subject-rpl/exam-uts",
    );
  });

  test("Harus membatasi nilai esai agar tidak melebihi batas maksimum bobot soal yang ditentukan", async () => {
    const mockQuestions = [createMockQuestion("q-essay-over", "ESSAY", 30, "")];

    vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
      id: "att-siswa-02",
      examId: "exam-uts",
      answers: {},
      essayScores: null,
      student: { classId: "kelas-1" },
      exam: { ...examMeta, questions: mockQuestions },
    } as unknown as MockAttemptResult);

    // Guru iseng menginput nilai 50, padahal bobot maksimal soal esai tersebut cuma 30!
    const mockFormData = new FormData();
    mockFormData.append("nilai_q-essay-over", "50");

    await expect(
      simpanKoreksi("subject-rpl", "exam-uts", "att-siswa-02", mockFormData),
    ).rejects.toThrow("NEXT_REDIRECT");

    // Harus dikunci aman di angka maksimal bobot yaitu 30 (efek Math.min)
    expect(prisma.attempt.update).toHaveBeenCalledWith({
      where: { id: "att-siswa-02" },
      data: { score: 100, essayScores: { "q-essay-over": 30 } },
    });
  });

  test("Nilai skala 100 walau total bobot soal bukan 100 (bug lama: poin mentah)", async () => {
    const mockQuestions = [
      createMockQuestion("q-a", "MULTIPLE_CHOICE", 25, "A"),
      createMockQuestion("q-b", "MULTIPLE_CHOICE", 25, "B"),
      createMockQuestion("q-c", "MULTIPLE_CHOICE", 25, "C"),
      createMockQuestion("q-d", "ESSAY", 25, ""),
    ];
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
      id: "att-3",
      examId: "exam-uts",
      answers: { "q-a": "A", "q-b": "B", "q-c": "X" },
      essayScores: null,
      student: { classId: "kelas-1" },
      exam: { ...examMeta, questions: mockQuestions },
    } as unknown as MockAttemptResult);

    const fd = new FormData();
    fd.append("nilai_q-d", "10");
    await expect(
      simpanKoreksi("subject-rpl", "exam-uts", "att-3", fd),
    ).rejects.toThrow("NEXT_REDIRECT");

    // 25 + 25 + 0 + 10 = 60 dari 100
    expect(prisma.attempt.update).toHaveBeenCalledWith({
      where: { id: "att-3" },
      data: { score: 60, essayScores: { "q-d": 10 } },
    });
  });

  test("Nilai esai tersimpan sebelumnya dipertahankan bila tidak dikirim ulang", async () => {
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
      id: "att-4",
      examId: "exam-uts",
      answers: {},
      essayScores: { "q-d": 20 },
      student: { classId: "kelas-1" },
      exam: {
        ...examMeta,
        questions: [createMockQuestion("q-d", "ESSAY", 20, "")],
      },
    } as unknown as MockAttemptResult);

    await expect(
      simpanKoreksi("subject-rpl", "exam-uts", "att-4", new FormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(prisma.attempt.update).toHaveBeenCalledWith({
      where: { id: "att-4" },
      data: { score: 100, essayScores: { "q-d": 20 } },
    });
  });

  test("Guru yang bukan pengampu/pengawas ditolak", async () => {
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
      id: "att-5",
      examId: "exam-uts",
      answers: {},
      essayScores: null,
      student: { classId: "kelas-1" },
      exam: {
        authorId: "guru-lain",
        supervisorId: "guru-lain",
        subjectId: "sub-1",
        questions: [],
      },
    } as unknown as MockAttemptResult);
    vi.mocked(prisma.subjectAssignment.findFirst).mockResolvedValue(null);

    const hasil = await simpanKoreksi("s", "exam-uts", "att-5", new FormData());
    expect(hasil).toEqual({ success: false, message: "Akses ditolak!" });
    expect(prisma.attempt.update).not.toHaveBeenCalled();
  });

  test("Non-guru ditolak", async () => {
    vi.mocked(auth as unknown as () => Promise<unknown>).mockResolvedValue({
      user: { id: "x", role: "ADMIN" },
    });
    const hasil = await simpanKoreksi("s", "e", "a", new FormData());
    expect(hasil).toEqual({ success: false, message: "Akses ditolak!" });
  });

  test("Harus langsung keluar dan mengembalikan pesan jika sesi attempt pengerjaan tidak ditemukan", async () => {
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(null);

    const hasil = await simpanKoreksi(
      "sub-1",
      "exam-1",
      "att-gaib",
      new FormData(),
    );

    expect(hasil).toEqual({
      success: false,
      message: "Sesi ujian tidak valid!",
    });
    expect(prisma.attempt.update).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
