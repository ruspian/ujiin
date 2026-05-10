import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

import { ArrowLeft, FileQuestion, PlusCircle, Settings } from "lucide-react";
import ImportExcelWrapper from "@/components/layout/ImportExcelWrapper";
import DeleteQuestionModal from "@/components/layout/DeleteQuestionModal";
import { Prisma, QuestionType } from "@prisma/client";
import QuestionSearchFilter from "@/components/layout/QuestionSearchFilter";

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

  const questions = await prisma.question.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });

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
          <ImportExcelWrapper
            subjectId={subjectId}
            classId={classId}
            typeId={typeId}
          />

          <Link
            href={`/guru/soal/${subjectId}/buat?classId=${classId}&type=${typeId}`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
          >
            <PlusCircle size={18} /> Tambah Soal Baru
          </Link>
        </div>
      </div>

      <QuestionSearchFilter />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <FileQuestion size={18} className="text-blue-500" /> Total{" "}
            {questions.length} Soal
          </h2>
        </div>

        <div className="divide-y divide-gray-100">
          {questions.length > 0 ? (
            questions.map((q, index) => (
              <div
                key={q.id}
                className="p-5 hover:bg-gray-50 transition-colors flex gap-4 items-start"
              >
                <div className="bg-gray-100 text-gray-600 font-bold w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  {questions.length - index}
                </div>
                <div className="flex-1">
                  <div
                    className="prose prose-sm max-w-none text-gray-800 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: q.text }}
                  />

                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                    <span className="font-semibold text-green-600">
                      Jawaban: {q.correctAnswer}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/guru/soal/${subjectId}/edit/${q.id}?classId=${classId}&type=${typeId}`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                    title="Edit Soal"
                  >
                    <Settings size={18} />
                  </Link>

                  <DeleteQuestionModal questionId={q.id} />
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center flex flex-col items-center">
              <FileQuestion size={48} className="text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-gray-800">
                {searchQuery || (filterType && filterType !== "ALL")
                  ? "Soal Tidak Ditemukan"
                  : "Soal Kosong"}
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                {searchQuery || (filterType && filterType !== "ALL")
                  ? "Tidak ada soal yang cocok dengan filter pencarian Anda. Coba kata kunci lain atau reset filter."
                  : `Belum ada soal untuk Kelas ${classTarget.name} kategori ${examType.name}. Klik tombol tambah di atas untuk mulai membuat soal.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
