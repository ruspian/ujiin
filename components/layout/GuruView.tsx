import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  BookOpen,
  CheckCircle2,
  FileQuestion,
  GraduationCap,
  Clock,
  ArrowRight,
  PenTool,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function GuruView({ namaGuru }: { namaGuru: string }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const guruId = session.user.id;

  const [subjectCount, activeExamCount, completedExamCount, recentExams] =
    await Promise.all([
      prisma.subject.count({
        where: { teachers: { some: { id: guruId } } },
      }),
      prisma.exam.count({
        where: { authorId: guruId, status: "PUBLISHED" },
      }),
      prisma.exam.count({
        where: { authorId: guruId, status: "COMPLETED" },
      }),
      prisma.exam.findMany({
        where: { authorId: guruId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          subject: true,
          examType: true,
          classes: true,
        },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg">
        <div className="relative z-10 md:w-2/3">
          <h1 className="mb-2 text-3xl font-bold">
            Halo, Bapak/Ibu {namaGuru}! 👨‍🏫
          </h1>
          <p className="mb-6 text-blue-100 text-sm leading-relaxed">
            Selamat datang di Ruang Guru. Kelola bank soal Anda dan pantau hasil
            ujian siswa dengan mudah dari sini.
          </p>
        </div>
        <div className="absolute -right-10 -top-20 opacity-20 hidden md:block">
          <GraduationCap size={280} strokeWidth={1} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 line-clamp-1">
              Mapel Diampu
            </p>
            <h3 className="text-2xl font-bold text-gray-900">{subjectCount}</h3>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 line-clamp-1">
              Ujian Aktif
            </p>
            <h3 className="text-2xl font-bold text-gray-900">
              {activeExamCount}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 line-clamp-1">
              Ujian Selesai
            </p>
            <h3 className="text-2xl font-bold text-gray-900">
              {completedExamCount}
            </h3>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <PenTool size={20} className="text-blue-600" /> Ujian Terbaru
          </h2>
          <Link
            href="/guru/soal"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Lihat Semua <ArrowRight size={16} />
          </Link>
        </div>

        {recentExams.length === 0 ? (
          <div className="p-12 text-center">
            <FileQuestion className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-gray-900">Belum Ada Ujian</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Anda belum membuat ujian atau bank soal. Silakan buka menu Bank
              Soal untuk mulai menyusun pertanyaan.
            </p>
            <Link
              href="/guru/soal"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Buka Bank Soal
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentExams.map((exam) => (
              <div
                key={exam.id}
                className="p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        exam.status === "PUBLISHED"
                          ? "bg-emerald-100 text-emerald-700"
                          : exam.status === "COMPLETED"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {exam.status}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {exam.examType.name}
                    </span>
                  </div>
                  <h3 className="text-md font-bold text-gray-900 line-clamp-1">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <BookOpen size={14} className="text-gray-400" />
                    {exam.subject.name} &bull; {exam.classes.length} Kelas
                  </p>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  <Link
                    href={`/guru/soal/${exam.id}`}
                    className="inline-flex w-full justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                  >
                    Detail
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
