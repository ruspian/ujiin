"use client";

import { FileText } from "lucide-react";
import { toast } from "sonner";
import { exportQuestionsToWord } from "@/lib/exportWord";
import { Question } from "@prisma/client";

interface ExportWordButtonProps {
  questions: Question[];
  subjectName: string;
  className: string;
  examName: string;
}

export default function ExportWordButton({
  questions,
  subjectName,
  className,
  examName,
}: ExportWordButtonProps) {
  const handleExport = () => {
    // Kalau nggak ada soal, cegah export
    if (questions.length === 0) {
      toast.error("Tidak ada soal untuk diexport!");
      return;
    }

    toast.promise(
      exportQuestionsToWord({
        questions,
        subjectName,
        className,
        examName,
      }),
      {
        loading: "Menyiapkan dokumen Word...",
        success: "Dokumen berhasil diunduh!",
        error: "Gagal mengexport soal.",
      },
    );
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-100 shadow-sm"
      title="Export ke Microsoft Word"
    >
      <FileText size={18} /> <span className="hidden sm:inline">Export</span>
    </button>
  );
}
