"use client";

import { importStudents } from "@/actions/student";
import { ImportStudentModalProps, RawExcelRow } from "@/types/student";
import { X, UploadCloud, Download, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function ImportStudentModal({
  setIsModalImportOpen,
  isSubmitting,
  setIsSubmitting,
}: ImportStudentModalProps) {
  const [errorLogs, setErrorLogs] = useState<string[]>([]);

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { nisn: "0051234567", name: "Otong Surotong", className: "X TKJ" },
      { nisn: "0069876543", name: "mei mei", className: "XI ATR" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
    XLSX.writeFile(wb, "Template_Import_Siswa.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSubmitting(true);
      setErrorLogs([]);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const rawJsonData = XLSX.utils.sheet_to_json<RawExcelRow>(worksheet);

      if (rawJsonData.length === 0) {
        toast.error("File Excel kosong!");
        return;
      }

      const plainData = rawJsonData.map((row) => ({
        nisn: String(row.nisn || "").trim(),
        name: String(row.name || "").trim(),
        className: String(row.className || "").trim(),
      }));

      // Lempar data yang udah bersih ke Server Action
      const result = await importStudents(plainData);

      if (result.success) {
        toast.success(result.message);
        if (result.errors && result.errors.length > 0) {
          // Kalau ada error
          setErrorLogs(result.errors);
        } else {
          // Kalau sukses semua
          setIsModalImportOpen(false);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Format file tidak sesuai atau file rusak.");
    } finally {
      setIsSubmitting(false);
      // Reset input file
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Import Data Siswa</h2>
          <button
            onClick={() => setIsModalImportOpen(false)}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
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
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 shadow-sm"
            >
              <Download size={14} />
              Download Template Excel
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
            <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-red-200 bg-red-50 p-4">
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
