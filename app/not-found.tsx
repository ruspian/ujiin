import Link from "next/link";
import {
  Frown,
  Search,
  ArrowLeft,
  Pencil,
  BookOpen,
  Ghost,
} from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-indigo-50 via-blue-50 to-emerald-50 px-6 overflow-hidden relative">
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-200 rounded-full opacity-30 blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-200 rounded-full opacity-30 blur-3xl animate-pulse delay-1000"></div>

      <div className="absolute top-1/4 left-1/10 animate-float opacity-30 text-emerald-400 delay-100 hidden md:block">
        <Pencil size={32} rotate={20} />
      </div>
      <div className="absolute top-1/3 right-1/10 animate-float opacity-30 text-blue-400 delay-500 hidden md:block">
        <BookOpen size={36} rotate={-15} />
      </div>
      <div className="absolute bottom-1/4 left-1/5 animate-float opacity-20 text-gray-400 delay-1000 hidden md:block">
        <Ghost size={28} />
      </div>

      <div className="bg-white p-8 md:p-10 rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 flex flex-col items-center text-center max-w-md w-full animate-pop-in animate-float relative z-10">
        <div className="relative mb-5">
          <div className="absolute inset-0 bg-linear-to-r from-emerald-400 to-blue-500 rounded-full blur-2xl opacity-40 animate-pulse"></div>
          <div className="w-20 h-20 bg-white text-blue-600 rounded-full flex items-center justify-center relative shadow-lg border-2 border-blue-50">
            <Frown size={42} className="text-blue-500" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="text-[96px] font-extrabold leading-none mb-3 tracking-tighter cursor-pointer animate-wobble-hover group">
          <span className="bg-linear-to-r from-emerald-500 via-blue-600 to-emerald-500 bg-clip-text text-transparent bg-size-[200%_auto] group-hover:bg-size-[100%_auto] transition-all duration-500">
            404
          </span>
        </h1>

        <h2 className="text-xl font-black text-gray-900 mb-3 tracking-tight">
          Halamannya tidak ditemukan!
        </h2>

        <p className="text-gray-600 font-medium mb-8 leading-relaxed text-sm max-w-xs">
          Walah we, Ini gak ada halamannya balik balik!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-inner"
          >
            <ArrowLeft size={18} className="text-gray-500" />
            Beranda
          </Link>

          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl active:scale-95 shadow-xl shadow-blue-500/20"
          >
            <Search size={18} className="text-blue-100" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
