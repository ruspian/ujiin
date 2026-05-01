"use client";

import { useState, useTransition } from "react";
import { resetSesiSiswa } from "@/actions/monitoring";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  RefreshCcw,
  RotateCcw,
  Search,
  CheckCircle2,
  Timer,
  XCircle,
} from "lucide-react";

// Tipe Data yang strict hasil olahan halaman server
interface StudentMonitoring {
  id: string;
  nisn: string;
  name: string;
  className: string;
  hasStarted: boolean;
  status: "BELUM" | "ONGOING" | "COMPLETED" | string; // Menyesuaikan enum AttemptStatus lu
  score: number | null;
  startTime: Date | null;
}

interface MonitoringClientProps {
  examId: string;
  examTitle: string;
  subjectName: string;
  studentsData: StudentMonitoring[];
}

export default function Monitoring({
  examId,
  examTitle,
  subjectName,
  studentsData,
}: MonitoringClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const handleReset = async (studentId: string, studentName: string) => {
    if (
      !confirm(
        `Yakin ingin mereset sesi ujian untuk ${studentName}? Semua jawaban yang belum tersimpan akan hilang!`,
      )
    )
      return;

    const res = await resetSesiSiswa(examId, studentId);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const filteredStudents = studentsData.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.includes(searchTerm) ||
      s.className.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalStudents = studentsData.length;
  const countBelum = studentsData.filter((s) => !s.hasStarted).length;
  const countMengerjakan = studentsData.filter(
    (s) => s.status === "ONGOING",
  ).length;
  const countSelesai = studentsData.filter(
    (s) => s.hasStarted && s.status !== "ONGOING",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring Ujian</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            {examTitle} — <span className="text-teal-600">{subjectName}</span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          <RefreshCcw size={16} className={isPending ? "animate-spin" : ""} />
          {isPending ? "Memuat..." : "Refresh Data"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Total Peserta
          </span>
          <span className="text-2xl font-bold text-gray-900">
            {totalStudents}
          </span>
        </div>
        <div className="bg-gray-50 border-gray-200 p-4 rounded-xl border flex flex-col justify-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <XCircle size={14} /> Belum Mulai
          </span>
          <span className="text-2xl font-bold text-gray-600">{countBelum}</span>
        </div>
        <div className="bg-yellow-50 border-yellow-200 p-4 rounded-xl border flex flex-col justify-center">
          <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Timer size={14} /> Mengerjakan
          </span>
          <span className="text-2xl font-bold text-yellow-700">
            {countMengerjakan}
          </span>
        </div>
        <div className="bg-teal-50 border-teal-200 p-4 rounded-xl border flex flex-col justify-center">
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 size={14} /> Selesai
          </span>
          <span className="text-2xl font-bold text-teal-700">
            {countSelesai}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, NISN, atau kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Peserta</th>
                <th className="px-6 py-4 font-semibold">Kelas</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Nilai</th>
                <th className="px-6 py-4 font-semibold text-right">
                  Aksi Darurat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.nisn}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {s.className}
                    </td>
                    <td className="px-6 py-4">
                      {!s.hasStarted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          Belum Mulai
                        </span>
                      ) : s.status === "ONGOING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                          <Timer size={12} /> Mengerjakan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                          <CheckCircle2 size={12} /> Selesai
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {s.score !== null ? s.score : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.hasStarted && (
                        <button
                          onClick={() => handleReset(s.id, s.name)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <RotateCcw size={14} /> Reset Sesi
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Tidak ada data siswa ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
