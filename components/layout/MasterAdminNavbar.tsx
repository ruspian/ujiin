"use client";

import Link from "next/link";
import { School, Users, BookOpen, Calendar, BookHeart } from "lucide-react";

const MasterAdminNavbar = ({ active }: { active: string }) => {
  return (
    <nav className="-mb-px flex gap-6" aria-label="Tabs">
      <Link
        href="/admin/master/kelas"
        className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
          active === "kelas"
            ? "border-teal-600 text-teal-600"
            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
        }`}
      >
        <School size={18} /> Data Kelas
      </Link>
      <Link
        href="/admin/master/siswa"
        className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
          active === "siswa"
            ? "border-teal-600 text-teal-600"
            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
        }`}
      >
        <Users size={18} /> Data Siswa
      </Link>
      <Link
        href="/admin/master/mapel"
        className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
          active === "mapel"
            ? "border-teal-600 text-teal-600"
            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
        }`}
      >
        <BookOpen size={18} /> Mata Pelajaran
      </Link>
      <Link
        href="/admin/master/tahun-ajaran"
        className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
          active === "tahun-ajaran"
            ? "border-teal-600 text-teal-600"
            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
        }`}
      >
        <Calendar size={18} /> Tahun Ajaran
      </Link>

      <Link
        href="/admin/master/agama"
        className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
          active === "tahun-ajaran"
            ? "border-teal-600 text-teal-600"
            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
        }`}
      >
        <BookHeart size={18} /> Agama
      </Link>
    </nav>
  );
};

export default MasterAdminNavbar;
