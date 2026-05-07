"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  Loader2,
  Download,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { importQuestions } from "@/actions/question";
import { ExcelRow, Props, RowCell } from "@/types/question";

export default function ImportExcelButton({
  subjectId,
  classId,
  typeId,
}: Props) {
  // State buat buka/tutup Modal
  const [isOpen, setIsOpen] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Membaca file Excel...");

    try {
      const readXlsxFile = (await import("read-excel-file")).default;
      const sheetsInfo = (await readXlsxFile(file, { getSheets: true })) as {
        name: string;
      }[];

      if (!sheetsInfo || sheetsInfo.length === 0) {
        toast.error("File Excel tidak valid!", { id: toastId });
        setIsUploading(false);
        return;
      }

      let allJsonData: ExcelRow[] = [];

      for (const sheet of sheetsInfo) {
        const sheetName = sheet.name.toUpperCase();

        let defaultType = "MULTIPLE_CHOICE";
        if (sheetName.includes("KOMPLEKS"))
          defaultType = "MULTIPLE_CHOICE_COMPLEX";
        else if (sheetName.includes("JODOH") || sheetName.includes("MATCHING"))
          defaultType = "MATCHING";
        else if (sheetName.includes("ESAI") || sheetName.includes("URAIAN"))
          defaultType = "ESSAY";

        const rows = (await readXlsxFile(file, {
          sheet: sheet.name,
        })) as RowCell[][];
        if (!rows || rows.length <= 1) continue;

        const headers = rows[0] as string[];

        const sheetData: ExcelRow[] = rows.slice(1).map((row: RowCell[]) => {
          const obj: ExcelRow = { Tipe_Soal: defaultType };

          row.forEach((cell: RowCell, index: number) => {
            const header = headers[index];
            if (
              header &&
              (typeof cell === "string" || typeof cell === "number")
            ) {
              obj[header] = cell;
            }
          });
          return obj;
        });

        allJsonData = [...allJsonData, ...sheetData];
      }

      if (allJsonData.length === 0) {
        toast.error("Tidak ada data soal yang ditemukan di semua sheet!", {
          id: toastId,
        });
        setIsUploading(false);
        return;
      }

      toast.loading(
        `Menyimpan total ${allJsonData.length} soal ke database...`,
        { id: toastId },
      );

      const result = await importQuestions({
        subjectId,
        classId,
        typeId,
        questions: allJsonData,
      });

      if (result.success) {
        toast.success(result.message, { id: toastId });
        setIsOpen(false);
      } else {
        toast.error(result.message, { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("Format Excel tidak valid. Pastikan sesuai template.", {
        id: toastId,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-xl transition-colors"
      >
        <FileSpreadsheet size={18} />
        Import Excel
      </button>

      <input
        type="file"
        accept=".xlsx"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center mb-6 mt-2">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                <FileSpreadsheet size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Import Soal dari Excel
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Gunakan template resmi kami agar sistem dapat membaca soal
                dengan benar.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href="/Template_Soal.xlsx"
                download
                className={`flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 hover:bg-gray-50 rounded-xl transition-colors ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Download size={18} />
                Download Template Excel
              </a>

              <div className="relative flex items-center py-2">
                <div className="grow border-t border-gray-200"></div>
                <span className="shrink-0 mx-4 text-xs font-medium text-gray-400 uppercase">
                  Sudah Punya File?
                </span>
                <div className="grow border-t border-gray-200"></div>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:bg-green-400"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sedang Memproses...
                  </>
                ) : (
                  <>
                    <UploadCloud size={18} />
                    Upload File Excel Anda
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
