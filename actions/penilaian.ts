"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function simpanKoreksi(
  subjectId: string,
  examId: string,
  attemptId: string,
  formData: FormData,
) {
  try {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: { questions: true },
        },
      },
    });

    if (!attempt || !attempt.exam) {
      return { success: false, message: "Sesi ujian tidak valid!" };
    }

    let totalScore = 0;
    const questions = attempt.exam.questions;

    const studentAnswers = (attempt.answers as Record<string, string>) || {};

    for (const q of questions) {
      const answer = studentAnswers[q.id];
      const rawCorrect = q.correctAnswer || "";

      if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
        if (
          typeof answer === "string" &&
          answer.trim().toUpperCase() === rawCorrect.trim().toUpperCase()
        ) {
          totalScore += q.score || 0;
        }
      } else if (q.type === "MULTIPLE_CHOICE_COMPLEX") {
        try {
          let correctArr: string[] = [];
          if (rawCorrect.startsWith("[") && rawCorrect.endsWith("]")) {
            correctArr = (JSON.parse(rawCorrect) as string[]).map((v) =>
              v.trim().toUpperCase(),
            );
          } else {
            correctArr = rawCorrect
              .split(",")
              .map((v) => v.trim().toUpperCase());
          }

          const studentArr = Array.isArray(answer)
            ? (answer as string[]).map((v) => String(v).trim().toUpperCase())
            : [];

          if (
            studentArr.length === correctArr.length &&
            studentArr.every((v) => correctArr.includes(v))
          ) {
            totalScore += q.score || 0;
          }
        } catch (error) {
          console.error(`Error Action Complex pada soal ${q.id}:`, error);
        }
      } else if (q.type === "MATCHING") {
        try {
          const correctData = JSON.parse(rawCorrect) as MatchingPair[];
          const studentData =
            typeof answer === "object" && !Array.isArray(answer)
              ? (answer as Record<string, string>)
              : {};

          correctData.forEach((item) => {
            const studentAns = studentData[item.left];
            if (
              studentAns &&
              studentAns.trim().toLowerCase() ===
                item.right.trim().toLowerCase()
            ) {
              totalScore += item.point || q.score / correctData.length;
            }
          });
        } catch (error) {
          console.error(`Error Action Matching pada soal ${q.id}:`, error);
        }
      } else if (q.type === "ESSAY") {
        const nilaiEsai = Number(formData.get(`nilai_${q.id}`)) || 0;
        const nilaiAman = Math.min(nilaiEsai, q.score || 0);
        totalScore += Math.max(0, nilaiAman);
      }
    }

    await prisma.attempt.update({
      where: { id: attemptId },
      data: { score: totalScore },
    });

    revalidatePath(`/guru/penilaian/${subjectId}/${examId}/${attemptId}`);
    revalidatePath(`/guru/penilaian/${subjectId}/${examId}`);
  } catch (error) {
    console.error("Gagal menyimpan koreksi:", error);
    return { success: false, message: "Terjadi kesalahan server!" };
  }

  redirect(`/guru/penilaian/${subjectId}/${examId}`);
}
