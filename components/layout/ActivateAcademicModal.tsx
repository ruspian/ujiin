"use client";

import { useState } from "react";
import { setActiveAcademicYear } from "@/actions/academic";
import { X, Power, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ActivateAcademicModalProps } from "@/types/academic";

export default function ActivateAcademicModal({
  itemData,
  setIsModalActivateOpen,
}: ActivateAcademicModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleActivate = async () => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("id", itemData.id);

    try {
      const result = await setActiveAcademicYear(formData);
      if (result.success) {
        toast.success(result.message);
        setIsModalActivateOpen(false);
      } else {
        throw new Error(result.message);
      }
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
            onClick={() => setIsModalActivateOpen(false)}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <Power size={32} />
        </div>

        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Aktifkan Tahun Ajaran?
        </h2>

        <div className="mb-6 space-y-2 text-sm text-gray-500">
          <p>
            Anda akan mengaktifkan Tahun Ajaran{" "}
            <span className="font-bold text-gray-900">{itemData.year}</span>{" "}
            Semester{" "}
            <span className="font-bold text-gray-900">{itemData.semester}</span>
            .
          </p>
          <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-left text-blue-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed">
              <strong>Catatan:</strong> Mengaktifkan tahun ajaran ini akan
              secara otomatis menonaktifkan tahun ajaran lainnya. Ujian yang
              berjalan akan mengikuti tahun ajaran yang aktif.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsModalActivateOpen(false)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={handleActivate}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-50"
          >
            <Power size={18} />
            {isSubmitting ? "Memproses..." : "Aktifkan"}
          </button>
        </div>
      </div>
    </div>
  );
}
