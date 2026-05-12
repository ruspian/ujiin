"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { UpdateCorrectionParams } from "@/types/attempt";
import { auth } from "@/lib/auth";

export async function updateAttemptScore({
  attemptId,
  examId,
  updatedAnswers,
}: UpdateCorrectionParams) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "GURU") {
      return { success: false, message: "Akses ditolak!" };
    }

    // Hitung total skor
    let newTotalScore = 0;
    for (const questionId in updatedAnswers) {
      newTotalScore += updatedAnswers[questionId].score;
    }

    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        answers: updatedAnswers as unknown as Prisma.InputJsonObject,
        score: newTotalScore,
      },
    });

    revalidatePath(`/guru/koreksi/${examId}`);
    revalidatePath(`/guru/koreksi/${examId}/${attemptId}`);

    return { success: true, message: "Nilai berhasil diperbarui!" };
  } catch (error) {
    console.error("Gagal simpan koreksi:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat menyimpan nilai.",
    };
  }
}
