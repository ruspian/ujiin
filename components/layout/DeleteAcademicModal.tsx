// src/components/layout/master/DeleteAcademicModal.tsx
"use client";

import { deleteAcademicYear } from "@/actions/academic";
import { DeleteAcademicModalProps } from "@/types/academic";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function DeleteAcademicModal({
  itemData,
  setIsModalDeleteOpen,
  isSubmitting,
  setIsSubmitting,
}: DeleteAcademicModalProps) {
  const handleDelete = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await deleteAcademicYear(formData);

      if (!result.success) throw new Error(result.message);

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
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setIsModalDeleteOpen(false)}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={32} />
        </div>

        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Hapus Tahun Ajaran?
        </h2>

        <p className="mb-6 text-sm text-gray-500 leading-relaxed">
          Yakin ingin menghapus{" "}
          <span className="font-bold text-gray-900">
            {itemData.year} - {itemData.semester}
          </span>
          ? <br />
          Data yang sudah dihapus tidak bisa dikembalikan.
        </p>

        {itemData.active && (
          <div className="mb-6 rounded-xl bg-red-50 p-3 text-left text-red-700 border border-red-100">
            <p className="text-xs font-bold uppercase mb-1">Peringatan:</p>
            <p className="text-xs">
              Tahun ajaran ini sedang <strong>AKTIF</strong>. Anda harus
              mengaktifkan tahun ajaran lain terlebih dahulu sebelum bisa
              menghapus data ini.
            </p>
          </div>
        )}

        <form action={handleDelete}>
          <input type="hidden" name="id" value={itemData.id} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalDeleteOpen(false)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || itemData.active}
              className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Menghapus..." : "Ya, Hapus Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
