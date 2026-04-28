"use client";

import Link from "next/link";
import { School, Users, BookOpen } from "lucide-react";

const MasterAdminNavbar = () => {
  return (
    <nav className="-mb-px flex gap-6" aria-label="Tabs">
      <Link
        href="/admin/master/kelas"
        className="flex items-center gap-2 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
      >
        <School size={18} /> Data Kelas
      </Link>
      <Link
        href="/admin/master/siswa"
        className="flex items-center gap-2 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
      >
        <Users size={18} /> Data Siswa
      </Link>
      <Link
        href="/admin/master/mapel"
        className="flex items-center gap-2 border-b-2 border-teal-600 px-1 py-3 text-sm font-medium text-teal-600"
      >
        <BookOpen size={18} /> Mata Pelajaran
      </Link>
    </nav>
  );
};

export default MasterAdminNavbar;
