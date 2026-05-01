import {
  BookOpen,
  CheckCircle2,
  FileQuestion,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";

export default async function GuruView({ namaGuru }: { namaGuru: string }) {
  // Nanti di sini kita bisa query database khusus untuk guru tersebut
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg">
        <div className="relative z-10 md:w-2/3">
          <h1 className="mb-2 text-3xl font-bold">
            Halo, Bapak/Ibu {namaGuru}! 👨‍🏫
          </h1>
          <p className="mb-6 text-blue-100 text-sm leading-relaxed">
            Selamat datang di Ruang Guru. Kelola bank soal Anda dan pantau hasil
            ujian siswa dengan mudah dari sini.
          </p>
          <div className="flex gap-3">
            <Link
              href="/guru/bank-soal/buat"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-blue-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <FileQuestion size={18} /> Buat Bank Soal
            </Link>
          </div>
        </div>
        <div className="absolute -right-10 -top-20 opacity-20 hidden md:block">
          <GraduationCap size={280} strokeWidth={1} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">
              Mata Pelajaran
            </p>
            <h3 className="text-2xl font-bold text-gray-900">0</h3>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
            <FileQuestion size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">
              Total Bank Soal
            </p>
            <h3 className="text-2xl font-bold text-gray-900">0</h3>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">
              Ujian Selesai
            </p>
            <h3 className="text-2xl font-bold text-gray-900">0</h3>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <FileQuestion className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <h3 className="text-lg font-bold text-gray-900">
          Bank Soal Belum Tersedia
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Anda belum membuat soal apapun. Mulai susun pertanyaan untuk ujian
          siswa.
        </p>
        <Link
          href="/guru/bank-soal"
          className="mt-4 inline-block font-semibold text-blue-600 hover:text-blue-700"
        >
          Kelola Bank Soal &rarr;
        </Link>
      </div>
    </div>
  );
}
