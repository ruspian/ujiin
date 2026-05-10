"use client";

import { useState, useEffect } from "react";
import { Search, Edit2, Trash2, Plus } from "lucide-react";
import { useDebounce } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Pagination from "./Pagination";
import AddAgamaModal from "./AddAgamaModal";
import MasterAdminNavbar from "./MasterAdminNavbar";
import { AgamaClientProps, ReligionData } from "@/types/religion";
import EditAgamaModal from "./EditAgamaModal";
import DeleteAgamaModal from "./DeleteAgamaModal";

export default function Agama({
  religions,
  totalCount,
  totalPages,
  currentPage,
}: AgamaClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalEditOpen, setIsModalEditOpen] = useState(false);
  const [isModalDeleteOpen, setIsModalDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReligionData | null>(null);

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
        <MasterAdminNavbar active="agama" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-teal-500 focus:ring-teal-500 shadow-sm transition-all"
            placeholder="Cari agama..."
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

      {isModalOpen && <AddAgamaModal setIsModalOpen={setIsModalOpen} />}

      {isModalEditOpen && selectedItem && (
        <EditAgamaModal
          itemData={selectedItem}
          setIsModalEditOpen={setIsModalEditOpen}
        />
      )}

      {isModalDeleteOpen && selectedItem && (
        <DeleteAgamaModal
          itemData={selectedItem}
          setIsModalDeleteOpen={setIsModalDeleteOpen}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Nama Agama</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {religions.length > 0 ? (
                religions.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
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
                  <td colSpan={2} className="p-10 text-center text-gray-500">
                    Data Agama belum ada.
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
          data="Agama"
        />
      </div>
    </div>
  );
}
