"use client";

import { deleteClass } from "@/actions/class";
import { DeleteKelasModalProps } from "@/schemas/classSchema";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function DeleteKelasModal({
  data,
  setIsModalDeleteOpen,
  isSubmitting,
  setIsSubmitting,
  name,
}: DeleteKelasModalProps) {
  const handleDelete = async (id: string) => {
    try {
      setIsSubmitting(true);
      const result = await deleteClass(id);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200 animate-in fade-in zoom-in-95 duration-200 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={32} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">Hapus {name}?</h2>
        <p className="mb-6 text-sm text-gray-500">
          Apakah Anda yakin ingin menghapus {name}{" "}
          <span className="font-semibold text-gray-900">{data.name}</span>?
          Tindakan ini tidak dapat dibatalkan.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsModalDeleteOpen(false)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            onClick={() => handleDelete(data.id)}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
