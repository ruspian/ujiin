import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FormSoal from "@/components/layout/FormSoal";

interface EditSoalPageProps {
  params: Promise<{ subjectId: string; questionId: string }>;
  searchParams: Promise<{ classId?: string; type?: string }>;
}

export default async function EditSoalPage({
  params,
  searchParams,
}: EditSoalPageProps) {
  const session = await auth();
  if (!session || session.user.role !== "GURU") redirect("/login");

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { subjectId, questionId } = resolvedParams;
  const classId = resolvedSearchParams.classId ?? "";
  const typeId = resolvedSearchParams.type ?? "";

  const question = await prisma.question.findUnique({
    where: {
      id: questionId,
      authorId: session.user.id,
    },
  });

  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Soal Tidak Ditemukan
        </h2>
        <p className="text-gray-500 mb-6">
          Soal ini mungkin sudah dihapus atau Anda tidak memiliki akses untuk
          mengeditnya.
        </p>
        <Link
          href={`/guru/soal/${subjectId}?classId=${classId}&type=${typeId}`}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
        >
          Kembali ke Daftar Soal
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <Link
          href={`/guru/soal/${subjectId}?classId=${classId}&type=${typeId}`}
          className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Soal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Perbarui konten atau kunci jawaban soal ini.
          </p>
        </div>
      </div>

      <FormSoal
        subjectId={subjectId}
        classId={classId}
        typeId={typeId}
        questionId={question.id}
        initialData={{
          type: question.type,
          text: question.text,
          score: question.score,
          options: question.options,
          correctAnswer: question.correctAnswer,
        }}
      />
    </div>
  );
}
