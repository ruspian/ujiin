"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { deleteQuestion } from "@/actions/question";

export default function DeleteQuestionModal({
  questionId,
}: {
  questionId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const toastId = toast.loading("Menghapus soal...");

    try {
      const result = await deleteQuestion(questionId);

      if (result.success) {
        toast.success(result.message, { id: toastId });
        setIsOpen(false);
      } else {
        toast.error(result.message, { id: toastId });
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error("Terjadi kesalahan jaringan saat menghapus soal.", {
        id: toastId,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
        title="Hapus Soal"
      >
        <Trash2 size={18} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-6 text-center shadow-2xl ring-1 ring-gray-200">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle size={32} />
            </div>

            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Hapus Soal Ini?
            </h2>

            <p className="mb-6 text-sm text-gray-500 leading-relaxed">
              Yakin ingin menghapus soal ini dari bank soal? <br />
              Data yang sudah dihapus tidak bisa dikembalikan.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
