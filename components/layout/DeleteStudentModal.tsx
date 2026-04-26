"use client";

import { deleteStudent } from "@/actions/student";
import { DeleteStudentModalProps } from "@/types/student";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function DeleteStudentModal({
  studentData,
  setIsModalDeleteOpen,
  isSubmitting,
  setIsSubmitting,
}: DeleteStudentModalProps) {
  const handleDelete = async (id: string) => {
    try {
      setIsSubmitting(true);
      const result = await deleteStudent(id);

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success(result.message);
      setIsModalDeleteOpen(false);
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
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-6 text-center shadow-2xl ring-1 ring-gray-200">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={32} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Hapus Data Siswa?
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Yakin ingin menghapus data siswa{" "}
          <span className="font-semibold text-gray-900">
            {studentData.name}
          </span>
          ? Data ujian yang berkaitan dengan siswa ini mungkin tidak dapat
          diakses lagi.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsModalDeleteOpen(false)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={() => handleDelete(studentData.id)}
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
