"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { canTeacherAccessAttempt } from "@/lib/teacher-access";
import { redirect } from "next/navigation";
import {
  AnswersMap,
  EssayScores,
  clampEssayScore,
  gradeAttempt,
} from "@/lib/grading";

export async function simpanKoreksi(
  subjectId: string,
  examId: string,
  attemptId: string,
  formData: FormData,
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "GURU") {
      return { success: false, message: "Akses ditolak!" };
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        student: { select: { classId: true } },
        exam: {
          include: {
            questions: {
              select: { id: true, type: true, score: true, correctAnswer: true },
            },
          },
        },
      },
    });

    if (!attempt || !attempt.exam || attempt.examId !== examId) {
      return { success: false, message: "Sesi ujian tidak valid!" };
    }

    // Hanya guru terkait (pembuat jadwal, pengawas, atau pengampu mapel di
    // kelas siswa) yang boleh mengubah nilai.
    const exam = attempt.exam;
    if (
      !(await canTeacherAccessAttempt(
        session.user.id,
        exam,
        attempt.student.classId,
      ))
    ) {
      return { success: false, message: "Akses ditolak!" };
    }

    // Nilai esai dari form: dibatasi 0..bobot soal, disimpan PER SOAL supaya
    // saat dibuka lagi nilai sebelumnya tidak kembali ke 0.
    const essayScores: EssayScores = {};
    for (const q of exam.questions) {
      if (q.type !== "ESSAY") continue;
      const raw = formData.get(`nilai_${q.id}`);
      if (raw === null || raw === "") continue;
      essayScores[q.id] = clampEssayScore(raw, q.score);
    }

    const prev = (attempt.essayScores as EssayScores | null) ?? {};
    const mergedEssay: EssayScores = { ...prev, ...essayScores };

    const result = gradeAttempt(
      exam.questions.map((q) => ({
        id: q.id,
        type: q.type,
        score: q.score,
        correctAnswer: q.correctAnswer,
      })),
      (attempt.answers as AnswersMap | null) ?? {},
      mergedEssay,
    );

    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        // Skala 0–100 (sebelumnya disimpan sebagai poin mentah sehingga
        // rekap dan nilai submit siswa tidak sama skalanya).
        score: result.percent,
        essayScores: mergedEssay as object,
      },
    });

    revalidatePath(`/guru/penilaian/${subjectId}/${examId}/${attemptId}`);
    revalidatePath(`/guru/penilaian/${subjectId}/${examId}`);
    revalidatePath(`/guru/rekap-nilai`);
  } catch (error) {
    console.error("Gagal menyimpan koreksi:", error);
    return { success: false, message: "Terjadi kesalahan server!" };
  }

  redirect(`/guru/penilaian/${subjectId}/${examId}`);
}
