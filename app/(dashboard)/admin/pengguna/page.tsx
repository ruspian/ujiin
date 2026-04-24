"use client";

import { useState } from "react";
import {
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

const mockUsers = [
  { id: "1", name: "Ruspian Majid", username: "admin_utama", role: "ADMIN" },
  { id: "2", name: "Pak Budi, S.Pd", username: "19880101", role: "GURU" },
  { id: "3", name: "Bu Ratna, M.Pd", username: "19880202", role: "GURU" },
];

export default function DataPenggunaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");

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
        <button className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-95">
          <UserPlus size={18} />
          Tambah Pengguna
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="relative md:col-span-8">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-teal-500 focus:ring-teal-500 shadow-sm transition-all"
            placeholder="Cari nama atau NIP/Username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative md:col-span-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            className="block w-full rounded-xl border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-teal-500 focus:ring-teal-500 shadow-sm transition-all appearance-none"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="ALL">Semua Peran</option>
            <option value="ADMIN">Admin</option>
            <option value="GURU">Guru</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Pengguna</th>
                <th className="px-6 py-4 font-semibold">Username / NIP</th>
                <th className="px-6 py-4 font-semibold">Peran</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockUsers.map((user) => (
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
                      <button className="p-2 text-gray-400 hover:text-teal-600 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
