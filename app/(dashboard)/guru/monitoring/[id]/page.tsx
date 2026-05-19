import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  UserX,
} from "lucide-react";
import AutoRefresh from "@/components/layout/AutoRefresh";
import { resetSesiSiswa } from "@/actions/monitoring";

export default async function DetailMonitoringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "GURU") redirect("/login");

  const { id } = await params;

  const exam = await prisma.exam.findUnique({
    where: {
      id: id,
      supervisorId: session.user.id,
    },
    include: {
      subject: true,
      attempts: true,
      classes: {
        include: {
          students: { orderBy: { name: "asc" } },
        },
      },
    },
  });

  if (!exam) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-10 text-center bg-white rounded-3xl border border-gray-200">
        <ShieldAlert size={64} className="text-red-500 mb-6" />
        <h2 className="text-2xl font-black text-gray-900">Akses Ditolak</h2>
        <Link href="/guru/monitoring" className="mt-6 text-blue-600 font-bold">
          Kembali ke Jadwal
        </Link>
      </div>
    );
  }

  const allStudents = exam.classes
    .flatMap((c) => c.students)
    .sort((a, b) => a.name.localeCompare(b.name));

  const studentStatuses = allStudents.map((student) => {
    const attempt = exam.attempts.find((a) => a.studentId === student.id);
    return {
      student,
      attempt: attempt || null,
    };
  });

  //  Statistik
  const totalPeserta = allStudents.length;
  const sudahSubmit = exam.attempts.filter(
    (a) => a.status === "SUBMITTED",
  ).length;
  const sedangMengerjakan = exam.attempts.filter(
    (a) => a.status === "ONGOING",
  ).length;
  const belumMulai =
    totalPeserta -
    (sudahSubmit +
      sedangMengerjakan +
      exam.attempts.filter((a) => a.status === "CHEATED").length);
  const bermasalah = exam.attempts.filter((a) => a.violationCount > 0).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AutoRefresh interval={5000} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <Link
            href="/guru/monitoring"
            className="text-xs font-bold text-gray-400 hover:text-teal-600 flex items-center gap-1 mb-3 w-fit px-2 py-1 bg-gray-50 rounded-md transition-colors"
          >
            <ChevronLeft size={14} /> KEMBALI
          </Link>
          <h1 className="text-2xl font-black text-gray-900 leading-tight">
            {exam.title}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-sm font-bold text-gray-500">
            <span className="text-teal-600">{exam.subject.name}</span>
            <span>•</span>
            <span>{exam.classes.map((c) => c.name).join(", ")}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center gap-2 shadow-sm">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute" />
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative" />
            <span className="text-sm font-black uppercase tracking-widest ml-1">
              Live Sync
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center shrink-0">
            <UserX size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Belum Mulai
            </p>
            <p className="text-2xl font-black text-gray-800">{belumMulai}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
            <RefreshCcw size={24} className="animate-spin-slow" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Mengerjakan
            </p>
            <p className="text-2xl font-black text-gray-800">
              {sedangMengerjakan}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Selesai
            </p>
            <p className="text-2xl font-black text-gray-800">{sudahSubmit}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Pelanggaran
            </p>
            <p className="text-2xl font-black text-gray-800">{bermasalah}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
            Absensi & Status Kelas
          </h3>
          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
            <Clock size={12} /> Auto-Sync Aktif
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">Nama Siswa</th>
                <th className="px-6 py-4">Waktu Mulai</th>
                <th className="px-6 py-4">Pelanggaran</th>
                <th className="px-6 py-4 text-center">Status Ujian</th>
                <th className="px-6 py-4 text-right">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {studentStatuses.map((row, index) => (
                <tr
                  key={row.student.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4 text-xs font-bold text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 text-sm">
                      {row.student.name}
                    </p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      {row.student.nisn}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-xs text-gray-600 font-bold">
                    {row.attempt
                      ? row.attempt.startTime.toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "-"}
                  </td>

                  <td className="px-6 py-4">
                    {row.attempt ? (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${row.attempt.violationCount > 3 ? "bg-red-500 animate-pulse" : row.attempt.violationCount > 0 ? "bg-orange-400" : "bg-gray-200"}`}
                        />
                        <span
                          className={`text-xs font-black ${row.attempt.violationCount > 3 ? "text-red-600" : row.attempt.violationCount > 0 ? "text-orange-600" : "text-gray-400"}`}
                        >
                          {row.attempt.violationCount} Kali
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300 font-bold">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    {!row.attempt ? (
                      <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm bg-gray-50 border-gray-200 text-gray-500">
                        BELUM MULAI
                      </span>
                    ) : (
                      <span
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                          row.attempt.status === "SUBMITTED"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : row.attempt.status === "CHEATED"
                              ? "bg-red-50 border-red-200 text-red-700"
                              : "bg-blue-50 border-blue-200 text-blue-700"
                        }`}
                      >
                        {row.attempt.status === "ONGOING"
                          ? "Aktif"
                          : row.attempt.status}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    {row.attempt ? (
                      <form action={resetSesiSiswa}>
                        <input type="hidden" name="examId" value={id} />
                        <input
                          type="hidden"
                          name="studentId"
                          value={row.student.id}
                        />

                        <button
                          type="submit"
                          title="Gunakan ini jika siswa error/keluar sendiri"
                          className="text-[10px] font-black text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl border border-red-100 transition-all active:scale-95 uppercase tracking-tighter"
                        >
                          Reset Sesi
                        </button>
                      </form>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">
                        Belum Ada Sesi
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
