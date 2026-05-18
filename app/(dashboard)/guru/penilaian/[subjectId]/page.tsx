import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ClipboardCheck,
  Users,
  Calendar,
  ArrowRight,
  BookOpen,
} from "lucide-react";

export default async function PilihUjianMapelPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "GURU") redirect("/login");

  const resolvedParams = await params;
  const subjectId = resolvedParams.subjectId;

  // Tarik data Mapel sekaligus Ujian yang ada di Tahun Aktif
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      exams: {
        where: {
          academicYear: { active: true },
        },
        include: {
          examType: true,
          classes: true,
          _count: {
            select: {
              attempts: {
                where: { status: "SUBMITTED" },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!subject) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100 max-w-2xl mx-auto mt-10">
        <h2 className="text-red-600 font-bold text-lg">
          Mata Pelajaran tidak ditemukan!
        </h2>
        <Link
          href="/guru/penilaian"
          className="text-blue-600 hover:underline mt-2 inline-block font-medium"
        >
          Kembali ke Daftar Mata Pelajaran
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <Link
          href="/guru/penilaian"
          className="inline-flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors mb-3"
        >
          <ChevronLeft size={16} /> Kembali ke Daftar Mapel
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">
              {subject.name}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Pilih jadwal ujian di bawah ini untuk melihat daftar siswa dan
              mulai mengoreksi.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subject.exams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all group flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <ClipboardCheck size={24} />
              </div>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                {exam.examType.name}
              </span>
            </div>

            <h3
              className="font-bold text-gray-900 mb-4 line-clamp-2"
              title={exam.title}
            >
              {exam.title}
            </h3>

            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                Kelas Peserta:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {exam.classes.map((cls) => (
                  <span
                    key={cls.id}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100"
                  >
                    {cls.name}
                  </span>
                ))}
                {exam.classes.length === 0 && (
                  <span className="text-xs text-red-500 font-medium">
                    Belum ada kelas
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100 mt-auto">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Users size={16} className="text-gray-400" />
                <span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {exam._count.attempts}
                  </span>{" "}
                  Siswa telah mengumpulkan
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Calendar size={16} className="text-gray-400" />
                <span>
                  {new Date(exam.startTime).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <Link
              href={`/guru/penilaian/${subjectId}/${exam.id}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors shadow-sm"
            >
              Lihat Daftar Siswa <ArrowRight size={16} />
            </Link>
          </div>
        ))}

        {subject.exams.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <ClipboardCheck size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium text-sm">
              Belum ada ujian yang dijadwalkan untuk mata pelajaran ini di Tahun
              Akademik aktif.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
