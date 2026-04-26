// src/components/layout/master/EditClassModal.tsx
"use client";

import { updateClass } from "@/actions/class";
import { X } from "lucide-react";
import { toast } from "sonner";

interface EditClassModalProps {
  classData: { id: string; name: string; level: number };
  setIsModalEditOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export default function EditClassModal({
  classData,
  setIsModalEditOpen,
  isSubmitting,
  setIsSubmitting,
}: EditClassModalProps) {
  const handleEditClass = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await updateClass(formData);

      if (!result.success) {
        throw new Error(result.message);
      }

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
          <h2 className="text-xl font-bold text-gray-900">Edit Data Kelas</h2>
          <button
            onClick={() => setIsModalEditOpen(false)}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form action={handleEditClass} className="space-y-4">
          {/* Hidden input ID */}
          <input type="hidden" name="id" value={classData.id} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tingkat Kelas
            </label>
            <input
              type="number"
              name="level"
              required
              min="1"
              max="13"
              defaultValue={classData.level}
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nama Kelas / Rombel
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={classData.name}
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalEditOpen(false)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
