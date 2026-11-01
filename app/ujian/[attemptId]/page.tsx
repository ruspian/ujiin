import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import RuangUjian from "@/components/layout/RuangUjian";
import { QuestionType, AttemptStatus } from "@prisma/client";
import { AnswersMap, ClientQuestion } from "@/types/ruang-ujian";
import { getStudentAuth } from "@/lib/getStudentAuth";
import { finalizeExpiredAttempts } from "@/lib/finalize-attempts";
import { SUBMIT_GRACE_SECONDS, getAttemptDeadline } from "@/lib/exam-config";
import { seededShuffle } from "@/lib/seeded-shuffle";

interface PageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function HalamanUjian({ params }: PageProps) {
  const student = await getStudentAuth();

  if (!student) {
    redirect("/login-siswa");
  }

  const { attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          subject: true,
          questions: {
            orderBy: { createdAt: "asc" }, // Urutkan biar konsisten
          },
        },
      },
    },
  });

  if (!attempt || attempt.studentId !== student.id) {
    redirect("/siswa");
  }

  if (attempt.status === AttemptStatus.SUBMITTED) {
    redirect("/siswa?error=sudah_selesai");
  }

  if (attempt.status === AttemptStatus.CHEATED) {
    redirect("/siswa?error=pelanggaran");
  }

  // Waktu efektif = min(jam selesai jadwal, mulai mengerjakan + durasi)
  const deadline = getAttemptDeadline(
    attempt.startTime,
    attempt.exam.endTime,
    attempt.exam.duration,
    attempt.extraSeconds,
  );
  const serverTime = new Date();

  if (serverTime.getTime() > deadline.getTime() + SUBMIT_GRACE_SECONDS * 1000) {
    // Waktu sudah habis: kumpulkan otomatis memakai jawaban tersimpan
    await finalizeExpiredAttempts({ examIds: [attempt.examId] });
    redirect("/siswa?error=sudah_selesai");
  }

  const orderedQuestions = attempt.exam.randomizeQuestions
    ? seededShuffle(attempt.exam.questions, attempt.id)
    : attempt.exam.questions;

  // Acak urutan pilihan (opsional). Jawaban tersimpan berdasarkan id opsi, jadi
  // penilaian tidak terpengaruh: yang diacak hanya urutan tampilannya.
  const shuffleOptions = attempt.exam.shuffleOptions;
  const safeQuestions: ClientQuestion[] = orderedQuestions.map((q) => {
    const isChoice =
      q.type === QuestionType.MULTIPLE_CHOICE ||
      q.type === QuestionType.MULTIPLE_CHOICE_COMPLEX;
    return {
      id: q.id,
      type: q.type as QuestionType,
      text: q.text,
      score: q.score,
      options:
        shuffleOptions && isChoice && Array.isArray(q.options)
          ? seededShuffle(q.options as unknown[], `${attempt.id}:${q.id}`)
          : (q.options as unknown),
    };
  });

  const initialAnswers = (attempt.answers as AnswersMap) || {};

  return (
    <RuangUjian
      attemptId={attempt.id}
      examName={attempt.exam.title}
      subjectName={attempt.exam.subject.name}
      questions={safeQuestions}
      endTime={deadline}
      initialAnswers={initialAnswers}
      initialSeq={attempt.saveSeq}
      letterByPosition={shuffleOptions}
      serverTime={serverTime}
    />
  );
}
