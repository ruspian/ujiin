import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  createQuestion,
  importQuestions,
  updateQuestion,
  deleteQuestion,
  deleteManyQuestions,
} from "@/actions/question";
import { QuestionFormValues } from "@/schemas/questionSchema";
import { ExcelRow } from "@/types/question";

// MOCKING SEMUA DEPENDENSI EKSTERNAL

vi.mock("@/lib/prisma", () => ({
  prisma: {
    class: {
      findFirst: vi.fn(),
    },
    question: {
      create: vi.fn(),
      createMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Pengujian Server Action - Bank Soal & Parser Excel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Blueprint payload form values soal yang valid sesuai Zod schema
  const mockQuestionForm: QuestionFormValues = {
    type: "MULTIPLE_CHOICE",
    text: "<p>Apakah kepanjangan dari HTML?</p>",
    score: 10,
    options: [{ id: "A", text: "Hyper Text Markup Language" }],
    correctAnswer: "A",
    classId: "class-rpl1",
    typeId: "type-uts",
    subjectId: "sub-pweb",
  };

  // TES UNTUK CREATE QUESTION

  describe("createQuestion", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "guru-pian", role: "GURU" },
        expires: "valid",
      });
    });

    test("Harus gagal jika relasi mata pelajaran di dalam kelas tujuan tidak ditemukan", async () => {
      // Pura-pura relasi subjek di kelas tersebut kosong (null)
      vi.mocked(prisma.class.findFirst).mockResolvedValue(null);

      const hasil = await createQuestion(mockQuestionForm);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain("Kelas tidak ditemukan!");
      expect(prisma.question.create).not.toHaveBeenCalled();
    });

    test("Harus sukses membuat soal tunggal jika data valid dan relasi mapel-kelas sah", async () => {
      vi.mocked(prisma.class.findFirst).mockResolvedValue({
        id: "class-rpl1",
      } as unknown as Awaited<ReturnType<typeof prisma.class.findFirst>>);

      vi.mocked(prisma.question.create).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.question.create>>,
      );

      const hasil = await createQuestion(mockQuestionForm);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("Soal berhasil disimpan ke dalam Bank Soal!");
      expect(prisma.question.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authorId: "guru-pian",
          subjectId: "sub-pweb",
        }),
      });
    });
  });

  // TES UNTUK EXCEL IMPORT PARSER

  describe("importQuestions (Excel Parser Engine)", () => {
    beforeEach(() => {
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "guru-pian", role: "GURU" },
        expires: "valid",
      });
    });

    test("Harus sukses mem-parsing baris tipe MATCHING (Menjodohkan) dari format string pipa ke skema JSON", async () => {
      // Simulasi 1 baris Excel bertipe MATCHING dengan format string pipa
      const mockExcelData: ExcelRow[] = [
        {
          Tipe_Soal: "MATCHING",
          Teks_Soal: "Jodohkan hewan berikut",
          Skor: 0, // Biarkan dihitung otomatis dari total point pasangan
          Opsi_A: "Kucing | Mamalia | 10",
          Opsi_B: "Merpati | Aves | 10",
        },
      ];

      vi.mocked(prisma.question.createMany).mockResolvedValue({ count: 1 });

      const hasil = await importQuestions({
        subjectId: "sub-pweb",
        classId: "class-rpl1",
        typeId: "type-uts",
        questions: mockExcelData,
      });

      expect(hasil.success).toBe(true);

      // Verifikasi keakuratan ekstraksi parser excel
      expect(prisma.question.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            type: "MATCHING",
            score: 20, // 10 + 10 = 20
            text: "<p>Jodohkan hewan berikut</p>",
            correctAnswer: JSON.stringify([
              { left: "Kucing", right: "Mamalia", point: 10 },
              { left: "Merpati", right: "Aves", point: 10 },
            ]),
          }),
        ]),
      });
    });
  });

  // TES DATA OWNERSHIP LOCK

  describe("Proteksi Kepemilikan Data", () => {
    beforeEach(() => {
      // Login sebagai Guru A
      (vi.mocked(auth) as Mock).mockResolvedValue({
        user: { id: "guru-A", role: "GURU" },
        expires: "valid",
      });
    });

    test("Harus menolak edit soal jika pembuat asli soal tersebut adalah ID Guru lain", async () => {
      // Pura-pura soal tersebut milik guru-B di database
      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        authorId: "guru-B",
      } as unknown as Awaited<ReturnType<typeof prisma.question.findUnique>>);

      const hasil = await updateQuestion("soal-milik-b", mockQuestionForm);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain("Anda tidak berhak mengedit soal ini.");
      expect(prisma.question.update).not.toHaveBeenCalled();
    });

    test("Harus menolak hapus soal jika pembuat asli soal tersebut adalah ID Guru lain", async () => {
      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        authorId: "guru-orang-lain",
      } as unknown as Awaited<ReturnType<typeof prisma.question.findUnique>>);

      const hasil = await deleteQuestion("soal-gaib");

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain("Anda tidak berhak menghapus soal ini.");
      expect(prisma.question.delete).not.toHaveBeenCalled();
    });
  });

  // TES UNTUK BATCH DELETE MANY

  describe("deleteManyQuestions", () => {
    test("Harus sukses menghapus beberapa ID soal sekaligus dalam satu operasi batch", async () => {
      vi.mocked(prisma.question.deleteMany).mockResolvedValue({ count: 5 });

      const hasil = await deleteManyQuestions(["id-1", "id-2", "id-3"]);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("5 soal berhasil dihapus sekaligus!");
      expect(prisma.question.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["id-1", "id-2", "id-3"] } },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/guru/soal");
    });
  });
});
