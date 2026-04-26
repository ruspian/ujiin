"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  BookOpen,
  LogOut,
  User as UserIcon,
  LogIn,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

type UserRole = "GURU" | "ADMIN";

interface NavbarProps {
  isPublic?: boolean;
}

export default function Navbar({ isPublic = false }: NavbarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hardcode sementara. Nanti diganti pakai session dari NextAuth
  const currentRole = "ADMIN" as UserRole;

  // Tutup dropdown kalau user klik di luar area dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDataMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 shadow-sm"
            >
              <LogIn size={18} />
              <span className="hidden sm:inline">Masuk Admin/Guru</span>
              <span className="sm:hidden">Masuk</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden lg:flex lg:items-center lg:gap-6">
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-teal-600 ${pathname === "/dashboard" ? "text-teal-600" : "text-gray-600"}`}
              >
                Dashboard
              </Link>

              {currentRole === "ADMIN" && (
                <>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
                      className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-teal-600 ${
                        pathname.startsWith("/admin/pengguna") ||
                        pathname.startsWith("/admin/master") ||
                        pathname.startsWith("/admin/monitoring")
                          ? "text-teal-600"
                          : "text-gray-600"
                      }`}
                    >
                      Data{" "}
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${isDataMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isDataMenuOpen && (
                      <div className="absolute left-0 mt-3 w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black ring-opacity-5">
                        <Link
                          href="/admin/pengguna"
                          onClick={() => setIsDataMenuOpen(false)}
                          className="block rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          Data Pengguna
                        </Link>
                        <Link
                          href="/admin/master/kelas"
                          onClick={() => setIsDataMenuOpen(false)}
                          className="block rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          Data Master
                        </Link>
                        <Link
                          href="/admin/jadwal"
                          onClick={() => setIsDataMenuOpen(false)}
                          className="block rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          Jadwal Ujian
                        </Link>

                        <Link
                          href="/admin/monitoring"
                          onClick={() => setIsDataMenuOpen(false)}
                          className="block rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          Monitoring Ujian
                        </Link>
                      </div>
                    )}
                  </div>

                  <Link
                    href="/admin/pengaturan"
                    className={`text-sm font-medium transition-colors hover:text-teal-600 ${pathname.startsWith("/admin/pengaturan") ? "text-teal-600" : "text-gray-600"}`}
                  >
                    Pengaturan
                  </Link>
                </>
              )}

              {currentRole === "GURU" && (
                <>
                  <Link
                    href="/bank-soal"
                    className={`text-sm font-medium transition-colors hover:text-teal-600 ${pathname.startsWith("/bank-soal") ? "text-teal-600" : "text-gray-600"}`}
                  >
                    Bank Soal
                  </Link>

                  <Link
                    href="/koreksi"
                    className={`text-sm font-medium transition-colors hover:text-teal-600 ${pathname.startsWith("/koreksi") ? "text-teal-600" : "text-gray-600"}`}
                  >
                    Koreksi Nilai
                  </Link>
                </>
              )}
            </div>

            <div className="hidden lg:flex lg:items-center lg:gap-4">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 shadow-sm bg-white">
                <UserIcon size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Admin Utama ({currentRole})
                </span>
              </div>
              <button className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
                <LogOut size={16} />
                Keluar
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden">
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

      {/* Mobile Menu Dropdown */}
      {!isPublic && isMobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-4 lg:hidden shadow-lg">
          <div className="flex flex-col space-y-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-700"
            >
              Dashboard
            </Link>

            {/* MOBILE MENU ADMIN  */}
            {currentRole === "ADMIN" && (
              <>
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
                    className="flex items-center justify-between text-sm font-medium text-gray-700"
                  >
                    Data{" "}
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isDataMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isDataMenuOpen && (
                    <div className="flex flex-col space-y-3 border-l-2 border-teal-100 pl-4 ml-1">
                      <Link
                        href="/admin/pengguna"
                        className="text-sm font-medium text-gray-500 hover:text-teal-600"
                      >
                        Data Pengguna
                      </Link>
                      <Link
                        href="/admin/master"
                        className="text-sm font-medium text-gray-500 hover:text-teal-600"
                      >
                        Data Master
                      </Link>
                      <Link
                        href="/admin/monitoring"
                        className="text-sm font-medium text-gray-500 hover:text-teal-600"
                      >
                        Monitoring Ujian
                      </Link>
                    </div>
                  )}
                </div>
                <Link
                  href="/admin/pengaturan"
                  className="text-sm font-medium text-gray-700"
                >
                  Pengaturan
                </Link>
              </>
            )}

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
                <Link
                  href="/koreksi"
                  className="text-sm font-medium text-gray-700"
                >
                  Koreksi Nilai
                </Link>
              </>
            )}

            <hr className="border-gray-100" />
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium text-gray-700">
                Admin Utama
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
