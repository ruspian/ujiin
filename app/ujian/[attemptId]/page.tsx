import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import RuangUjian, { ClientQuestion } from "@/components/layout/RuangUjian";
import { QuestionType, AttemptStatus } from "@prisma/client";
import { AnswersMap } from "@/types/ruang-ujian";
import { getStudentAuth } from "@/lib/getStudentAuth";

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

  const safeQuestions: ClientQuestion[] = attempt.exam.questions.map((q) => ({
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
      endTime={attempt.exam.endTime}
      initialAnswers={initialAnswers}
    />
  );
}
