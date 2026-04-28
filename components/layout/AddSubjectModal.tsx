"use client";

import { createSubject } from "@/actions/subject";
import { AddSubjectModalProps } from "@/types/data.master";
import { X, Users } from "lucide-react";
import { toast } from "sonner";

export default function AddSubjectModal({
  teachers,
  setIsModalOpen,
  isSubmitting,
  setIsSubmitting,
}: AddSubjectModalProps) {
  const handleAddSubject = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await createSubject(formData);

      if (!result.success) {
        throw new Error(result.message);
      }

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
          <h2 className="text-xl font-bold text-gray-900">
            Tambah Mata Pelajaran
          </h2>
          <button
            onClick={() => setIsModalOpen(false)}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form action={handleAddSubject} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nama Mata Pelajaran
            </label>
            <input
              type="text"
              name="name"
              required
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
              placeholder="Contoh: Matematika"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Users size={16} className="text-teal-600" />
              Pilih Guru Pengampu
            </label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2 space-y-1">
              {teachers.length > 0 ? (
                teachers.map((teacher) => (
                  <label
                    key={teacher.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-200/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="teacherIds" // <-- Name ini yg ditangkep getAll() di Server
                      value={teacher.id}
                      className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600"
                    />
                    <span className="text-sm text-gray-800">
                      {teacher.name}
                    </span>
                  </label>
                ))
              ) : (
                <p className="p-3 text-center text-xs text-gray-500">
                  Belum ada data Guru di sistem.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Mapel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
