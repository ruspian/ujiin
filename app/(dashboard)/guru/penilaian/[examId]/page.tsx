import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
  Search,
  UserCheck,
  Clock,
  AlertCircle,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { AttemptAnswersJSON } from "@/types/attempt";

interface Params {
  params: {
    examId: string;
  };
}

export default async function DaftarPesertaKoreksiPage({ params }: Params) {
  const { examId } = params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      subject: true,
      examType: true,
      classes: {
        include: {
          students: {
            include: {
              attempts: {
                where: { examId: examId },
              },
            },
            orderBy: { name: "asc" },
          },
        },
      },
    },
  });

  if (!exam) notFound();

  const allStudents = exam.classes.flatMap((c) =>
    c.students.map((s) => ({
      ...s,
      className: c.name,
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/guru/koreksi"
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
              <span>{exam.examType.name}</span>
              <span className="text-gray-300">•</span>
              <span>{exam.subject.name}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
          <GraduationCap className="text-blue-600" size={20} />
          <div className="text-xs">
            <p className="text-blue-900 font-bold">Total Peserta</p>
            <p className="text-blue-700 font-medium">
              {allStudents.length} Siswa Terdaftar
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between gap-4">
          <h2 className="font-bold text-gray-800 self-center">
            Daftar Hasil Ujian Siswa
          </h2>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Cari nama atau NISN..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Siswa</th>
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Nilai</th>
                <th className="px-6 py-4 text-center">Koreksi</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allStudents.map((student) => {
                const attempt = student.attempts[0];

                // cek apakah ada soal yang belum diisi
                let needsManualGrading = false;
                if (attempt?.answers) {
                  const answers =
                    attempt.answers as unknown as AttemptAnswersJSON;
                  // cek apakah ada soal yang isGraded-nya false
                  needsManualGrading = Object.values(answers).some(
                    (ans) => !ans.isGraded,
                  );
                }

                return (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50/80 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-sm">
                          {student.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          NISN: {student.nisn}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                        {student.className}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {!attempt ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 text-gray-400 text-[10px] font-bold border border-gray-100">
                            <Clock size={12} /> BELUM MULAI
                          </span>
                        ) : attempt.status === "ONGOING" ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100 animate-pulse">
                            <Clock size={12} /> MENGERJAKAN
                          </span>
                        ) : attempt.status === "CHEATED" ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">
                            <AlertCircle size={12} /> CURANG
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                            <UserCheck size={12} /> SELESAI
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-sm text-gray-800">
                      {attempt?.score !== null ? attempt?.score : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {attempt?.status === "SUBMITTED" &&
                          needsManualGrading && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[9px] font-black rounded uppercase ring-1 ring-amber-200">
                              Butuh Koreksi Esai
                            </span>
                          )}
                        {attempt?.status === "SUBMITTED" &&
                          !needsManualGrading && (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded uppercase">
                              Sudah Beres
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {attempt?.status === "SUBMITTED" && (
                        <Link
                          href={`/guru/koreksi/${examId}/${attempt.id}`}
                          className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Koreksi <ChevronRight size={14} />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
