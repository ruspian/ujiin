import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileEdit,
} from "lucide-react";

export default async function DaftarPesertaKoreksiPage({
  params,
}: {
  params: Promise<{ subjectId: string; examId: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "GURU") redirect("/login");

  const resolvedParams = await params;
  const subjectId = resolvedParams.subjectId;
  const examId = resolvedParams.examId;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      subject: true,
      examType: true,
      classes: {
        include: {
          students: {
            orderBy: { name: "asc" },
            include: {
              attempts: {
                where: { examId: examId },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!exam) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100 max-w-2xl mx-auto mt-10">
        <h2 className="text-red-600 font-bold text-lg">
          Jadwal Ujian tidak ditemukan!
        </h2>
        <Link
          href={`/guru/penilaian/${subjectId}`}
          className="text-blue-600 hover:underline mt-2 inline-block font-medium"
        >
          Kembali ke Daftar Ujian
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link
              href={`/guru/penilaian/${subjectId}`} // 🔥 Link kembali yang bener ke halaman subject
              className="inline-flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors mb-3"
            >
              <ChevronLeft size={16} /> Kembali ke Daftar Ujian
            </Link>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">
              {exam.title}
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                {exam.subject.name}
              </span>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100 uppercase">
                {exam.examType.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {exam.classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                Kelas {cls.name}
                <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  {cls.students.length} Siswa
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                    <th className="px-6 py-4">No</th>
                    <th className="px-6 py-4">Nama Siswa</th>
                    <th className="px-6 py-4">NISN</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Nilai PG</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cls.students.map((student, index) => {
                    const attempt = student.attempts[0];

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold tracking-wider border border-gray-200">
                        <XCircle size={12} /> BELUM MULAI
                      </span>
                    );

                    if (attempt?.status === "ONGOING") {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-[10px] font-bold tracking-wider border border-yellow-200 animate-pulse">
                          <Clock size={12} /> MENGERJAKAN
                        </span>
                      );
                    } else if (attempt?.status === "CHEATED") {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold tracking-wider border border-red-200">
                          <AlertTriangle size={12} /> DISKUALIFIKASI
                        </span>
                      );
                    } else if (attempt?.status === "SUBMITTED") {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold tracking-wider border border-emerald-200">
                          <CheckCircle2 size={12} /> SELESAI
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">
                            {student.name}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                          {student.nisn}
                        </td>
                        <td className="px-6 py-4 text-center">{statusBadge}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`text-sm font-black ${attempt?.score !== null && attempt?.score !== undefined ? "text-blue-600" : "text-gray-400"}`}
                          >
                            {attempt?.score !== null &&
                            attempt?.score !== undefined
                              ? Math.round(attempt.score)
                              : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {attempt &&
                          (attempt.status === "SUBMITTED" ||
                            attempt.status === "CHEATED") ? (
                            <Link
                              href={`/guru/penilaian/${subjectId}/${examId}/${attempt.id}`}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                            >
                              <FileEdit size={14} /> Koreksi
                            </Link>
                          ) : (
                            <button
                              disabled
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold cursor-not-allowed"
                            >
                              <FileEdit size={14} /> Koreksi
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {cls.students.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-gray-500 text-sm font-medium"
                      >
                        Tidak ada siswa di kelas ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
