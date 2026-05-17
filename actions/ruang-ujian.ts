"use server";

import { prisma } from "@/lib/prisma";
import { AnswersMap } from "@/types/ruang-ujian";
import { AttemptStatus } from "@prisma/client";

export async function autoSaveJawaban(attemptId: string, answers: AnswersMap) {
  try {
    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        answers: answers as object, // json
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Gagal auto-save:", error);
    return { success: false, message: "Gagal menyimpan jawaban." };
  }
}

export async function submitUjianSiswa(attemptId: string, answers: AnswersMap) {
  try {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: { questions: true },
        },
      },
    });

    if (!attempt) throw new Error("Attempt tidak ditemukan");

    // Koreksi Otomatis
    let totalScore = 0;
    let maxScore = 0;

    attempt.exam.questions.forEach((q) => {
      maxScore += q.score;
      const studentAnswer = answers[q.id];

      if (
        (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") &&
        typeof studentAnswer === "string"
      ) {
        if (studentAnswer === q.correctAnswer) {
          totalScore += q.score;
        }
      }
    });

    // Konversi ke 100
    const finalScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        answers: answers as object,
        score: finalScore,
        status: AttemptStatus.SUBMITTED,
        endTime: new Date(), // Catat waktu selesai
      },
    });

    return { success: true, message: "Ujian berhasil diselesaikan!" };
  } catch (error) {
    console.error("Gagal submit:", error);
    return { success: false, message: "Terjadi kesalahan sistem saat submit." };
  }
}

export async function catatPelanggaran(
  attemptId: string,
  jenisPelanggaran: string,
) {
  try {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { violationCount: true, violationLogs: true },
    });

    if (!attempt) throw new Error("Attempt tidak ditemukan");

    // Ambil log lama kalau ada, lalu tambahin log baru
    const currentLogs = Array.isArray(attempt.violationLogs)
      ? attempt.violationLogs
      : [];
    const newLog = {
      waktu: new Date().toISOString(),
      jenis: jenisPelanggaran,
    };

    const newCount = attempt.violationCount + 1;
    const isCheated = newCount >= 3;

    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        violationCount: newCount,
        violationLogs: [...currentLogs, newLog] as object,
        status: isCheated ? "CHEATED" : undefined,
        endTime: isCheated ? new Date() : undefined,
      },
    });

    return {
      success: true,
      violationCount: newCount,
      isKicked: isCheated,
    };
  } catch (error) {
    console.error("Gagal catat pelanggaran:", error);
    return { success: false };
  }
}

export async function cekStatusAttempt(attemptId: string) {
  try {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { status: true },
    });
    return { success: true, status: attempt?.status };
  } catch (error) {
    console.error("Gagal cek status:", error);
    return { success: false };
  }
}
