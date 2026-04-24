// src/app/(dashboard)/dashboard/GuruDashboard.tsx
import { FileText, CalendarCheck, FileBadge2, Clock } from "lucide-react";

export default function GuruDashboard() {
  return (
    <div className="space-y-6">
      {/* Statistik Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Bank Soal</p>
              <p className="text-2xl font-bold text-gray-900">120</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
              <CalendarCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Ujian Aktif</p>
              <p className="text-2xl font-bold text-gray-900">2</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Siswa Ujian</p>
              <p className="text-2xl font-bold text-gray-900">72</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <FileBadge2 size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Nilai Masuk</p>
              <p className="text-2xl font-bold text-gray-900">340</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Jadwal Ujian Hari Ini */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 min-h-75">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Jadwal Ujian Hari Ini
          </h3>
          <p className="text-sm text-gray-500">
            Belum ada jadwal ujian hari ini.
          </p>
        </div>

        {/* Ujian Perlu Dikoreksi (Jika ada essay) */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 min-h-75">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Tugas / Essay Perlu Dikoreksi
          </h3>
          <p className="text-sm text-gray-500">Semua tugas telah dikoreksi.</p>
        </div>
      </div>
    </div>
  );
}
