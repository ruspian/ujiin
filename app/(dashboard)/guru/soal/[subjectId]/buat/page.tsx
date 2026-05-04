import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import FormSoal from "@/components/layout/FormSoal";

export default async function TambahSoalPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ classId?: string; type?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "GURU") redirect("/login");

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const subjectId = resolvedParams.subjectId;
  const classId = resolvedSearchParams.classId ?? "";
  const typeId = resolvedSearchParams.type ?? "";

  if (!typeId || !classId || !subjectId)
    return <div>Kategori ujian tidak ditemukan.</div>;

  const [subject, examType, classTarget] = await Promise.all([
    prisma.subject.findUnique({ where: { id: subjectId } }),
    prisma.examType.findUnique({ where: { id: typeId } }),
    classId ? prisma.class.findUnique({ where: { id: classId } }) : null,
  ]);

  if (!subject || !examType) return <div>Data referensi tidak valid.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <Link
          href={`/guru/soal/${subjectId}?classId=${classId}&type=${typeId}`}
          className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Buat Soal Baru</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mapel:{" "}
            <span className="font-semibold text-gray-700">{subject.name}</span>{" "}
            • Kelas:{" "}
            <span className="font-semibold text-gray-700">
              {classTarget?.name}
            </span>{" "}
            • Kategori:{" "}
            <span className="font-semibold text-gray-700">{examType.name}</span>
          </p>
        </div>
      </div>

      <FormSoal subjectId={subjectId} classId={classId} typeId={typeId} />
    </div>
  );
}
