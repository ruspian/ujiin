"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuestionFormValues, questionSchema } from "@/schemas/questionSchema";
import {
  ExcelRow,
  MultipleChoiceOption,
  MatchingOption,
} from "@/types/question";
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

export async function importQuestions(payload: {
  subjectId: string;
  classId: string;
  typeId: string;
  questions: ExcelRow[];
}) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "GURU") {
      return { success: false, message: "Akses ditolak." };
    }

    const dataToInsert = payload.questions.map((row) => {
      const tipeSoalExcel = String(row.Tipe_Soal || "").toUpperCase();
      let type:
        | "MULTIPLE_CHOICE"
        | "MULTIPLE_CHOICE_COMPLEX"
        | "ESSAY"
        | "MATCHING" = "MULTIPLE_CHOICE";

      const optionsPG: MultipleChoiceOption[] = [];
      let optionsMenjodohkan: MatchingOption | null = null;
      let matchingCorrectAnswer: string | null = null;

      let finalScore = Number(row.Skor) || 10;

      if (tipeSoalExcel === "ESSAY") {
        type = "ESSAY";
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

        const shuffledRights = [...rights].sort(() => Math.random() - 0.5);
        optionsMenjodohkan = { left: lefts, right: shuffledRights };
        matchingCorrectAnswer = JSON.stringify(pairs);

        // Final skor
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
      const finalCorrectAnswer =
        matchingCorrectAnswer !== null
          ? matchingCorrectAnswer
          : String(row.Kunci_Jawaban || "");

      return {
        type: type,
        score: finalScore,
        text: `<p>${row.Teks_Soal}</p>`,
        options: finalOptions,
        correctAnswer: finalCorrectAnswer,
        classId: payload.classId,
        examTypeId: payload.typeId,
        subjectId: payload.subjectId,
        authorId: session.user.id,
      };
    });

    await prisma.question.createMany({
      data: dataToInsert,
    });

    revalidatePath(
      `/guru/soal/${payload.subjectId}?classId=${payload.classId}&type=${payload.typeId}`,
    );
    return {
      success: true,
      message: `${dataToInsert.length} soal berhasil di-import!`,
    };
  } catch (error) {
    console.error("IMPORT_ERROR:", error);
    return {
      success: false,
      message: "Gagal import soal. Pastikan format Excel sesuai template.",
    };
  }
}
