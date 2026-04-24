// src/app/(dashboard)/dashboard/AdminDashboard.tsx
import { Users, BookOpen, GraduationCap, School } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Guru</p>
              <p className="text-2xl font-bold text-gray-900">45</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Siswa</p>
              <p className="text-2xl font-bold text-gray-900">1,204</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <School size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Kelas</p>
              <p className="text-2xl font-bold text-gray-900">36</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Mata Pelajaran
              </p>
              <p className="text-2xl font-bold text-gray-900">18</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 min-h-75">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Aktivitas Terkini
        </h3>
        <p className="text-sm text-gray-500">
          Belum ada aktivitas yang tercatat.
        </p>
      </div>
    </div>
  );
}
