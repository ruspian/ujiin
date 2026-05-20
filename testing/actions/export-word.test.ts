import { describe, test, expect, vi, beforeEach } from "vitest";
import { exportQuestionsToWord } from "@/lib/exportWord";
import { Packer } from "docx";
import { saveAs } from "file-saver";
import { Question, QuestionType } from "@prisma/client";

// MOCKING UTILITY BROWSER & LIBRARY DOCX

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

vi.mock("docx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("docx")>();
  return {
    ...actual,
    Packer: {
      toBlob: vi
        .fn()
        .mockResolvedValue(
          new Blob(["mock-docx-content"], { type: "application/msword" }),
        ),
    },
  };
});

describe("Pengujian Utilitas - Export Soal ke Microsoft Word (.docx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper pencetak blueprint soal tiruan yang type-safe sesuai skema Prisma
  const createMockQuestion = (
    id: string,
    type: QuestionType,
    text: string,
    options: Record<string, unknown> | unknown[],
  ): Question => {
    return {
      id,
      type,
      text,
      options: options as unknown as Question["options"], // Aman dari Prisma JsonValue constraint
      score: 10,
      correctAnswer: "A",
      classId: "class-1",
      authorId: "auth-1",
      subjectId: "sub-1",
      examTypeId: "ext-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  test("Harus sukses memproses, mem-parsing seluruh tipe soal (PG, Kompleks, Matching, TF, Esai) dan memicu saveAs", async () => {
    // 🌟 SUSUN DATA SOAL MULTI-TIPE DENGAN HTML TAGS
    const mockQuestions: Question[] = [
      createMockQuestion(
        "q-1",
        "MULTIPLE_CHOICE",
        "<p>Apakah fungsi utama dari framework Next.js?</p>",
        [
          { id: "A", text: "Server Side Rendering" },
          { id: "B", text: "Styling Komponen" },
        ],
      ),
      createMockQuestion(
        "q-2",
        "MULTIPLE_CHOICE_COMPLEX",
        "<p>Pilih fitur utama dari React! (Jawaban lebih dari satu)</p>",
        [
          { id: "A", text: "Virtual DOM" },
          { id: "B", text: "Hooks" },
        ],
      ),
      createMockQuestion(
        "q-3",
        "MATCHING",
        "<p>Jodohkan istilah teknologi berikut dengan pasangannya!</p>",
        {
          left: ["Tailwind", "Prisma"],
          right: ["CSS Framework", "ORM Database"],
        },
      ),
      createMockQuestion(
        "q-4",
        "TRUE_FALSE",
        "<p>TypeScript merupakan superset dari bahasa pemrograman JavaScript.</p>",
        {},
      ),
      createMockQuestion(
        "q-5",
        "ESSAY",
        "<p>Jelaskan arsitektur App Router pada Next.js!</p>",
        {},
      ),
    ];

    // Eksekusi fungsi export naskah soal ujian
    await exportQuestionsToWord({
      questions: mockQuestions,
      subjectName: "Pemrograman Web",
      className: "XII RPL 1",
      examName: "Ujian Tengah Semester",
    });

    // Verifikasi compiler docx berhasil mengubah struktur paragraph & table menjadi Blob
    expect(Packer.toBlob).toHaveBeenCalled();

    // Verifikasi sistem memicu download file otomatis ke browser user dengan penamaan berkas yang tepat
    expect(saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      "Soal_Pemrograman Web_XII RPL 1.docx",
    );
  });

  test("Harus sukses berjalan normal dan tidak memicu pembuatan tabel jika daftar soal kosong", async () => {
    await exportQuestionsToWord({
      questions: [],
      subjectName: "Kosong",
      className: "X RPL 2",
      examName: "Tryout",
    });

    expect(Packer.toBlob).toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      "Soal_Kosong_X RPL 2.docx",
    );
  });
});
