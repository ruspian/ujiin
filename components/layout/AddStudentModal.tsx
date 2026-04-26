"use client";

import { createStudent } from "@/actions/student";
import { AddStudentModalProps } from "@/types/student";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function AddStudentModal({
  classes,
  setIsModalOpen,
  isSubmitting,
  setIsSubmitting,
}: AddStudentModalProps) {
  const handleAddStudent = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await createStudent(formData);

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
          <h2 className="text-xl font-bold text-gray-900">Tambah Siswa Baru</h2>
          <button
            onClick={() => setIsModalOpen(false)}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form action={handleAddStudent} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              NISN
            </label>
            <input
              type="text"
              name="nisn"
              required
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
              placeholder="Contoh: 0051234567"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nama Lengkap
            </label>
            <input
              type="text"
              name="name"
              required
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
              placeholder="Contoh: Ahmad Fadillah"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kelas
            </label>
            <select
              name="classId"
              required
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Pilih Kelas</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
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
              {isSubmitting ? "Menyimpan..." : "Simpan Siswa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
