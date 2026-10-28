import { prisma } from "@/lib/prisma";
import { AttemptStatus } from "@prisma/client";
import {
  AnswersMap,
  EssayScores,
  GradableQuestion,
  gradeAttempt,
} from "@/lib/grading";
import { SUBMIT_GRACE_SECONDS, getAttemptDeadline } from "@/lib/exam-config";

export const QUESTION_GRADING_SELECT = {
  id: true,
  type: true,
  score: true,
  correctAnswer: true,
} as const;

/**
 * Pengerjaan yang masih ONGOING padahal waktunya sudah habis (siswa menutup
 * aplikasi / HP mati / sinyal hilang) otomatis dikumpulkan memakai jawaban
 * terakhir yang tersimpan di server. Tanpa ini nilainya kosong/tidak muncul
 * di rekap selamanya.
 *
 * Aman dipanggil berulang (idempoten) dan tidak menimpa submit siswa yang
 * terjadi bersamaan (updateMany dengan guard status ONGOING).
 */
export async function finalizeExpiredAttempts(opts?: {
  examIds?: string[];
}): Promise<number> {
  const now = Date.now();

  const ongoing = await prisma.attempt.findMany({
    where: {
      status: AttemptStatus.ONGOING,
      ...(opts?.examIds ? { examId: { in: opts.examIds } } : {}),
    },
    select: {
      id: true,
      examId: true,
      startTime: true,
      answers: true,
      essayScores: true,
      exam: { select: { endTime: true, duration: true } },
    },
    take: 1000,
  });

  const expired = ongoing.filter((a) => {
    const deadline = getAttemptDeadline(
      a.startTime,
      a.exam.endTime,
      a.exam.duration,
    );
    return now > deadline.getTime() + SUBMIT_GRACE_SECONDS * 1000;
  });
  if (expired.length === 0) return 0;

  const examIds = [...new Set(expired.map((a) => a.examId))];
  const questionRows = await prisma.question.findMany({
    where: { exams: { some: { id: { in: examIds } } } },
    select: { ...QUESTION_GRADING_SELECT, exams: { select: { id: true } } },
  });

  let finalized = 0;
  for (const a of expired) {
    const questions: GradableQuestion[] = questionRows
      .filter((q) => q.exams.some((e) => e.id === a.examId))
      .map((q) => ({
        id: q.id,
        type: q.type,
        score: q.score,
        correctAnswer: q.correctAnswer,
      }));

    const result = gradeAttempt(
      questions,
      (a.answers as AnswersMap | null) ?? {},
      (a.essayScores as EssayScores | null) ?? null,
    );
    const deadline = getAttemptDeadline(
      a.startTime,
      a.exam.endTime,
      a.exam.duration,
    );

    const res = await prisma.attempt.updateMany({
      where: { id: a.id, status: AttemptStatus.ONGOING },
      data: {
        score: result.percent,
        status: AttemptStatus.SUBMITTED,
        endTime: deadline,
      },
    });
    finalized += res.count;
  }
  return finalized;
}
