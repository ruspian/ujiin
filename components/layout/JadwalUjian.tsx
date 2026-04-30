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
} from "lucide-react";
import { useDebounce } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Pagination from "./Pagination";
import { ExamData, JadwalUjianClientProps } from "@/types/exam";
import AddJadwalModal from "./AddJadwalModal";
import EditJadwalModal from "./EditJadwalModal";
import DeleteJadwalModal from "./DeleteJadwalModal";
import { formatDateTime } from "@/lib/formatDateTime";

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

  const handleChangePage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.replace(`${pathname}?${params.toString()}`);
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
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-95"
        >
          <Plus size={18} /> Buat Jadwal Ujian
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
                <th className="px-6 py-4 font-semibold">Informasi Ujian</th>
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
                      <div className="font-bold text-gray-900 mb-1">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700">
                          {item.examType.code}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} /> {item.subject.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <CalendarClock size={14} className="text-teal-600" />
                          <span>{formatDateTime(item.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-red-500">
                          <Clock size={14} />
                          <span>Batas: {formatDateTime(item.endTime)}</span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-gray-900">
                          Durasi: {item.duration} Menit
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Users size={14} />
                          <span
                            className="truncate max-w-37.5"
                            title={item.classes.map((c) => c.name).join(", ")}
                          >
                            {item.classes.map((c) => c.name).join(", ")}
                          </span>
                        </div>
                        <div>
                          {item.status === "DRAFT" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                              <Edit2 size={10} /> Draft
                            </span>
                          )}
                          {item.status === "PUBLISHED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-1 text-xs font-medium text-teal-700">
                              <CheckCircle2 size={10} /> Published
                            </span>
                          )}
                          {item.status === "COMPLETED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                              <CheckCircle2 size={10} /> Selesai
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-middle">
                      <div className="flex justify-end gap-2">
                        <button
                          title="Input Soal"
                          className="rounded-lg border border-teal-600 px-3 py-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-50 transition-colors"
                        >
                          {item._count.questions} Soal
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsModalEditOpen(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-teal-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsModalDeleteOpen(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-gray-500">
                    Belum ada jadwal ujian.
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
          handlePageChange={handleChangePage}
          data="Jadwal Ujian"
        />
      </div>
    </div>
  );
}
