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
  AlertTriangle,
  X,
} from "lucide-react";
import { MonitoringClientProps, ViolationLog } from "@/types/monitoring";
import { formatTime } from "@/lib/formatDateTime";

export default function Monitoring({
  examId,
  examTitle,
  subjectName,
  studentsData,
}: MonitoringClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // State untuk Modal Pelanggaran
  const [selectedCheatLog, setSelectedCheatLog] = useState<{
    name: string;
    logs: ViolationLog[];
  } | null>(null);

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
  const countMengerjakan = studentsData.filter(
    (s) => s.status === "ONGOING",
  ).length;
  const countCurang = studentsData.filter((s) => s.violationCount > 0).length;

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
        <div className="bg-yellow-50 border-yellow-200 p-4 rounded-xl border flex flex-col justify-center">
          <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Timer size={14} /> Mengerjakan
          </span>
          <span className="text-2xl font-bold text-yellow-700">
            {countMengerjakan}
          </span>
        </div>
        <div
          className={`p-4 rounded-xl border flex flex-col justify-center ${countCurang > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}
        >
          <span
            className={`text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${countCurang > 0 ? "text-red-600" : "text-gray-500"}`}
          >
            <AlertTriangle size={14} /> Terindikasi Curang
          </span>
          <span
            className={`text-2xl font-bold ${countCurang > 0 ? "text-red-700 animate-pulse" : "text-gray-600"}`}
          >
            {countCurang} Siswa
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, NISN..."
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
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-center">
                  Pelanggaran
                </th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500">
                        {s.nisn} • {s.className}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {!s.hasStarted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          Belum
                        </span>
                      ) : s.status === "ONGOING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                          <Timer size={12} /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                          <CheckCircle2 size={12} /> Selesai
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {s.violationCount > 0 ? (
                        <button
                          onClick={() =>
                            setSelectedCheatLog({
                              name: s.name,
                              logs: s.violationLogs,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors cursor-pointer ring-1 ring-red-300"
                        >
                          <AlertTriangle size={14} /> {s.violationCount}{" "}
                          Peringatan
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.hasStarted && (
                        <button
                          onClick={() => handleReset(s.id, s.name)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <RotateCcw size={14} /> Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCheatLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-red-50">
              <h3 className="font-bold text-red-800 flex items-center gap-2">
                <AlertTriangle size={18} /> Log Pelanggaran
              </h3>
              <button
                onClick={() => setSelectedCheatLog(null)}
                className="text-gray-500 hover:text-gray-900 bg-white rounded-full p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm font-semibold text-gray-800 mb-4">
                Siswa: {selectedCheatLog.name}
              </p>
              <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                {selectedCheatLog.logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 text-sm border-l-2 border-red-400 pl-3"
                  >
                    <div className="text-xs font-mono text-gray-500 pt-0.5">
                      {formatTime(log.time)}
                    </div>
                    <div className="text-gray-800 font-medium">
                      {log.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
              <button
                onClick={() => setSelectedCheatLog(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-xl text-sm hover:bg-gray-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
