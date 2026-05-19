"use client";

import { X, UploadCloud, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { importUsersBulk } from "@/actions/user";
import { ImportUserModalProps } from "@/types/user.admin";

interface CustomWindow extends Window {
  readXlsxFile?: (
    file: File,
    options?: { getSheets?: boolean; sheet?: string },
  ) => Promise<
    | Array<{ name?: string; sheet?: string }>
    | Array<Array<string | number | boolean | null>>
  >;
}

export default function ImportUserModal({
  setIsModalOpen,
  isSubmitting,
  setIsSubmitting,
}: ImportUserModalProps) {
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Menyiapkan library & membaca file...");

    try {
      const browserWindow = window as unknown as CustomWindow;

      if (!browserWindow.readXlsxFile) {
        const script = document.createElement("script");
        script.src =
          "https://unpkg.com/read-excel-file@9.0.9/bundle/read-excel-file.min.js";
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () =>
            reject(new Error("Gagal memuat library Excel dari internet"));
        });
      }

      const readXlsxFile = browserWindow.readXlsxFile;

      if (!readXlsxFile) {
        throw new Error("Library readXlsxFile tidak tersedia.");
      }

      const sheetsInfo = (await readXlsxFile(file, {
        getSheets: true,
      })) as Array<{
        sheet?: string;
        name?: string;
        data: Array<Array<string | number | boolean | null>>;
      }>;

      if (!sheetsInfo || sheetsInfo.length === 0) {
        throw new Error("File Excel tidak valid / tidak ada Sheet!");
      }

      const rows = sheetsInfo[0].data as Array<
        Array<string | number | boolean | null>
      >;

      if (!rows || rows.length <= 1) {
        throw new Error("File Excel kosong atau cuma berisi header!");
      }

      // hapus header
      rows.shift();

      const formattedData = rows.map((row) => ({
        name: row[0] ? String(row[0]) : "",
        username: row[1] ? String(row[1]) : "",
        password: row[2] ? String(row[2]) : "",
        role: row[3] ? String(row[3]).toUpperCase() : "GURU",
      }));

      toast.loading("Menyimpan ke database...", { id: toastId });

      const res = await importUsersBulk(formattedData);

      if (res.success) {
        toast.success(res.message, { id: toastId });
        setIsModalOpen(false);
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal memproses file Excel",
        { id: toastId },
      );
    } finally {
      setIsSubmitting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Import Data Pengguna
          </h2>
          <button
            onClick={() => setIsModalOpen(false)}
            disabled={isSubmitting}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 rounded-xl bg-blue-50 p-4 border border-blue-100">
          <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2">
            <AlertCircle size={16} /> Format Kolom Excel:
          </h3>
          <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1 ml-1 font-mono">
            <li>Nama Lengkap (Kolom A)</li>
            <li>Username (Kolom B)</li>
            <li>Password (Kolom C)</li>
            <li>Peran (Kolom D)</li>
          </ol>
        </div>

        <div className="flex items-center justify-center w-full">
          <label
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-xl transition-colors ${isSubmitting ? "bg-gray-100 cursor-not-allowed" : "bg-gray-50 hover:bg-gray-100 cursor-pointer"}`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
              <UploadCloud
                className={`w-10 h-10 mb-3 ${isSubmitting ? "text-blue-400 animate-pulse" : "text-gray-400"}`}
              />
              <p className="mb-2 text-sm text-gray-500">
                {isSubmitting ? (
                  <span className="font-bold text-blue-600">
                    Sedang diproses...
                  </span>
                ) : (
                  <>
                    <span className="font-bold text-blue-600">
                      Klik untuk upload
                    </span>{" "}
                    file .xlsx
                  </>
                )}
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".xlsx"
              disabled={isSubmitting}
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
