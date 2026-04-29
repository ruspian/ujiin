"use client";

import { X, Printer } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ClassData {
  id: string;
  name: string;
}

interface CetakKartuModalProps {
  classes: ClassData[];
  setIsModalCetakOpen: (val: boolean) => void;
}

export default function CetakKartuModal({
  classes,
  setIsModalCetakOpen,
}: CetakKartuModalProps) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const router = useRouter();

  const handlePreviewCetak = () => {
    if (!selectedClassId) return;

    router.push(`/cetak/${selectedClassId}`);
    setIsModalCetakOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-600">
              <Printer size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Cetak Kartu Ujian
            </h2>
          </div>
          <button
            onClick={() => setIsModalCetakOpen(false)}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 mb-2">
            <p className="text-xs text-teal-800 leading-relaxed">
              Sistem akan otomatis membuatkan password bagi siswa yang belum
              memilikinya. Hasil dapat langsung dicetak atau disimpan sebagai
              PDF.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Pilih Kelas
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Pilih Kelas</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4">
            <button
              onClick={handlePreviewCetak}
              disabled={!selectedClassId}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 disabled:opacity-50"
            >
              <Printer size={18} />
              Generate & Cetak Kartu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
