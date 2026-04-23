"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, BookOpen, LogOut, User as UserIcon, LogIn } from "lucide-react";
import { useState } from "react";

type UserRole = "GURU" | "SISWA" | "ADMIN";

interface NavbarProps {
  isPublic?: boolean;
}

export default function Navbar({ isPublic = false }: NavbarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentRole = "GURU" as UserRole;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Kiri: Logo (Selalu Muncul) */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
            <BookOpen size={20} />
          </div>
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-gray-900"
          >
            Uji<span className="text-teal-600">in</span>
          </Link>
        </div>

        {isPublic ? (
          <div className="flex items-center">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 shadow-sm"
            >
              <LogIn size={18} />
              Masuk
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden md:flex md:items-center md:gap-6">
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-teal-600 ${pathname === "/dashboard" ? "text-teal-600" : "text-gray-600"}`}
              >
                Dashboard
              </Link>

              {currentRole === "GURU" && (
                <>
                  <Link
                    href="/bank-soal"
                    className="text-sm font-medium text-gray-600 transition-colors hover:text-teal-600"
                  >
                    Bank Soal
                  </Link>
                  <Link
                    href="/jadwal"
                    className="text-sm font-medium text-gray-600 transition-colors hover:text-teal-600"
                  >
                    Jadwal Ujian
                  </Link>
                </>
              )}

              {currentRole === "SISWA" && (
                <>
                  <Link
                    href="/ujian-ku"
                    className="text-sm font-medium text-gray-600 transition-colors hover:text-teal-600"
                  >
                    Ujian Ku
                  </Link>
                  <Link
                    href="/nilai"
                    className="text-sm font-medium text-gray-600 transition-colors hover:text-teal-600"
                  >
                    Riwayat Nilai
                  </Link>
                </>
              )}
            </div>

            <div className="hidden md:flex md:items-center md:gap-4">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 shadow-sm">
                <UserIcon size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Pak Budi (Guru)
                </span>
              </div>
              <button className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
                <LogOut size={16} />
                Keluar
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-teal-600"
              >
                <Menu size={24} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile Menu */}
      {!isPublic && isMobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden shadow-lg">
          <div className="flex flex-col space-y-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-700"
            >
              Dashboard
            </Link>
            {currentRole === "GURU" && (
              <>
                <Link
                  href="/bank-soal"
                  className="text-sm font-medium text-gray-700"
                >
                  Bank Soal
                </Link>
                <Link
                  href="/jadwal"
                  className="text-sm font-medium text-gray-700"
                >
                  Jadwal Ujian
                </Link>
              </>
            )}
            <hr className="border-gray-100" />
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium text-gray-700">
                Pak Budi
              </span>
              <button className="text-sm font-medium text-red-600">
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
