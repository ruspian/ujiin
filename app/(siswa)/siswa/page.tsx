"use client";

import { KeyRound, UserSquare2, BookOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function StudentPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExamLogin = async (formData: FormData) => {
    setLoading(true);

    const nisn = formData.get("nisn");
    const token = formData.get("token");

    // Nanti di sini kita hit API khusus untuk validasi Token & NISN
    // Simulasi sementara:
    setTimeout(() => {
      if (token === "X7B9K") {
        toast.success("Token valid! Mengalihkan ke ruang ujian...");
        // router.push("/ujian/mulai");
      } else {
        toast.error("Token ujian tidak valid atau jadwal belum dimulai!");
      }
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      {/* Branding App */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
          <BookOpen size={24} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Uji<span className="text-teal-600">in</span> Portal
        </h1>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-gray-100">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600 ring-8 ring-teal-50/50">
            <KeyRound size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Masuk Ujian</h2>
          <p className="text-sm text-gray-500 mt-2">
            Masukkan NISN dan Token ujian yang diberikan oleh pengawas.
          </p>
        </div>

        <form action={handleExamLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nomor Induk Siswa (NISN)
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <UserSquare2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="nisn"
                required
                className="block w-full rounded-xl border-gray-300 py-3.5 pl-11 text-gray-900 bg-gray-50 border ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 focus:bg-white transition-all font-medium"
                placeholder="Contoh: 0051234567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Token Ujian
            </label>
            <input
              type="text"
              name="token"
              required
              className="block w-full rounded-xl border-gray-300 py-4 text-center text-3xl font-black tracking-[0.3em] text-gray-900 uppercase bg-gray-50 border ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 focus:bg-white transition-all placeholder:text-gray-300 placeholder:font-normal placeholder:tracking-normal"
              placeholder="XXXXXX"
              maxLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full justify-center rounded-xl bg-teal-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-teal-600/30 hover:bg-teal-700 hover:shadow-teal-600/40 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? "Memverifikasi..." : "Mulai Mengerjakan"}
          </button>
        </form>
      </div>
    </div>
  );
}
