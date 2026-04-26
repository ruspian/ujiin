"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Edit2,
  Trash2,
  Plus,
  School,
  Users,
  BookOpen,
} from "lucide-react";
import { useDebounce } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Pagination from "./Pagination";
import AddClassModal from "./AddKelasModal";
import EditClassModal from "./EditKelasModal";
import DeleteKelasModal from "./DeleteKelasModal";

interface ClassData {
  id: string;
  name: string;
  level: number;
  studentCount: number;
}

interface KelasClientProps {
  classes: ClassData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export default function Kelas({
  classes,
  totalCount,
  totalPages,
  currentPage,
}: KelasClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalEditOpen, setIsModalEditOpen] = useState(false);
  const [isModalDeleteOpen, setIsModalDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);

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
      {/* Header Info */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Master</h1>
        <p className="text-sm text-gray-500">
          Kelola data inti untuk Kelas, Siswa, dan Mata Pelajaran.
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          <Link
            href="/admin/master/kelas"
            className="flex items-center gap-2 border-b-2 border-teal-600 px-1 py-3 text-sm font-medium text-teal-600"
          >
            <School size={18} />
            Data Kelas
          </Link>
          <Link
            href="/admin/master/siswa"
            className="flex items-center gap-2 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
          >
            <Users size={18} />
            Data Siswa
          </Link>
          <Link
            href="/admin/master/mapel"
            className="flex items-center gap-2 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
          >
            <BookOpen size={18} />
            Mata Pelajaran
          </Link>
        </nav>
      </div>

      {/* Action Bar (Search & Tambah) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-teal-500 focus:ring-teal-500 shadow-sm transition-all"
            placeholder="Cari nama kelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-95"
        >
          <Plus size={18} />
          Tambah Kelas
        </button>
      </div>

      {isModalOpen && (
        <AddClassModal
          setIsModalOpen={setIsModalOpen}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
        />
      )}

      {isModalEditOpen && selectedClass && (
        <EditClassModal
          classData={selectedClass}
          setIsModalEditOpen={setIsModalEditOpen}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
        />
      )}

      {isModalDeleteOpen && selectedClass && (
        <DeleteKelasModal
          data={selectedClass}
          setIsModalDeleteOpen={setIsModalDeleteOpen}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          name="kelas"
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Tingkat</th>
                <th className="px-6 py-4 font-semibold">Nama Kelas</th>
                <th className="px-6 py-4 font-semibold">Jumlah Siswa</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <tr
                    key={cls.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                        Kelas {cls.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {cls.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users size={16} className="text-gray-400" />
                        {cls.studentCount} Siswa
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedClass(cls);
                            setIsModalEditOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedClass(cls);
                            setIsModalDeleteOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gray-50 text-gray-400">
                        <School size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-black text-gray-900">
                          Kelas tidak ditemukan
                        </p>
                        <p className="text-sm font-medium text-gray-500">
                          Data kelas masih kosong atau kata kunci tidak cocok.
                        </p>
                      </div>
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
          handlePageChange={handleChangePage}
          data="Kelas"
        />
      </div>
    </div>
  );
}
