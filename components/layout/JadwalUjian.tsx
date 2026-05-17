"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Edit2,
  Trash2,
  Plus,
  CalendarClock,
  BookOpen,
  Clock,
  Users,
  CheckCircle2,
  KeyRound,
  Copy,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useDebounce } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Pagination from "./Pagination";
import { ExamData, JadwalUjianClientProps } from "@/types/exam";
import AddJadwalModal from "./AddJadwalModal";
import EditJadwalModal from "./EditJadwalModal";
import DeleteJadwalModal from "./DeleteJadwalModal";
import { formatDateTime } from "@/lib/formatDateTime";
import { toast } from "sonner";
import { generateExamToken } from "@/actions/ujian"; // Pastikan path ini benar

export default function JadwalUjian({
  exams,
  totalCount,
  totalPages,
  currentPage,
  subjects,
  examTypes,
  classes,
  academicYears,
}: JadwalUjianClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalEditOpen, setIsModalEditOpen] = useState(false);
  const [isModalDeleteOpen, setIsModalDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ExamData | null>(null);

  const [loadingTokenId, setLoadingTokenId] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentSearch = params.get("search") || "";

    if (debouncedSearch !== currentSearch) {
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      } else {
        params.delete("search");
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [debouncedSearch, pathname, router, searchParams]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Jadwal Ujian</h1>
        <p className="text-sm text-gray-500">
          Kelola jadwal ujian, sesi, dan peserta kelas.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-teal-500 focus:ring-teal-500 shadow-sm transition-all"
            placeholder="Cari judul ujian atau mapel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => router.push("/admin/jadwal/buat")}
          className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-95"
        >
          <Plus size={18} /> Buat Jadwal
        </button>
      </div>

      {isModalOpen && (
        <AddJadwalModal
          setIsModalOpen={setIsModalOpen}
          subjects={subjects}
          examTypes={examTypes}
          classes={classes}
          academicYears={academicYears}
        />
      )}

      {isModalEditOpen && selectedItem && (
        <EditJadwalModal
          itemData={selectedItem}
          setIsModalEditOpen={setIsModalEditOpen}
          subjects={subjects}
          examTypes={examTypes}
          classes={classes}
          academicYears={academicYears}
        />
      )}

      {isModalDeleteOpen && selectedItem && (
        <DeleteJadwalModal
          itemData={selectedItem}
          setIsModalDeleteOpen={setIsModalDeleteOpen}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold w-[35%]">
                  Informasi Ujian
                </th>
                <th className="px-6 py-4 font-semibold">Pelaksanaan</th>
                <th className="px-6 py-4 font-semibold">Kelas & Status</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exams.length > 0 ? (
                exams.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 mb-1 text-base">
                        {item.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700">
                          {item.examType.code}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium">
                          <BookOpen size={12} /> {item.subject.name}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Token:
                        </span>
                        {item.token ? (
                          <div className="flex items-center gap-1.5">
                            <code className="bg-teal-50 text-teal-700 font-black tracking-[0.15em] px-2 py-0.5 rounded text-xs border border-teal-100">
                              {item.token}
                            </code>
                            <button
                              onClick={() =>
                                handleCopyToken(item.token!, item.id)
                              }
                              className="p-1 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                              title="Salin Token"
                            >
                              {copiedTokenId === item.id ? (
                                <CheckCircle2
                                  size={14}
                                  className="text-emerald-500"
                                />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => handleGenerateToken(item.id)}
                              disabled={loadingTokenId === item.id}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                              title="Generate Ulang Token"
                            >
                              <RefreshCw
                                size={14}
                                className={
                                  loadingTokenId === item.id
                                    ? "animate-spin"
                                    : ""
                                }
                              />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateToken(item.id)}
                            disabled={loadingTokenId === item.id}
                            className="flex items-center gap-1 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold transition-colors disabled:opacity-50"
                          >
                            {loadingTokenId === item.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <KeyRound size={12} />
                            )}
                            Generate
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-600 align-top">
                      <div className="flex flex-col gap-2 mt-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <CalendarClock
                            size={14}
                            className="text-teal-600 shrink-0"
                          />
                          <span>{formatDateTime(item.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                          <Clock size={14} className="shrink-0" />
                          <span>Batas: {formatDateTime(item.endTime)}</span>
                        </div>
                        <div className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 w-max mt-1 border border-gray-200">
                          Durasi: {item.duration} Menit
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-3 mt-1">
                        <div className="flex items-start gap-1.5 text-xs text-gray-600">
                          <Users
                            size={14}
                            className="mt-0.5 shrink-0 text-gray-400"
                          />
                          <div className="flex flex-wrap gap-1">
                            {item.classes.map((c) => (
                              <span
                                key={c.id}
                                className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600 border border-gray-200"
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          {item.status === "DRAFT" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 border border-orange-100">
                              <Edit2 size={10} /> DRAFT
                            </span>
                          )}
                          {item.status === "PUBLISHED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700 border border-teal-100">
                              <CheckCircle2 size={10} /> PUBLISHED
                            </span>
                          )}
                          {item.status === "COMPLETED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                              <CheckCircle2 size={10} /> SELESAI
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right align-top">
                      <div className="flex justify-end gap-2 mt-1">
                        <button
                          title="Input Soal"
                          className="rounded-lg border-2 border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 transition-colors"
                        >
                          {item._count.questions} Soal
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsModalEditOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsModalDeleteOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <CalendarClock size={40} className="text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">
                        Belum ada jadwal ujian.
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Klik &quot;Buat Jadwal&quot; untuk menambahkan.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalCount={totalCount}
          totalPages={totalPages}
          data="Jadwal Ujian"
        />
      </div>
    </div>
  );
}
