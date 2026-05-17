"use client";

import { importStudents } from "@/actions/student";
import { ImportStudentModalProps } from "@/types/student";
import { X, UploadCloud, Download, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ExcelCellType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | DateConstructor;

interface ExcelCell {
  value: string | number | boolean | Date | null | undefined;
  type?: ExcelCellType;
  fontWeight?: "bold";
}

interface CustomWindow extends Window {
  writeXlsxFile?: (
    data: ExcelCell[][],
    options?: { fileName: string },
  ) => Promise<void>;
  readXlsxFile?: (file: File) => Promise<unknown[][]>;
}

export default function ImportStudentModal({
  setIsModalImportOpen,
  isSubmitting,
  setIsSubmitting,
}: ImportStudentModalProps) {
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    const toastId = toast.loading("Menyiapkan template Excel...");

    try {
      const browserWindow = window as unknown as CustomWindow;

      if (!browserWindow.writeXlsxFile) {
        const script = document.createElement("script");
        script.src =
          "https://unpkg.com/write-excel-file@1.4.30/bundle/write-excel-file.min.js";
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () =>
            reject(new Error("Gagal memuat library Excel"));
        });
      }

      const writeXlsxFile = browserWindow.writeXlsxFile;
      if (!writeXlsxFile) throw new Error("Library tidak tersedia.");

      //  format template
      const excelData: ExcelCell[][] = [
        [
          { value: "nisn", fontWeight: "bold" },
          { value: "name", fontWeight: "bold" },
          { value: "className", fontWeight: "bold" },
        ],
        [
          { type: String, value: "0051234567" },
          { type: String, value: "Otong Surotong" },
          { type: String, value: "X TKJ" },
        ],
        [
          { type: String, value: "0069876543" },
          { type: String, value: "Mei Mei" },
          { type: String, value: "XI ATR" },
        ],
      ];

      await writeXlsxFile(excelData, {
        fileName: "Template_Import_Siswa.xlsx",
      });
      toast.success("Template berhasil diunduh!", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan!",
        { id: toastId },
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSubmitting(true);
      setErrorLogs([]);
      const toastId = toast.loading("Membaca file Excel...");

      const browserWindow = window as unknown as CustomWindow;

      if (!browserWindow.readXlsxFile) {
        const script = document.createElement("script");
        script.src =
          "https://unpkg.com/read-excel-file@9.0.9/bundle/read-excel-file.min.js";
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () =>
            reject(new Error("Gagal memuat library Excel"));
        });
      }

      const readXlsxFile = browserWindow.readXlsxFile;
      if (!readXlsxFile) throw new Error("Library tidak tersedia.");

      const rows = await readXlsxFile(file);

      if (!rows || rows.length <= 1) {
        toast.error("File Excel kosong atau format tidak sesuai!", {
          id: toastId,
        });
        setIsSubmitting(false);
        return;
      }

      const headers = rows[0] as string[];

      const nisnIdx = headers.findIndex(
        (h) => String(h).toLowerCase().trim() === "nisn",
      );
      const nameIdx = headers.findIndex(
        (h) => String(h).toLowerCase().trim() === "name",
      );
      const classIdx = headers.findIndex(
        (h) => String(h).toLowerCase().trim() === "classname",
      );

      if (nisnIdx === -1 || nameIdx === -1 || classIdx === -1) {
        toast.error("Format kolom (Header) tidak sesuai template!", {
          id: toastId,
        });
        setIsSubmitting(false);
        return;
      }

      const plainData = rows
        .slice(1)
        .map((row) => ({
          nisn: String(row[nisnIdx] || "").trim(),
          name: String(row[nameIdx] || "").trim(),
          className: String(row[classIdx] || "").trim(),
        }))
        .filter((row) => row.nisn && row.name && row.className); // Skip baris kosong

      if (plainData.length === 0) {
        toast.error("Tidak ada data siswa yang valid untuk diimport!", {
          id: toastId,
        });
        setIsSubmitting(false);
        return;
      }

      toast.loading(`Mengimpor ${plainData.length} siswa ke database...`, {
        id: toastId,
      });

      // Lempar data yang udah bersih ke Server Action
      const result = await importStudents(plainData);

      if (result.success) {
        toast.success(result.message, { id: toastId });
        if (result.errors && result.errors.length > 0) {
          setErrorLogs(result.errors);
        } else {
          setIsModalImportOpen(false);
        }
      } else {
        toast.error(result.message, { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("Format file tidak sesuai atau file rusak.");
    } finally {
      setIsSubmitting(false);
      e.target.value = ""; // Reset input file
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Import Data Siswa</h2>
          <button
            onClick={() => setIsModalImportOpen(false)}
            disabled={isSubmitting}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-bold text-blue-900">Instruksi:</h3>
            <ul className="mb-4 list-inside list-disc text-xs text-blue-800 space-y-1">
              <li>Pastikan format kolom (Header) sesuai dengan template.</li>
              <li>
                Kolom <strong>className</strong> harus sama persis dengan nama
                kelas di sistem (contoh: X TKJ).
              </li>
              <li>NISN tidak boleh ada yang duplikat.</li>
            </ul>
            <button
              onClick={handleDownloadTemplate}
              disabled={isDownloading || isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 shadow-sm disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {isDownloading ? "Mengunduh..." : "Download Template Excel"}
            </button>
          </div>

          <div>
            <label
              htmlFor="excel-upload"
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 transition-colors hover:bg-gray-100 ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}
            >
              <UploadCloud size={40} className="mb-3 text-teal-600" />
              <p className="mb-1 text-sm font-semibold text-gray-900">
                {isSubmitting
                  ? "Sedang memproses..."
                  : "Klik untuk unggah file .xlsx"}
              </p>
              <p className="text-xs text-gray-500">Maksimal ukuran file 5MB</p>
            </label>
            <input
              id="excel-upload"
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isSubmitting}
            />
          </div>

          {errorLogs.length > 0 && (
            <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-red-200 bg-red-50 p-4 custom-scrollbar">
              <div className="mb-2 flex items-center gap-2 text-red-800">
                <AlertCircle size={16} />
                <span className="text-sm font-bold">Log Error:</span>
              </div>
              <ul className="list-inside list-disc text-xs text-red-700 space-y-1">
                {errorLogs.map((log, i) => (
                  <li key={i}>{log}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
