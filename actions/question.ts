"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuestionFormValues, questionSchema } from "@/schemas/questionSchema";
import {
  ExcelRow,
  MultipleChoiceOption,
  MatchingOption,
} from "@/types/question";
import { Prisma, QuestionType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createQuestion(payload: QuestionFormValues) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "GURU") {
      return {
        success: false,
        message: "Akses ditolak. Hanya Guru yang dapat membuat soal.",
      };
    }

    const questionValidation = questionSchema.safeParse(payload);
    if (!questionValidation.success) {
      return {
        success: false,
        message: questionValidation.error.issues[0].message,
      };
    }

    const data = questionValidation.data;

    const assignments = await prisma.subjectAssignment.findMany({
      where: {
        teacherId: session.user.id,
        subjectId: data.subjectId,
        classId: { in: payload.classIds },
      },
    });

    if (assignments.length !== payload.classIds.length) {
      return {
        success: false,
        message:
          "Akses ilegal! Anda tidak ditugaskan di salah satu kelas terpilih.",
      };
    }

    await prisma.$transaction(async (tx) => {
      const newQuestion = await tx.question.create({
        data: {
          type: data.type,
          text: data.text,
          score: data.score,
          options: data.options,
          correctAnswer: data.correctAnswer,
          examTypeId: data.typeId,
          subjectId: data.subjectId,
          authorId: session.user.id,
        },
      });

      await tx.questionToClass.createMany({
        data: payload.classIds.map((cId) => ({
          questionId: newQuestion.id,
          classId: cId,
        })),
      });
    });

    revalidatePath(`/guru/soal/${data.subjectId}`);

    return {
      success: true,
      message: "Soal berhasil disimpan ke dalam Soal!",
    };
  } catch (error) {
    console.error("CREATE_QUESTION_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan pada server saat menyimpan soal.",
    };
  }
}

export async function importQuestions(payload: {
  subjectId: string;
  classIds: string[];
  typeId: string;
  questions: ExcelRow[];
}) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "GURU") {
      return { success: false, message: "Akses ditolak." };
    }

    const assignments = await prisma.subjectAssignment.findMany({
      where: {
        teacherId: session.user.id,
        subjectId: payload.subjectId,
        classId: { in: payload.classIds },
      },
    });

    if (assignments.length !== payload.classIds.length) {
      return {
        success: false,
        message: "Akses ilegal pada salah satu kelas terpilih!",
      };
    }

    await prisma.$transaction(async (tx) => {
      for (const row of payload.questions) {
        const tipeSoalExcel = String(row.Tipe_Soal || "")
          .toUpperCase()
          .trim();
        let type: QuestionType = "MULTIPLE_CHOICE";
        const optionsPG: MultipleChoiceOption[] = [];
        let optionsMenjodohkan: MatchingOption | null = null;
        let matchingCorrectAnswer: string | null = null;
        let finalScore = Number(row.Skor) || 10;

        if (tipeSoalExcel === "ESSAY") {
          type = "ESSAY";
        } else if (
          tipeSoalExcel === "TRUE_FALSE" ||
          tipeSoalExcel === "BENAR_SALAH" ||
          tipeSoalExcel === "BENAR SALAH"
        ) {
          type = "TRUE_FALSE";
        } else if (tipeSoalExcel === "MATCHING") {
          type = "MATCHING";
          const pairs: { left: string; right: string; point: number }[] = [];
          const lefts: string[] = [];
          const rights: string[] = [];
          let totalMatchingScore = 0;

          const processPair = (val: string | number | undefined) => {
            if (!val) return;
            const parts = String(val).split("|");
            if (parts.length >= 2) {
              const l = parts[0].trim();
              const r = parts[1].trim();
              const p = parts.length === 3 ? Number(parts[2].trim()) || 5 : 5;
              lefts.push(l);
              rights.push(r);
              pairs.push({ left: l, right: r, point: p });
              totalMatchingScore += p;
            }
          };

          processPair(row.Opsi_A);
          processPair(row.Opsi_B);
          processPair(row.Opsi_C);
          processPair(row.Opsi_D);
          processPair(row.Opsi_E);

          optionsMenjodohkan = {
            left: lefts,
            right: [...rights].sort(() => Math.random() - 0.5),
          };
          matchingCorrectAnswer = JSON.stringify(pairs);
          finalScore = totalMatchingScore;
        } else if (tipeSoalExcel === "MULTIPLE_CHOICE_COMPLEX") {
          type = "MULTIPLE_CHOICE_COMPLEX";
          if (row.Opsi_A) optionsPG.push({ id: "A", text: String(row.Opsi_A) });
          if (row.Opsi_B) optionsPG.push({ id: "B", text: String(row.Opsi_B) });
          if (row.Opsi_C) optionsPG.push({ id: "C", text: String(row.Opsi_C) });
          if (row.Opsi_D) optionsPG.push({ id: "D", text: String(row.Opsi_D) });
          if (row.Opsi_E) optionsPG.push({ id: "E", text: String(row.Opsi_E) });
        } else {
          type = "MULTIPLE_CHOICE";
          if (row.Opsi_A) optionsPG.push({ id: "A", text: String(row.Opsi_A) });
          if (row.Opsi_B) optionsPG.push({ id: "B", text: String(row.Opsi_B) });
          if (row.Opsi_C) optionsPG.push({ id: "C", text: String(row.Opsi_C) });
          if (row.Opsi_D) optionsPG.push({ id: "D", text: String(row.Opsi_D) });
          if (row.Opsi_E) optionsPG.push({ id: "E", text: String(row.Opsi_E) });
        }

        const finalOptions =
          optionsMenjodohkan !== null ? optionsMenjodohkan : optionsPG;
        let finalCorrectAnswer =
          matchingCorrectAnswer !== null
            ? matchingCorrectAnswer
            : String(row.Kunci_Jawaban || "")
                .trim()
                .toUpperCase();

        if (type === "TRUE_FALSE") {
          finalCorrectAnswer =
            finalCorrectAnswer === "SALAH" ? "SALAH" : "BENAR";
        }

        const newQuestion = await tx.question.create({
          data: {
            type: type,
            score: finalScore,
            text: `<p>${row.Teks_Soal}</p>`,
            options: finalOptions as unknown as Prisma.InputJsonValue,
            correctAnswer: finalCorrectAnswer,
            examTypeId: payload.typeId,
            subjectId: payload.subjectId,
            authorId: session.user.id,
          },
        });

        await tx.questionToClass.createMany({
          data: payload.classIds.map((cId) => ({
            questionId: newQuestion.id,
            classId: cId,
          })),
        });
      }
    });

    revalidatePath(`/guru/soal/${payload.subjectId}`);
    return {
      success: true,
      message: `${payload.questions.length} soal berhasil di-import ke semua kelas!`,
    };
  } catch (error) {
    console.error("IMPORT_ERROR:", error);
    return {
      success: false,
      message: "Gagal import soal. Pastikan format Excel sesuai template.",
    };
  }
}

