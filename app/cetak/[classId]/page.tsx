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

  useEffect(() => {
    async function loadData() {
      const res = await prepareExamCards(classId as string);
      if (res.success && res.data) {
        setStudents(res.data as PrintStudentData[]);
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

  return (
    <div className="p-4 bg-white min-h-screen">
      <div className="mb-6 flex justify-between items-center print:hidden border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">Preview Kartu Ujian</h1>
          <p className="text-sm text-gray-500">
            Gunakan kertas A4 untuk hasil terbaik.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700"
        >
          <Printer size={18} /> Cetak
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 print:gap-4">
        {students.map((s, i) => (
          <div
            key={i}
            className="border-2 border-black p-4 flex flex-col w-[9cm] h-[6cm] relative overflow-hidden bg-white"
          >
            <div className="text-center border-b-2 border-black pb-2 mb-2">
              <h2 className="font-bold text-sm uppercase">
                Kartu Peserta Ujian
              </h2>
              <p className="text-[10px]">Tahun Pelajaran 2025/2026</p>
            </div>

            <div className="flex gap-4 pb-1">
              <div className="w-[2cm] h-[3cm] border border-gray-400 bg-gray-100 flex items-center justify-center text-[8px] text-gray-400 text-center">
                Pas Foto
                <br />2 x 3
              </div>

              <div className="flex-1 text-[11px] space-y-1">
                <div className="flex">
                  <span className="w-16 font-semibold">Nama</span>:{" "}
                  <span className="flex-1 ml-1 truncate">{s.name}</span>
                </div>
                <div className="flex">
                  <span className="w-16 font-semibold">NISN</span>:{" "}
                  <span className="flex-1 ml-1 font-mono">{s.nisn}</span>
                </div>
                <div className="flex">
                  <span className="w-16 font-semibold">Kelas</span>:{" "}
                  <span className="flex-1 ml-1">{s.className}</span>
                </div>
                <div className="flex">
                  <span className="w-16 font-semibold text-teal-700 uppercase">
                    Password
                  </span>
                  :{" "}
                  <span className="flex-1 ml-1 font-bold text-red-600 tracking-wider bg-yellow-100 px-1">
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
  );
}
