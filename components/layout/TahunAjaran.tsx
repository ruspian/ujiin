// src/components/layout/master/TahunAjaranClient.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Edit2,
  Trash2,
  Plus,
  Calendar,
  CheckCircle2,
  Power,
} from "lucide-react";
import { useDebounce } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Pagination from "./Pagination";
import AddAcademicModal from "./AddAcademicModal";
import MasterAdminNavbar from "./MasterAdminNavbar";
import { AcademicYearData, TahunAjaranClientProps } from "@/types/academic";
import ActivateAcademicModal from "./ActivateAcademicModal";
import EditAcademicModal from "./EditAcademicModal";
import DeleteAcademicModal from "./DeleteAcademicModal";

export default function TahunAjaran({
  academicYears,
  totalCount,
  totalPages,
  currentPage,
}: TahunAjaranClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalEditOpen, setIsModalEditOpen] = useState(false);
  const [isModalDeleteOpen, setIsModalDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AcademicYearData | null>(
    null,
  );
  const [isModalActivateOpen, setIsModalActivateOpen] = useState(false);
  const [itemToActivate, setItemToActivate] = useState<AcademicYearData | null>(
    null,
  );

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
        <h1 className="text-2xl font-bold text-gray-900">Data Master</h1>
        <p className="text-sm text-gray-500">Kelola data inti sistem ujian.</p>
      </div>

      <div className="border-b border-gray-200 overflow-x-auto">
        <MasterAdminNavbar active="tahun-ajaran" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-teal-500 focus:ring-teal-500 shadow-sm transition-all"
            placeholder="Cari tahun ajaran"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-95"
        >
          <Plus size={18} /> Tambah Data
        </button>
      </div>

      {isModalOpen && (
        <AddAcademicModal
          setIsModalOpen={setIsModalOpen}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
        />
      )}

      {isModalActivateOpen && itemToActivate && (
        <ActivateAcademicModal
          itemData={itemToActivate}
          setIsModalActivateOpen={setIsModalActivateOpen}
        />
      )}

      {isModalEditOpen && selectedItem && (
        <EditAcademicModal
          itemData={selectedItem}
          setIsModalEditOpen={setIsModalEditOpen}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
        />
      )}

      {isModalDeleteOpen && selectedItem && (
        <DeleteAcademicModal
          itemData={selectedItem}
          setIsModalDeleteOpen={setIsModalDeleteOpen}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Tahun Ajaran</th>
                <th className="px-6 py-4 font-semibold">Semester</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {academicYears.length > 0 ? (
                academicYears.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50/50 transition-colors ${item.active ? "bg-emerald-50/30" : ""}`}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.active ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"}`}
                        >
                          <Calendar size={16} />
                        </div>
                        {item.year}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${item.semester === "GANJIL" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}
                      >
                        {item.semester}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={14} /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                          Tidak Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {!item.active && (
                          <button
                            onClick={() => {
                              setItemToActivate(item);
                              setIsModalActivateOpen(true);
                            }}
                            title="Jadikan Tahun Ajaran Aktif"
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            <Power size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsModalEditOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
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
                    <p className="text-gray-500">
                      Data Tahun Ajaran belum ada.
                    </p>
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
          data="Tahun Ajaran"
        />
      </div>
    </div>
  );
}
