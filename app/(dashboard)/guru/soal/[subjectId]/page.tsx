import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

import { ArrowLeft, PlusCircle } from "lucide-react";
import ImportExcelWrapper from "@/components/layout/ImportExcelWrapper";
import { Prisma, QuestionType } from "@prisma/client";
import QuestionSearchFilter from "@/components/layout/QuestionSearchFilter";
import Pagination from "@/components/layout/Pagination";
import QuestionListTable from "@/components/layout/QuestionListTable";
import ExamSimulationModal from "@/components/layout/ExamSimulationModal";
import ExportWordButton from "@/components/layout/ExportWordButton";

export default async function DaftarSoalPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{
    classId?: string;
    type?: string;
    q?: string;
    qType?: string;
    page?: string;
  }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "GURU") redirect("/login");

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const subjectId = resolvedParams.subjectId;
  const classId = resolvedSearchParams.classId ?? "";
  const typeId = resolvedSearchParams.type ?? "";

  const searchQuery = resolvedSearchParams.q ?? "";
  const filterType = resolvedSearchParams.qType ?? "";

  const currentPage = Number(resolvedSearchParams.page) || 1;
  const ITEMS_PER_PAGE = 10;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const whereClause: Prisma.QuestionWhereInput = {
    subjectId: subjectId,
    classId: classId,
    examTypeId: typeId,
  };

  if (searchQuery) {
    whereClause.text = {
      contains: searchQuery,
      mode: "insensitive",
    };
  }

  if (filterType && filterType !== "ALL") {
    whereClause.type = filterType as QuestionType;
  }

  const [subject, examType, classTarget] = await Promise.all([
    prisma.subject.findUnique({ where: { id: subjectId } }),
    typeId ? prisma.examType.findUnique({ where: { id: typeId } }) : null,
    classId ? prisma.class.findUnique({ where: { id: classId } }) : null,
  ]);

  if (!subject || !examType || !classTarget)
    return <div>Data tidak valid.</div>;

  const [questions, totalQuestions] = await Promise.all([
    prisma.question.findMany({
      where: whereClause,
      skip: skip,
      take: ITEMS_PER_PAGE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.question.count({
      where: whereClause,
    }),
  ]);

  const totalPages = Math.ceil(totalQuestions / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/guru/soal"
            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{subject.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm font-medium">
              <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-md">
                Kelas {classTarget.name}
              </span>
              <span className="text-gray-400">•</span>
              <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-md">
                {examType.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExamSimulationModal
            questions={questions}
            subjectName={subject.name}
            examName={examType.name}
          />

          <ImportExcelWrapper
            subjectId={subjectId}
            classId={classId}
            typeId={typeId}
          />

          <ExportWordButton
            questions={questions}
            subjectName={subject.name}
            className={classTarget.name}
            examName={examType.name}
          />

          <Link
            href={`/guru/soal/${subjectId}/buat?classId=${classId}&type=${typeId}`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
          >
            <PlusCircle size={18} /> Buat Soal
          </Link>
        </div>
      </div>

      <QuestionSearchFilter />

      <QuestionListTable
        questions={questions}
        subjectId={subjectId}
        classId={classId}
        typeId={typeId}
        totalOnPage={questions.length}
      />
      <Pagination totalPages={totalPages} currentPage={currentPage} />
    </div>
  );
}
