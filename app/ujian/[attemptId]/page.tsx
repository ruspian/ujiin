import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import RuangUjian from "@/components/layout/RuangUjian";
import { QuestionType, AttemptStatus } from "@prisma/client";
import { AnswersMap, ClientQuestion } from "@/types/ruang-ujian";
import { getStudentAuth } from "@/lib/getStudentAuth";
import { finalizeExpiredAttempts } from "@/lib/finalize-attempts";
import { SUBMIT_GRACE_SECONDS, getAttemptDeadline } from "@/lib/exam-config";

// PRNG deterministik: urutan acak tetap sama untuk satu siswa walau halaman
// di-refresh, tapi berbeda antar siswa (mengurangi contek nomor per nomor).
function seededShuffle<T>(items: T[], seedText: string): T[] {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  const rand = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

  const safeQuestions: ClientQuestion[] = orderedQuestions.map((q) => ({
    id: q.id,
    type: q.type as QuestionType,
    text: q.text,
    score: q.score,
    options: q.options as unknown,
  }));

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
      serverTime={serverTime}
    />
  );
}
