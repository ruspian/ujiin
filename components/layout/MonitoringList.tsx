"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Monitor,
  Calendar,
  Clock,
  MapPin,
  KeyRound,
  Copy,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Users,
} from "lucide-react";
import { generateExamToken } from "@/actions/ujian";
import { MonitoringListProps } from "@/types/monitoring";
import { formatDayMonth, formatTimeWithOutSeconds } from "@/lib/formatDateTime";

export default function MonitoringList({ exams }: MonitoringListProps) {
  const [loadingTokenId, setLoadingTokenId] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const handleGenerateToken = async (examId: string) => {
    setLoadingTokenId(examId);
    try {
      const result = await generateExamToken(examId);
      if (result.success) {
        toast.success(result.message);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan!",
      );
    } finally {
      setLoadingTokenId(null);
    }
  };

  const handleCopyToken = (token: string, examId: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(examId);
    toast.success("Token berhasil disalin!");
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  if (exams.length === 0) {
    return (
      <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
        <Monitor size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 font-bold text-lg">
          Anda tidak memiliki tugas pengawasan.
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Silakan hubungi Admin jika terdapat kesalahan jadwal.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5">
      {exams.map((exam) => (
        <div
          key={exam.id}
          className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-4 w-full xl:w-auto">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <Monitor size={32} />
            </div>
            <div className="space-y-2 w-full">
              <div>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-black uppercase tracking-wider">
                  {`${exam.examType.name} -  ${exam.academicYear.semester} ${exam.academicYear.year}`}
                </span>
                <h3 className="text-xl font-black text-gray-900 leading-tight mt-1">
                  {exam.title}
                </h3>
                <p className="text-sm font-bold text-teal-600">
                  {exam.subject.name}
                </p>

                <p className="text-sm text-gray-400">
                  {`Pengawas: ${exam.supervisor?.name}`}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-blue-500" />
                  {formatDayMonth(exam.startTime as Date)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-orange-500" />
                  {formatTimeWithOutSeconds(exam.startTime as string)} -{" "}
                  {formatTimeWithOutSeconds(exam.endTime as string)}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-red-500" />
                  {exam.classes.map((c) => c.name).join(", ")}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-purple-500" />
                  {exam._count.attempts} Siswa Aktif
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto bg-gray-50 p-4 rounded-xl border border-gray-100 xl:bg-transparent xl:border-none xl:p-0">
            <div className="flex-1 sm:flex-none w-full sm:w-auto">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Token Ruangan
              </p>
              {exam.token ? (
                <div className="flex items-center gap-2">
                  <code className="bg-teal-50 text-teal-700 font-black tracking-[0.2em] px-4 py-2.5 rounded-xl text-lg border border-teal-200 shadow-inner">
                    {exam.token}
                  </code>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() =>
                        handleCopyToken(exam.token as string, exam.id)
                      }
                      className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors border border-transparent hover:border-teal-100"
                      title="Salin Token"
                    >
                      {copiedTokenId === exam.id ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => handleGenerateToken(exam.id)}
                      disabled={loadingTokenId === exam.id}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 disabled:opacity-50"
                      title="Generate Ulang Token"
                    >
                      <RefreshCw
                        size={16}
                        className={
                          loadingTokenId === exam.id ? "animate-spin" : ""
                        }
                      />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleGenerateToken(exam.id)}
                  disabled={loadingTokenId === exam.id}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-sm"
                >
                  {loadingTokenId === exam.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <KeyRound size={18} />
                  )}
                  Buat Token
                </button>
              )}
            </div>

            <div className="w-full sm:w-auto h-full border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-4">
              <Link
                href={`/guru/monitoring/${exam.id}`}
                className="flex items-center justify-center w-full px-6 py-4 bg-teal-600 text-white rounded-xl font-black hover:bg-teal-700 transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
              >
                Mulai Monitoring
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
