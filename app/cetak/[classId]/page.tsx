"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { prepareExamCards } from "@/actions/student";
import { Printer, Loader2 } from "lucide-react";
import { PrintStudentData } from "@/types/student";

export default function CetakKartuPage() {
  const { classId } = useParams();
  const [students, setStudents] = useState<PrintStudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun] = useState("");

  useEffect(() => {
    async function loadData() {
      const res = await prepareExamCards(classId as string);
      if (res.success && res.data) {
        setStudents(res.data as PrintStudentData[]);
        setTahun(res.tahunPelajaran ?? "");
      }
      setLoading(false);
    }
    loadData();
  }, [classId]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  // Folio/F4 (215 x 330 mm), margin 8 mm: area cetak 199 x 314 mm.
  // 2 kolom x 5 baris kartu 90 x 60 mm per halaman; tiap halaman dipisah tegas
  // supaya kartu tidak terpotong di batas halaman.
  const PER_PAGE = 10;
  const pages: PrintStudentData[][] = [];
  for (let i = 0; i < students.length; i += PER_PAGE) {
    pages.push(students.slice(i, i + PER_PAGE));
  }

  return (
    <div className="bg-white min-h-screen print:min-h-0">
      <style>{`
        @page { size: 215mm 330mm; margin: 8mm; }
        @media print {
          html, body { background: #fff !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .kartu-page { width: 199mm; margin: 0 auto; }
        .kartu-grid {
          display: grid;
          grid-template-columns: 90mm 90mm;
          grid-auto-rows: 60mm;
          column-gap: 4mm;
          row-gap: 3mm;
          justify-content: center;
        }
        .kartu { width: 90mm; height: 60mm; break-inside: avoid; page-break-inside: avoid; }
        @media print { .kartu-page { break-after: page; page-break-after: always; } .kartu-page:last-child { break-after: auto; page-break-after: auto; } }
        @media screen { .kartu-page { margin-bottom: 16px; padding: 8mm; border: 1px dashed #cbd5e1; width: 215mm; } }
      `}</style>

      <div className="p-4 mb-2 flex justify-between items-center print:hidden border-b">
        <div>
          <h1 className="text-xl font-bold">Preview Kartu Ujian</h1>
          <p className="text-sm text-gray-500">
            Ukuran kertas Folio/F4 (21,5 x 33 cm), 10 kartu per lembar. Saat
            mencetak pilih kertas F4 / Folio, skala 100% (Default), dan margin
            Default atau None.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700"
        >
          <Printer size={18} /> Cetak
        </button>
      </div>

      {pages.map((chunk, pi) => (
        <div key={pi} className="kartu-page">
          <div className="kartu-grid">
            {chunk.map((s, i) => (
              <div
                key={i}
                className="kartu border-2 border-black p-3 flex flex-col relative overflow-hidden bg-white box-border"
              >
                <div className="text-center border-b-2 border-black pb-1 mb-2">
                  <h2 className="font-bold text-sm uppercase leading-tight">
                    Kartu Peserta Ujian
                  </h2>
                  <p className="text-[10px] leading-tight">
                    Tahun Pelajaran {tahun}
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="shrink-0 w-[20mm] h-[27mm] border border-gray-400 bg-gray-100 flex items-center justify-center text-[8px] text-gray-400 text-center">
                    Pas Foto
                    <br />2 x 3
                  </div>

                  <div className="flex-1 min-w-0 text-[11px] space-y-1">
                    <div className="flex">
                      <span className="w-14 shrink-0 font-semibold">Nama</span>:{" "}
                      <span className="flex-1 ml-1 truncate">{s.name}</span>
                    </div>
                    <div className="flex">
                      <span className="w-14 shrink-0 font-semibold">NISN</span>:{" "}
                      <span className="flex-1 ml-1 font-mono">{s.nisn}</span>
                    </div>
                    <div className="flex">
                      <span className="w-14 shrink-0 font-semibold">Kelas</span>:{" "}
                      <span className="flex-1 ml-1 truncate">{s.className}</span>
                    </div>
                    <div className="flex">
                      <span className="w-14 shrink-0 font-semibold text-teal-700 uppercase text-[10px]">
                        Password
                      </span>
                      :{" "}
                      <span className="flex-1 ml-1 font-bold text-red-600 tracking-wider bg-yellow-100 px-1 truncate">
                        {s.password}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex justify-between items-end border-t border-dashed border-gray-400 pt-1 text-[8px]">
                  <div>
                    <p>Sesi: {s.session}</p>
                    <p>Ruang: {s.room}</p>
                  </div>
                  <div className="text-right italic">Panitia Ujian</div>
                </div>

                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <Printer size={80} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
