"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  ExcelCell,
  ExcelColumn,
  ExportExcelProps,
} from "@/types/rekap-nilai";
import { toast } from "sonner";

export default function ExportNilaiExcel({
  students,
  exams,
  attemptsMap,
  subjectName,
  className,
  academicYear,
}: ExportExcelProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Menyiapkan file Excel...");

    try {
      // Library dibundel bersama aplikasi: tidak butuh internet saat ekspor
      const { default: writeXlsxFile } = await import("write-excel-file");

      const titleRow: ExcelCell[] = [
        {
          value: `REKAP NILAI: ${subjectName.toUpperCase()}`,
          fontWeight: "bold",
          span: 4,
        },
      ];

      const subtitleRow: ExcelCell[] = [
        {
          value: `Kelas: ${className} | Tahun Ajaran: ${academicYear}`,
          span: 4,
        },
      ];

      const headerRow: ExcelCell[] = [
        { value: "No", fontWeight: "bold" },
        { value: "Nama Siswa", fontWeight: "bold" },
        { value: "NISN", fontWeight: "bold" },
        ...exams.map((e) => ({
          value: `${e.examType.name}: ${e.title}`,
          fontWeight: "bold" as const,
        })),
        { value: "Rata-Rata", fontWeight: "bold" },
      ];

      //  Data Siswa
      const dataRows: ExcelCell[][] = students.map((student, index) => {
        let total = 0;
        let count = 0;

        const studentScores: ExcelCell[] = exams.map((exam) => {
          const score = attemptsMap[`${student.id}_${exam.id}`];
          if (score !== null && score !== undefined) {
            total += score;
            count++;
            return { type: Number, value: score };
          }
          return { type: String, value: "-" };
        });

        const average = count > 0 ? Number((total / count).toFixed(1)) : "-";

        return [
          { type: Number, value: index + 1 },
          { type: String, value: student.name },
          { type: String, value: student.nisn },
          ...studentScores,
          { type: average === "-" ? String : Number, value: average },
        ];
      });

      // Gabung Semua Baris
      const excelData: ExcelCell[][] = [
        titleRow,
        subtitleRow,
        [], // Baris kosong
        headerRow,
        ...dataRows,
      ];

      const columns: ExcelColumn[] = [
        { width: 5 },
        { width: 35 },
        { width: 15 },
        ...exams.map(() => ({ width: 25 })),
        { width: 15 },
      ];

      // Eksekusi Download
      await writeXlsxFile(excelData, {
        columns,
        fileName: `Rekap_Nilai_${subjectName}_${className}.xlsx`,
        fontFamily: "Arial",
        fontSize: 11,
      });

      toast.success("File Excel berhasil diunduh!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error(
        "Gagal membuat file Excel. Coba lagi.",
        { id: toastId },
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-sm rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Memproses...
        </>
      ) : (
        <>
          <Download size={18} /> Export Excel
        </>
      )}
    </button>
  );
}
