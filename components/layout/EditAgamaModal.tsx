"use client";

import { updateReligion } from "@/actions/religion";
import { X, BookHeart } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { EditAgamaModalProps } from "@/types/religion";

export default function EditAgamaModal({
  itemData,
  setIsModalEditOpen,
}: EditAgamaModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await updateReligion(formData);

      if (!result.success) throw new Error(result.message);

      toast.success(result.message);
      setIsModalEditOpen(false);
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
              <BookHeart size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Edit Agama</h2>
          </div>
          <button
            onClick={() => setIsModalEditOpen(false)}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form action={handleEdit} className="space-y-4">
          <input type="hidden" name="id" value={itemData.id} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nama Agama
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={itemData.name}
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalEditOpen(false)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
