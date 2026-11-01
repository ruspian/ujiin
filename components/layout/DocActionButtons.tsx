"use client";

import { useState } from "react";
import { FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import type { DocBlock } from "@/lib/report-doc";

interface DocActionButtonsProps {
  /** Isi dokumen (sudah disusun di server). */
  blocks: DocBlock[];
  /** Judul jendela cetak / awalan nama file. */
  title: string;
  fileName: string;
  landscape?: boolean;
  compact?: boolean;
}

/** Tombol "Word" dan "Cetak / PDF" untuk satu dokumen. */
export default function DocActionButtons({
  blocks,
  title,
  fileName,
  landscape = false,
  compact = false,
}: DocActionButtonsProps) {
  const [busy, setBusy] = useState(false);

  const safeName = fileName.replace(/[\\/:*?"<>|]+/g, "_");

  const handleWord = async () => {
    setBusy(true);
    const id = toast.loading("Menyiapkan dokumen Word...");
    try {
      const { downloadDocx } = await import("@/lib/report-docx");
      await downloadDocx(blocks, safeName, { landscape });
      toast.success("Dokumen Word diunduh!", { id });
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat dokumen Word.", { id });
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async () => {
    try {
      const { printDoc } = await import("@/lib/report-doc");
      printDoc(title, blocks, { landscape });
      toast.message("Di jendela cetak, pilih \"Simpan sebagai PDF\" untuk PDF.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuka jendela cetak.");
    }
  };

  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl border font-bold shadow-sm transition-all active:scale-95 disabled:opacity-60 " +
    (compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleWord}
        disabled={busy}
        className={`${base} border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100`}
      >
        <FileText size={compact ? 14 : 16} /> Word
      </button>
      <button
        type="button"
        onClick={handlePrint}
        className={`${base} border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}
      >
        <Printer size={compact ? 14 : 16} /> Cetak / PDF
      </button>
    </div>
  );
}
