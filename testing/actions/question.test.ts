import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
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

const tx = vi.hoisted(() => ({
  question: { create: vi.fn(), update: vi.fn() },
  questionToClass: { createMany: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subjectAssignment: {
      findMany: vi.fn(),
    },
    question: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
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
    classIds: ["class-rpl1"],
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

    test("Harus gagal jika guru tidak ditugaskan di kelas yang dipilih", async () => {
      vi.mocked(prisma.subjectAssignment.findMany).mockResolvedValue([]);

      const hasil = await createQuestion(mockQuestionForm);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain("Akses ilegal");
      expect(tx.question.create).not.toHaveBeenCalled();
    });

    test("Harus sukses membuat soal dan menautkannya ke kelas jika penugasan sah", async () => {
      vi.mocked(prisma.subjectAssignment.findMany).mockResolvedValue([
        { id: "as-1" },
      ] as unknown as Awaited<ReturnType<typeof prisma.subjectAssignment.findMany>>);
      tx.question.create.mockResolvedValue({ id: "q-baru" });

      const hasil = await createQuestion(mockQuestionForm);

      expect(hasil.success).toBe(true);
      expect(tx.question.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authorId: "guru-pian",
          subjectId: "sub-pweb",
        }),
      });
      expect(tx.questionToClass.createMany).toHaveBeenCalledWith({
        data: [{ questionId: "q-baru", classId: "class-rpl1" }],
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

      vi.mocked(prisma.subjectAssignment.findMany).mockResolvedValue([
        { id: "as-1" },
      ] as unknown as Awaited<ReturnType<typeof prisma.subjectAssignment.findMany>>);
      tx.question.create.mockResolvedValue({ id: "q-import" });

      const hasil = await importQuestions({
        subjectId: "sub-pweb",
        classIds: ["class-rpl1"],
        typeId: "type-uts",
        questions: mockExcelData,
      });

      expect(hasil.success).toBe(true);

      // Verifikasi keakuratan ekstraksi parser excel
      expect(tx.question.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "MATCHING",
          score: 20, // 10 + 10 = 20
          text: "<p>Jodohkan hewan berikut</p>",
          correctAnswer: JSON.stringify([
            { left: "Kucing", right: "Mamalia", point: 10 },
            { left: "Merpati", right: "Aves", point: 10 },
          ]),
        }),
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
      expect(hasil.message).toContain("Anda tidak berhak mengedit soal ini!");
      expect(tx.question.update).not.toHaveBeenCalled();
    });

    test("Harus menolak edit jika soal dipindah ke kelas yang bukan tugas guru", async () => {
      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        authorId: "guru-A",
      } as unknown as Awaited<ReturnType<typeof prisma.question.findUnique>>);
      vi.mocked(prisma.subjectAssignment.findMany).mockResolvedValue([]);

      const hasil = await updateQuestion("soal-milik-a", mockQuestionForm);

      expect(hasil.success).toBe(false);
      expect(hasil.message).toContain("Akses ilegal");
      expect(tx.question.update).not.toHaveBeenCalled();
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
    test("Hanya menghapus soal milik guru yang login (authorId ikut difilter)", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "guru-1", role: "GURU" },
      } as never);
      vi.mocked(prisma.question.deleteMany).mockResolvedValue({ count: 3 });

      const hasil = await deleteManyQuestions(["id-1", "id-2", "id-3"]);

      expect(hasil.success).toBe(true);
      expect(hasil.message).toBe("3 soal berhasil dihapus sekaligus!");
      expect(prisma.question.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["id-1", "id-2", "id-3"] }, authorId: "guru-1" },
      });
    });

    test("Ditolak tanpa login atau bukan guru", async () => {
      for (const session of [null, { user: { id: "a-1", role: "ADMIN" } }]) {
        vi.mocked(auth).mockResolvedValue(session as never);
        const hasil = await deleteManyQuestions(["id-1"]);
        expect(hasil.success).toBe(false);
      }
      expect(prisma.question.deleteMany).not.toHaveBeenCalled();
    });
  });
});
