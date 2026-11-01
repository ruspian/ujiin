"use client";

import { useState } from "react";
import { FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import type { DocBlock } from "@/lib/report-doc";

/** Hasil pemuatan dokumen yang berat (diambil saat tombol ditekan). */
export type LoadedDoc =
  | { success: true; blocks: DocBlock[]; title: string; fileName: string }
  | { success: false; message: string };

interface DocActionButtonsProps {
  /** Isi dokumen (sudah disusun di server). Kosongkan bila memakai `loadDoc`. */
  blocks?: DocBlock[];
  /** Ambil dokumen saat dibutuhkan (untuk dokumen besar, mis. seluruh kelas). */
  loadDoc?: () => Promise<LoadedDoc>;
  /** Judul jendela cetak / awalan nama file. */
  title: string;
  fileName: string;
  landscape?: boolean;
  compact?: boolean;
}

/** Tombol "Word" dan "Cetak / PDF" untuk satu dokumen. */
export default function DocActionButtons({
  blocks,
  loadDoc,
  title,
  fileName,
  landscape = false,
  compact = false,
}: DocActionButtonsProps) {
  const [busy, setBusy] = useState(false);

  const safeName = fileName.replace(/[\\/:*?"<>|]+/g, "_");

  /** Dokumen yang akan dicetak/diunduh; null bila gagal (pesan sudah ditampilkan). */
  const resolveDoc = async () => {
    if (!loadDoc) {
      return { blocks: blocks ?? [], title, fileName: safeName };
    }
    const res = await loadDoc();
    if (!res.success) {
      toast.error(res.message);
      return null;
    }
    return {
      blocks: res.blocks,
      title: res.title,
      fileName: res.fileName.replace(/[\\/:*?"<>|]+/g, "_"),
    };
  };

  const handleWord = async () => {
    setBusy(true);
    const id = toast.loading("Menyiapkan dokumen Word...");
    try {
      const doc = await resolveDoc();
      if (!doc) {
        toast.dismiss(id);
        return;
      }
      const { downloadDocx } = await import("@/lib/report-docx");
      await downloadDocx(doc.blocks, doc.fileName, { landscape });
      toast.success("Dokumen Word diunduh!", { id });
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat dokumen Word.", { id });
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async () => {
    setBusy(true);
    try {
      const doc = await resolveDoc();
      if (!doc) return;
      const { printDoc } = await import("@/lib/report-doc");
      printDoc(doc.title, doc.blocks, { landscape });
      toast.message("Di jendela cetak, pilih \"Simpan sebagai PDF\" untuk PDF.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuka jendela cetak.");
    } finally {
      setBusy(false);
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
        disabled={busy}
        className={`${base} border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}
      >
        <Printer size={compact ? 14 : 16} /> Cetak / PDF
      </button>
    </div>
  );
}
