import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, User, Calendar } from "lucide-react";
import Link from "next/link";
import { AttemptAnswersJSON, Params } from "@/types/attempt";
import CorrectionForm from "@/components/layout/CorrectionForm";

export default async function DetailKoreksiPage({ params }: Params) {
  const { examId, attemptId } = params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      student: {
        include: { class: true },
      },
      exam: {
        include: {
          questions: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!attempt || attempt.examId !== examId) notFound();

  const parsedAnswers =
    (attempt.answers as unknown as AttemptAnswersJSON) || {};

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/guru/koreksi/${examId}`}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 border border-gray-200"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {attempt.student.name}
              </h1>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mt-1">
                <span>NISN: {attempt.student.nisn}</span>
                <span className="text-gray-300">•</span>
                <span className="text-blue-600">
                  {attempt.student.class.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-600">
          <Calendar size={16} className="text-gray-400" />
          Disubmit:{" "}
          {attempt.endTime
            ? new Date(attempt.endTime).toLocaleString("id-ID")
            : "-"}
        </div>
      </div>

      <CorrectionForm
        attemptId={attempt.id}
        examId={examId}
        studentName={attempt.student.name}
        questions={attempt.exam.questions}
        initialAnswers={parsedAnswers}
      />
    </div>
  );
}
