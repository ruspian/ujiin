"use client";

import { KeyRound, UserSquare2, BookOpen, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { loginSiswaAction } from "@/actions/auth-siswa";

export default function LoginSiswaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const nisn = formData.get("nisn")?.toString();
    const password = formData.get("password")?.toString();

    if (!nisn || !password) {
      toast.error("NISN dan Password wajib diisi!");
      setLoading(false);
      return;
    }

    try {
      const result = await loginSiswaAction(nisn, password);

      if (result.success) {
        toast.success(result.message);
        router.push("/siswa");
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
          <BookOpen size={24} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Uji<span className="text-teal-600">in</span>
        </h1>
      </div>

      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-gray-100 border border-gray-50">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600 ring-8 ring-teal-50/50">
            <UserSquare2 size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Login Peserta</h2>
          <p className="text-sm text-gray-500 mt-2">
            Masuk menggunakan NISN dan Password pada kartu ujian.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              NISN
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <UserSquare2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="nisn"
                required
                disabled={loading}
                className="block w-full rounded-xl border-gray-300 py-3.5 pl-11 text-gray-900 bg-gray-50 border ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 focus:bg-white transition-all font-medium disabled:opacity-50"
                placeholder="Contoh: 0051234567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <KeyRound className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                name="password"
                required
                disabled={loading}
                className="block w-full rounded-xl border-gray-300 py-3.5 pl-11 text-gray-900 bg-gray-50 border ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 focus:bg-white transition-all font-medium disabled:opacity-50"
                placeholder="Masukkan password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full justify-center items-center gap-2 rounded-xl bg-teal-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-teal-600/30 hover:bg-teal-700 hover:shadow-teal-600/40 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? "Memeriksa Data..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
