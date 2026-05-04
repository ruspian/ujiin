"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuestionFormValues, questionSchema } from "@/schemas/questionSchema";
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

    const targetClass = await prisma.class.findFirst({
      where: {
        id: data.classId,
        subjects: { some: { id: data.subjectId } },
      },
    });

    if (!targetClass) {
      return {
        success: false,
        message: `Kelas tidak ditemukan!. Silakan hubungi Admin.`,
      };
    }

    await prisma.question.create({
      data: {
        type: data.type,
        text: data.text,
        score: data.score,
        options: data.options,
        correctAnswer: data.correctAnswer,
        classId: data.classId,
        examTypeId: data.typeId,
        subjectId: data.subjectId,
        authorId: session.user.id,
      },
    });

    revalidatePath(
      `/guru/soal/${data.subjectId}?classId=${data.classId}&type=${data.typeId}`,
    );

    return {
      success: true,
      message: "Soal berhasil disimpan ke dalam Bank Soal!",
    };
  } catch (error) {
    console.error("CREATE_QUESTION_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan pada server saat menyimpan soal.",
    };
  }
}
