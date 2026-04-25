"use client";

import { useState, useEffect } from "react";
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { PenggunaProps } from "@/types/user.admin";
import { useDebounce } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Pagination from "./Pagination";
import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";

export default function DataPenggunaPage({
  users,
  totalCount,
  totalPages,
  currentPage,
}: PenggunaProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalEditOpen, setIsModalEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string | null;
    username: string;
    role: string;
  } | null>(null);

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

  const handleChangePage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manajemen Pengguna
          </h1>
          <p className="text-sm text-gray-500">
            Kelola akses akun Admin dan Guru untuk dashboard ini.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-95"
        >
          <UserPlus size={18} />
          Tambah Pengguna
        </button>
      </div>

      {isModalOpen && (
        <AddUserModal
          setIsModalOpen={setIsModalOpen}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
        />
      )}

      {isModalEditOpen && selectedUser && (
        <EditUserModal
          user={selectedUser}
          setIsModalEditOpen={setIsModalEditOpen}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
        />
      )}

      <div className="grid grid-cols-1 gap-4">
        <div className="relative md:col-span-8">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-sm border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400  focus:border-teal-500 focus:ring-teal-500 shadow-sm transition-all"
            placeholder="Cari nama atau Username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Pengguna</th>
                <th className="px-6 py-4 font-semibold">Username</th>
                <th className="px-6 py-4 font-semibold">Peran</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm ${
                            user.role === "ADMIN"
                              ? "bg-indigo-500"
                              : "bg-amber-500"
                          }`}
                        >
                          {user.role === "ADMIN" ? (
                            <ShieldCheck size={20} />
                          ) : (
                            <UserCircle size={20} />
                          )}
                        </div>
                        <span className="font-medium text-gray-900">
                          {user.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {user.username}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === "ADMIN"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser({
                              id: user.id,
                              name: user.name,
                              username: user.username,
                              role: user.role,
                            });
                            setIsModalEditOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
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
                      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center text-gray-400">
                        <Search size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-black text-gray-900 dark:text-white">
                          Produk tidak ditemukan
                        </p>
                        <p className="text-sm text-gray-500 font-medium">
                          Coba gunakan kata kunci lain atau periksa filter kamu.
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
          data="Penguna"
        />
      </div>
    </div>
  );
}
