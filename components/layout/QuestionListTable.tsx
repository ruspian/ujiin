"use client";

import { useState } from "react";
import { Trash2, Settings, FileQuestion, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import DeleteQuestionModal from "@/components/layout/DeleteQuestionModal";
import { deleteManyQuestions } from "@/actions/question";
import { toast } from "sonner";
import Loader2 from "./Loader2";
import { QuestionListTableProps } from "@/types/question";
import { getSafeHTML } from "@/lib/getSafeHTML";

export default function QuestionListTable({
  questions,
  subjectId,
  classId,
  typeId,
  totalOnPage,
}: QuestionListTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map((q) => q.id));
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    const toastId = toast.loading(`Menghapus ${selectedIds.length} soal...`);

    try {
      const res = await deleteManyQuestions(selectedIds);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        setSelectedIds([]);
        setShowConfirmModal(false);
      } else {
        throw new Error(res.message);
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan!",
        { id: toastId },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {selectedIds.length > 0 && (
        <div className="p-3 bg-red-50 border-b border-red-100 flex justify-between items-center animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
              {selectedIds.length}
            </span>
            <span className="text-sm font-bold text-red-700">
              Soal terpilih
            </span>
          </div>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95"
          >
            <Trash2 size={14} /> Hapus Masal
          </button>
        </div>
      )}

      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            checked={
              selectedIds.length === questions.length && questions.length > 0
            }
            onChange={toggleSelectAll}
          />
          <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm md:text-base">
            <FileQuestion size={18} className="text-blue-500" /> Total{" "}
            {totalOnPage} Soal di Halaman Ini
          </h2>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {questions.map((q, index) => (
          <div
            key={q.id}
            className={`p-5 hover:bg-gray-50 transition-colors flex gap-4 items-start ${
              selectedIds.includes(q.id) ? "bg-blue-50/30" : ""
            }`}
          >
            <input
              type="checkbox"
              className="mt-1.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              checked={selectedIds.includes(q.id)}
              onChange={() => toggleSelect(q.id)}
            />

            <div className="bg-gray-100 text-gray-600 font-bold w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm">
              {index + 1}
            </div>

            <div className="flex-1">
              <div
                className="prose prose-sm max-w-none text-gray-800 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: getSafeHTML(q.text) }}
              />

              <span className="text-blue-600 text-[10px] font-bold bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider border border-blue-100">
                {q.type === "MULTIPLE_CHOICE" && "Pilihan Ganda"}
                {q.type === "MULTIPLE_CHOICE_COMPLEX" &&
                  "Pilihan Ganda Kompleks"}
                {q.type === "MATCHING" && "Menjodohkan"}
                {q.type === "ESSAY" && "Uraian / Esai"}
                {q.type === "TRUE_FALSE" && "Benar / Salah"}
              </span>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 font-medium">Jawaban:</span>
                  <span className="font-bold text-green-700">
                    {q.type === "MATCHING" ? (
                      <div className="flex flex-col gap-1 bg-green-50/50 p-2 rounded-lg border border-green-100 mt-1">
                        {(() => {
                          try {
                            const pairs = JSON.parse(q.correctAnswer) as {
                              left: string;
                              right: string;
                              point: number;
                            }[];
                            return pairs.map((p, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 border-b border-green-100 last:border-0 pb-1 last:pb-0"
                              >
                                <span className="text-gray-600">{p.left}</span>
                                <span className="text-gray-400">➔</span>
                                <span className="text-blue-600">{p.right}</span>
                                <span className="text-[10px] bg-green-200 text-green-800 px-1 rounded">
                                  +{p.point}
                                </span>
                              </div>
                            ));
                          } catch {
                            return "Format data rusak";
                          }
                        })()}
                      </div>
                    ) : (
                      <span className="bg-green-100 px-2 py-0.5 rounded text-green-700">
                        {q.correctAnswer}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/guru/soal/${subjectId}/edit/${q.id}?classId=${classId}&type=${typeId}`}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Settings size={18} />
              </Link>
              <DeleteQuestionModal questionId={q.id} />
            </div>
          </div>
        ))}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-6 text-center shadow-2xl ring-1 ring-gray-200">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle size={32} />
            </div>

            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Hapus Masal Soal?
            </h2>

            <p className="mb-6 text-sm text-gray-500 leading-relaxed">
              Anda akan menghapus{" "}
              <span className="font-bold text-red-600">
                {selectedIds.length} soal
              </span>{" "}
              sekaligus. <br />
              Data yang dihapus tidak dapat dikembalikan. Lanjutkan?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Menghapus...
                  </>
                ) : (
                  "Ya, Hapus Semua"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
