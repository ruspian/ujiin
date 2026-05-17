"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { verifikasiTokenUjian } from "@/actions/ujian";
import { ClientFormTokenProps } from "@/types/ruang-ujian";

export default function ClientFormToken({
  examId,
  studentId,
  subjectName,
  examTypeName,
}: ClientFormTokenProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExamLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const token = formData.get("token")?.toString();

    if (!token) {
      toast.error("Token wajib diisi!");
      setLoading(false);
      return;
    }

    try {
      const result = await verifikasiTokenUjian(examId, studentId, token);

      if (result.success && result.attemptId) {
        toast.success(result.message);
        router.push(`/ujian/${result.attemptId}`);
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
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-gray-100">
      <div className="mb-8 text-center">
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-teal-50 text-teal-700 border border-teal-100">
          {examTypeName}
        </span>
        <h2 className="text-2xl font-black text-gray-900 mt-2">
          {subjectName}
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Masukkan Token ujian yang diberikan oleh pengawas untuk mulai
          mengerjakan.
        </p>
      </div>

      <form onSubmit={handleExamLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 text-center">
            TOKEN UJIAN
          </label>
          <input
            type="text"
            name="token"
            required
            disabled={loading}
            className="block w-full rounded-xl border-gray-300 py-4 text-center text-3xl font-black tracking-[0.3em] text-gray-900 uppercase bg-gray-50 border ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 focus:bg-white transition-all placeholder:text-gray-300 placeholder:font-normal placeholder:tracking-normal disabled:opacity-50"
            placeholder="XXXXXX"
            maxLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full justify-center rounded-xl bg-teal-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-teal-600/30 hover:bg-teal-700 hover:shadow-teal-600/40 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {loading ? "Memverifikasi Token..." : "Mulai Mengerjakan"}
        </button>
      </form>
    </div>
  );
}
