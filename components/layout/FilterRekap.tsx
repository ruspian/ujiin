"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import { FilterRekapProps } from "@/types/rekap-nilai";

export default function FilterRekap({
  academicYears,
  subjects,
}: FilterRekapProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const yearId = searchParams.get("yearId") || "";
  const subjectId = searchParams.get("subjectId") || "";
  const classId = searchParams.get("classId") || "";

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const availableClasses = selectedSubject?.classes || [];

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);

    if (key === "subjectId") {
      params.delete("classId");
    }

    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row items-end gap-4">
      <div className="w-full">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
          Tahun Ajaran
        </label>
        <select
          value={yearId}
          onChange={(e) => handleFilterChange("yearId", e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="" disabled>
            Pilih Tahun Ajaran
          </option>
          {academicYears.map((ay) => (
            <option key={ay.id} value={ay.id}>
              {ay.year} - {ay.semester} {ay.active ? "(Aktif)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
          Mata Pelajaran
        </label>
        <select
          value={subjectId}
          onChange={(e) => handleFilterChange("subjectId", e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="" disabled>
            Pilih Mata Pelajaran
          </option>
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
          Kelas
        </label>
        <select
          value={classId}
          onChange={(e) => handleFilterChange("classId", e.target.value)}
          disabled={!subjectId}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        >
          <option value="" disabled>
            {!subjectId ? "Pilih Mapel Dahulu" : "Pilih Kelas"}
          </option>
          {availableClasses.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full md:w-auto px-6 py-2.5 bg-blue-50 text-blue-600 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shrink-0 border border-blue-100">
        <Filter size={18} /> Auto-Filter Aktif
      </div>
    </div>
  );
}
