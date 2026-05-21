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
  LayoutDashboard,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

type UserRole = "GURU" | "ADMIN";

interface NavbarProps {
  isPublic?: boolean;
}

export default function Navbar({ isPublic = false }: NavbarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const [isGuruMenuOpen, setIsGuruMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const guruDropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  const currentRole = session?.user?.role as UserRole;
  const userName = session?.user?.name || "User";

  // Klik di luar buat nutup dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDataMenuOpen(false);
      }
      if (
        guruDropdownRef.current &&
        !guruDropdownRef.current.contains(event.target as Node)
      ) {
        setIsGuruMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
            <BookOpen size={20} />
          </div>
          <Link
            href="/"
            className="text-xl font-black tracking-tighter text-gray-900"
          >
            Uji<span className="text-teal-600">in</span>
          </Link>
        </div>

        {isPublic ? (
          !session?.user ? (
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-teal-700 shadow-md active:scale-95"
              >
                <LogIn size={18} />
                <span>Masuk</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-teal-700 shadow-md active:scale-95"
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
            </div>
          )
        ) : (
          <>
            <div className="hidden lg:flex lg:items-center lg:gap-8">
              <Link
                href="/dashboard"
                className={`text-sm font-bold transition-colors hover:text-teal-600 ${pathname === "/dashboard" ? "text-teal-600" : "text-gray-600"}`}
              >
                Dashboard
              </Link>

              {/* MENU ADMIN */}
              {currentRole === "ADMIN" && (
                <>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
                      className={`flex items-center gap-1 text-sm font-bold transition-colors hover:text-teal-600 ${
                        pathname.startsWith("/admin")
                          ? "text-teal-600"
                          : "text-gray-600"
                      }`}
                    >
                      Data Master{" "}
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isDataMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isDataMenuOpen && (
                      <div className="absolute left-0 mt-3 w-52 rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2">
                        <Link
                          href="/admin/pengguna"
                          onClick={() => setIsDataMenuOpen(false)}
                          className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          Data Pengguna
                        </Link>
                        <Link
                          href="/admin/master/kelas"
                          onClick={() => setIsDataMenuOpen(false)}
                          className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          Data Master
                        </Link>
                        <Link
                          href="/admin/jadwal"
                          onClick={() => setIsDataMenuOpen(false)}
                          className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          Jadwal Ujian
                        </Link>
                        <Link
                          href="/admin/kenaikan-kelas"
                          onClick={() => setIsDataMenuOpen(false)}
                          className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          Kenaikan Kelas
                        </Link>
                        <div className="my-1 border-t border-gray-100" />
                      </div>
                    )}
                  </div>
                  <Link
                    href="/admin/pengaturan"
                    className={`text-sm font-bold transition-colors hover:text-teal-600 ${pathname.startsWith("/admin/pengaturan") ? "text-teal-600" : "text-gray-600"}`}
                  >
                    Pengaturan
                  </Link>
                </>
              )}

              {currentRole === "GURU" && (
                <div className="relative" ref={guruDropdownRef}>
                  <button
                    onClick={() => setIsGuruMenuOpen(!isGuruMenuOpen)}
                    className={`flex items-center gap-1 text-sm font-bold transition-colors hover:text-teal-600 ${
                      pathname.startsWith("/guru")
                        ? "text-teal-600"
                        : "text-gray-600"
                    }`}
                  >
                    Manajemen Ujian{" "}
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${isGuruMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isGuruMenuOpen && (
                    <div className="absolute left-0 mt-3 w-52 rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2">
                      <Link
                        href="/guru/soal"
                        onClick={() => setIsGuruMenuOpen(false)}
                        className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                      >
                        Soal
                      </Link>
                      <Link
                        href="/guru/penilaian"
                        onClick={() => setIsGuruMenuOpen(false)}
                        className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                      >
                        Penilaian
                      </Link>
                      <Link
                        href="/guru/rekap-nilai"
                        onClick={() => setIsGuruMenuOpen(false)}
                        className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                      >
                        Rekap Nilai
                      </Link>
                      <div className="my-1 border-t border-gray-100" />
                      <Link
                        href="/guru/monitoring"
                        onClick={() => setIsGuruMenuOpen(false)}
                        className="block rounded-xl px-4 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors "
                      >
                        Monitoring
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="hidden lg:flex lg:items-center lg:gap-4">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 shadow-sm bg-gray-50/50">
                <UserIcon size={16} className="text-teal-600" />
                <span className="text-xs font-bold text-gray-700">
                  {userName}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95"
              >
                <LogOut size={16} />
                Keluar
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-teal-600 transition-colors"
              >
                <Menu size={28} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {!isPublic && isMobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white px-6 py-6 lg:hidden shadow-2xl animate-in slide-in-from-top-5 duration-300">
          <div className="flex flex-col space-y-5">
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-bold text-gray-700"
            >
              Dashboard
            </Link>

            {/* MOBILE MENU ADMIN */}
            {currentRole === "ADMIN" && (
              <div className="flex flex-col space-y-4">
                <p className="text-xs font-black text-teal-600 uppercase tracking-widest">
                  Admin Panel
                </p>
                <Link
                  href="/admin/pengguna"
                  className="text-sm font-bold text-gray-600 pl-2"
                >
                  Data Pengguna
                </Link>
                <Link
                  href="/admin/master/kelas"
                  className="text-sm font-bold text-gray-600 pl-2"
                >
                  Data Master
                </Link>
                <Link
                  href="/admin/jadwal"
                  className="text-sm font-bold text-gray-600 pl-2"
                >
                  Jadwal Ujian
                </Link>
              </div>
            )}

            {/* MOBILE MENU GURU */}
            {currentRole === "GURU" && (
              <div className="flex flex-col space-y-4">
                <p className="text-xs font-black text-teal-600 uppercase tracking-widest">
                  Guru Panel
                </p>
                <Link
                  href="/guru/soal"
                  className="text-sm font-bold text-gray-600 pl-2"
                >
                  Soal
                </Link>
                <Link
                  href="/guru/penilaian"
                  className="text-sm font-bold text-gray-600 pl-2"
                >
                  Penilaian
                </Link>
                <Link
                  href="/guru/rekap-nilai"
                  className="text-sm font-bold text-gray-600 pl-2"
                >
                  Rekap Nilai
                </Link>
                <Link
                  href="/guru/monitoring"
                  className="text-sm font-bold text-emerald-600 pl-2"
                >
                  Monitoring
                </Link>
              </div>
            )}

            <hr className="border-gray-100" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-3 text-sm font-black text-red-600"
            >
              <LogOut size={18} /> Keluar
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
