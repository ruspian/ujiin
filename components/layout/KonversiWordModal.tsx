"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, UploadCloud, X, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { buildSoalSheets, plainPreview } from "@/lib/word-soal-excel";
import type { SoalRow } from "@/lib/word-soal";

const LABEL: Record<SoalRow["Tipe_Soal"], string> = {
  MULTIPLE_CHOICE: "Pilihan Ganda",
  MULTIPLE_CHOICE_COMPLEX: "PG Kompleks",
  MATCHING: "Menjodohkan",
  ESSAY: "Esai",
  TRUE_FALSE: "Benar/Salah",
};

type Hasil = {
  rows: SoalRow[];
  warnings: string[];
  counts: Record<SoalRow["Tipe_Soal"], number>;
};

export default function KonversiWordModal({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [namaFile, setNamaFile] = useState("");

  const baca = async (file: File) => {
    setBusy(true);
    setHasil(null);
    setNamaFile(file.name);
    try {
      const res = await fetch(`/api/v1/soal-word`, {
        method: "POST",
        body: file,
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.message || "Gagal membaca file.");
      setHasil(j as Hasil);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membaca file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const unduhExcel = async () => {
    if (!hasil) return;
    const { default: writeXlsxFile } = await import("write-excel-file");
    const { sheets, data } = buildSoalSheets(hasil.rows);
    const base = namaFile.replace(/\.docx$/i, "") || "Soal";
    await writeXlsxFile(data, { sheets, fileName: `${base}-siap-upload.xlsx` });
    toast.success("Excel diunduh. Isi kunci jawaban dan skor, lalu upload lewat Import.");
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          disabled={busy}
          aria-label="Tutup"
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Konversi Soal dari Word</h2>
            <p className="text-xs text-gray-500">
              Unggah file .docx; soal dan pilihan jawaban dijadikan Excel sesuai template.
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && baca(e.target.files[0])}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {busy && !hasil ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
            {hasil ? "Pilih file lain" : "Pilih file Word (.docx)"}
          </button>
          <p className="basis-full text-xs text-gray-400">
            Kunci jawaban dan skor tidak dibaca. Isi sendiri di file Excel hasilnya, lalu upload lewat tombol Import.
          </p>
        </div>

        {hasil && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mb-3 flex flex-wrap gap-2">
              {(Object.keys(LABEL) as SoalRow["Tipe_Soal"][])
                .filter((k) => hasil.counts[k] > 0)
                .map((k) => (
                  <span key={k} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    {LABEL[k]}: {hasil.counts[k]}
                  </span>
                ))}
            </div>

            {hasil.warnings.length > 0 ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <p className="mb-1 flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={14} /> {hasil.warnings.length} hal perlu dicek
                </p>
                <ul className="list-disc space-y-0.5 pl-5">
                  {hasil.warnings.slice(0, 12).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-green-700">
                <CheckCircle2 size={14} /> Semua soal terbaca.
              </p>
            )}

            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Jenis</th>
                    <th className="px-3 py-2">Soal</th>
                  </tr>
                </thead>
                <tbody>
                  {hasil.rows.map((r, i) => (
                    <tr key={i} className="border-t border-gray-100 align-top">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2">{LABEL[r.Tipe_Soal]}</td>
                      <td className="px-3 py-2">{plainPreview(r.Teks_Soal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {hasil && hasil.rows.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={unduhExcel}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Download size={18} /> Unduh Excel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
