"use client";

import { useState, useEffect } from "react";
import { Search, Activity, Clock, Users, BookOpen } from "lucide-react";
import { useDebounce } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Pagination from "@/components/layout/Pagination";

interface ExamListItem {
  id: string;
  title: string;
  subjectName: string;
  examTypeCode: string;
  startTime: Date;
  endTime: Date;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED";
  classesCount: number;
  attemptsCount: number;
}

interface MonitoringListClientProps {
  exams: ExamListItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export default function MonitoringList({
  exams,
  totalCount,
  totalPages,
  currentPage,
}: MonitoringListClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 500);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Pilih Ujian untuk Dipantau
        </h1>
        <p className="text-sm text-gray-500">
          Pilih jadwal ujian yang sedang atau akan berlangsung untuk melihat
          aktivitas siswa secara real-time.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
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
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">
                  Ujian & Mata Pelajaran
                </th>
                <th className="px-6 py-4 font-semibold">Pelaksanaan (WITA)</th>
                <th className="px-6 py-4 font-semibold">Status & Peserta</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exams.length > 0 ? (
                exams.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 mb-1">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700">
                          {item.examTypeCode}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} /> {item.subjectName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock size={14} className="text-teal-600" />
                          <span>Mulai: {formatDateTime(item.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock size={14} className="text-red-500" />
                          <span>Tutup: {formatDateTime(item.endTime)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1 text-xs text-gray-700 font-semibold">
                          <Users size={14} className="text-blue-500" />
                          {item.classesCount} Kelas ({item.attemptsCount} Sesi
                          Aktif)
                        </div>
                        <div>
                          {item.status === "DRAFT" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                              DRAFT
                            </span>
                          )}
                          {item.status === "PUBLISHED" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-700">
                              PUBLISHED
                            </span>
                          )}
                          {item.status === "COMPLETED" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                              SELESAI
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-middle">
                      <Link
                        href={`/admin/monitoring/${item.id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 px-4 py-2 text-xs font-bold hover:bg-teal-600 hover:text-white transition-all active:scale-95"
                      >
                        <Activity size={14} /> Pantau Ujian
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-gray-500">
                    Belum ada ujian yang tersedia untuk dipantau.
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
          data="Ujian"
        />
      </div>
    </div>
  );
}
