import { describe, test, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { simpanKoreksi } from "@/actions/penilaian";
import { QuestionType } from "@prisma/client";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    attempt: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
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
  });

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
      answers: mockStudentAnswers,
      exam: {
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

    // 10 (PG) + 0 (TF) + 20 (Complex) + 20 (Matching) + 35 (Esai) = 85!
    expect(prisma.attempt.update).toHaveBeenCalledWith({
      where: { id: "att-siswa-01" },
      data: { score: 85 }, // 👈 Skor total wajib mutlak bernilai tepat 85!
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
      answers: {},
      exam: { questions: mockQuestions },
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
      data: { score: 30 },
    });
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
