"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  School,
  Users,
  BookOpen,
  Calendar,
  BookHeart,
  ClipboardList,
} from "lucide-react";

const TABS = [
  { key: "kelas", href: "/admin/master/kelas", label: "Data Kelas", Icon: School },
  { key: "siswa", href: "/admin/master/siswa", label: "Data Siswa", Icon: Users },
  { key: "mapel", href: "/admin/master/mapel", label: "Mata Pelajaran", Icon: BookOpen },
  { key: "tahun-ajaran", href: "/admin/master/tahun-ajaran", label: "Tahun Ajaran", Icon: Calendar },
  { key: "agama", href: "/admin/master/agama", label: "Agama", Icon: BookHeart },
  { key: "jenis-ujian", href: "/admin/master/jenis-ujian", label: "Jenis Ujian", Icon: ClipboardList },
];

/**
 * Tab master data. Di layar kecil tab bisa digeser ke samping (tidak lagi
 * mendorong halaman melebar ke kanan), dan tab aktif otomatis terlihat.
 */
const MasterAdminNavbar = ({ active }: { active: string }) => {
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({
      block: "nearest",
      inline: "center",
    });
  }, [active]);

  return (
    <div className="w-full max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <nav className="-mb-px flex w-max min-w-full gap-5 sm:gap-6" aria-label="Tabs">
        {TABS.map(({ key, href, label, Icon }) => (
          <Link
            key={key}
            href={href}
            ref={active === key ? activeRef : undefined}
            aria-current={active === key ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              active === key
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default MasterAdminNavbar;