export async function updateQuestion(
  questionId: string,
  payload: QuestionFormValues,
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "GURU") {
      return {
        success: false,
        message: "Akses ditolak. Hanya Guru yang dapat mengedit soal.",
      };
    }

    const questionValidation = questionSchema.safeParse(payload);
    if (!questionValidation.success) {
      return {
        success: false,
        message: questionValidation.error.issues[0].message,
      };
    }

    const data = questionValidation.data;

    // Pastikan soal ada dan milik guru yang sedang login
    const existing = await prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!existing || existing.authorId !== session.user.id)
      return {
        success: false,
        message: "Akses ditolak. Anda tidak berhak mengedit soal ini!",
      };

    await prisma.$transaction(async (tx) => {
      // Update data
      await tx.question.update({
        where: { id: questionId },
        data: {
          type: data.type,
          text: data.text,
          score: data.score,
          options: data.options,
          correctAnswer: data.correctAnswer,
          examTypeId: data.typeId,
          subjectId: data.subjectId,
        },
      });

      // Hapus relasi lama, buat relasi baru
      await tx.questionToClass.deleteMany({ where: { questionId } });
      await tx.questionToClass.createMany({
        data: data.classIds.map((cId) => ({ questionId, classId: cId })),
      });
    });

    revalidatePath(`/guru/soal/${data.subjectId}`);

    return {
      success: true,
      message: "Soal berhasil diperbarui!",
    };
  } catch (error: unknown) {
    console.error("UPDATE_QUESTION_ERROR:", error);
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }
    return {
      success: false,
      message: "Terjadi kesalahan pada server saat memperbarui soal.",
    };
  }
}

export async function deleteQuestion(questionId: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "GURU") {
      return {
        success: false,
        message: "Akses ditolak. Hanya Guru yang dapat menghapus soal.",
      };
    }

    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        authorId: true,
        subjectId: true,
        examTypeId: true,
      },
    });

    if (!existingQuestion) {
      return { success: false, message: "Soal tidak ditemukan." };
    }

    if (existingQuestion.authorId !== session.user.id) {
      return {
        success: false,
        message: "Akses ditolak. Anda tidak berhak menghapus soal ini.",
      };
    }

    await prisma.question.delete({
      where: { id: questionId },
    });

    revalidatePath(`/guru/soal/${existingQuestion.subjectId}`);

    return { success: true, message: "Soal berhasil dihapus!" };
  } catch (error: unknown) {
    console.error("DELETE_QUESTION_ERROR:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: "Terjadi kesalahan pada server saat menghapus soal.",
    };
  }
}

export async function deleteManyQuestions(ids: string[]) {
  try {
    const result = await prisma.question.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    revalidatePath("/guru/soal", "layout");
    return {
      success: true,
      message: `${result.count} soal berhasil dihapus sekaligus!`,
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Gagal menghapus beberapa soal." };
  }
}
