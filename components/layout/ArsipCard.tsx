"use client";

import { useState } from "react";
import { Archive, Download } from "lucide-react";

interface Year {
  id: string;
  label: string;
}

/** Unduh arsip (CSV) sebelum meluluskan siswa / berganti tahun ajaran. */
export default function ArsipCard({ years }: { years: Year[] }) {
  const [yearId, setYearId] = useState(years[0]?.id ?? "");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-700">
        <Archive size={16} className="text-teal-600" /> Arsip & Cadangan Data
      </h2>
      <p className="mb-4 text-xs font-medium text-gray-500">
        Unduh arsip sebelum meluluskan siswa atau berganti tahun ajaran. File CSV
        bisa dibuka di Excel.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={yearId}
          onChange={(e) => setYearId(e.target.value)}
          className="min-w-0 rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm font-semibold focus:border-teal-500 focus:ring-teal-500"
        >
          {years.length === 0 && <option value="">Belum ada tahun ajaran</option>}
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
            </option>
          ))}
        </select>
        <a
          href={yearId ? `/api/admin/arsip?type=nilai&yearId=${yearId}` : undefined}
          aria-disabled={!yearId}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-teal-700"
        >
          <Download size={16} /> Arsip Nilai
        </a>
        <a
          href="/api/admin/arsip?type=siswa"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-black text-teal-700 hover:bg-teal-100"
        >
          <Download size={16} /> Daftar Siswa
        </a>
      </div>
    </div>
  );
}
