"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ShieldCheck, Database } from "lucide-react"; // Tambah ikon Database
import { createFirstAdmin } from "@/actions/setup";
import { toast } from "sonner";

export default function SetupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAction = async (formData: FormData) => {
    setLoading(true);

    const result = await createFirstAdmin(formData);

    if (!result?.success) {
      toast.error(result?.message || "Terjadi kesalahan!");
      setLoading(false);
    } else {
      toast.success("Instalasi Berhasil! Silakan login.");
      router.push("/login");
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
          <Database size={28} />
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
          Setup Awal Ujiin
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Buat akun Administrator utama untuk sekolah ini.
        </p>
      </div>

      <form action={handleAction} className="mt-8 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap Admin
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="name"
                required
                className="block w-full rounded-lg py-3 pl-10 text-gray-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 border ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:bg-white transition-colors "
                placeholder="Contoh: Admin SMKN 1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username Admin
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <ShieldCheck className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="username"
                required
                className="block w-full rounded-lg py-3 pl-10 text-gray-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 border ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:bg-white transition-colors "
                placeholder="admin_ujiin"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                name="password"
                required
                className="block w-full rounded-lg py-3 pl-10 text-gray-900 focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 border ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:bg-white transition-colors "
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full justify-center rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-50 transition-all"
        >
          {loading ? "Sedang Menginstall..." : "Selesaikan Instalasi"}
        </button>
      </form>
    </div>
  );
}
