"use client";

import { createExamType } from "@/actions/exam-type";
import { X, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { AddJenisUjianModalProps } from "@/types/examType";

export default function AddJenisUjianModal({
  setIsModalOpen,
}: AddJenisUjianModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await createExamType(formData);

      if (!result.success) throw new Error(result.message);

      toast.success(result.message);
      setIsModalOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan!",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-600">
              <ClipboardList size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Tambah Jenis Ujian
            </h2>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form action={handleAdd} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kode Ujian
            </label>
            <input
              type="text"
              name="code"
              required
              maxLength={10}
              placeholder="Contoh: PTS, PAS, UH"
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm uppercase focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maksimal 10 karakter (otomatis kapital).
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nama Jenis Ujian
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Contoh: Penilaian Tengah Semester"
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
