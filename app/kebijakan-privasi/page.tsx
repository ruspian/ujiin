import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  ArrowLeft,
  FileText,
} from "lucide-react";

const privasiPoin = [
  {
    title: "Data yang Kami Kumpulkan",
    description:
      "Ujiin hanya mengumpulkan data yang bener-bener diperlukan untuk jalannya ujian sekolah, meliputi: Informasi akun (Nama, NISN, Role), Data Akademik (Mata Pelajaran, Kelas, Soal Ujian), serta Log Aktivitas Siswa selama ujian (waktu pengerjaan dan log deteksi kecurangan).",
    icon: Database,
    color: "text-teal-600",
    bgColor: "bg-teal-100",
  },
  {
    title: "Keamanan & Enskripsi Data",
    description:
      "Semua data sensitif termasuk password pengguna dilindungi dengan algoritma enkripsi (hashing) satu arah yang sangat kuat sebelum disimpan ke database Neon PostgreSQL. Data sesi login juga diamankan menggunakan token enkripsi JWT.",
    icon: Lock,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    title: "Kerahasiaan Log Anti-Nyontek",
    description:
      "Catatan pelanggaran (log kecurangan) siswa yang terekam otomatis oleh sistem Server-Side kami hanya bersifat internal. Data tersebut hanya dapat diakses oleh Guru Pembuat Soal, Admin Sekolah, dan Guru Pengawas ujian yang bersangkutan.",
    icon: EyeOff,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
];

export default function KebijakanPrivasiPage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="bg-white border-b border-gray-200 pt-16 pb-12 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl mb-4">
            Kebijakan <span className="text-teal-600">Privasi</span>
          </h1>
          <p className="text-lg leading-8 text-gray-600 max-w-2xl mx-auto font-medium">
            Komitmen Ujiin dalam menjaga keamanan, kerahasiaan, dan integritas
            data seluruh ekosistem digital sekolah Anda.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 lg:px-8 mt-12 space-y-12">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex gap-4 sm:gap-6 items-start">
          <div className="shrink-0 p-3 bg-teal-50 rounded-2xl text-teal-600 hidden sm:block">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="sm:hidden text-teal-600">
                <ShieldCheck size={24} />
              </span>
              Prinsip Perlindungan Data
            </h2>
            <p className="text-gray-600 font-medium leading-relaxed text-sm sm:text-base">
              Di Ujiin, kami percaya bahwa privasi adalah hak mendasar. Sebagai
              platform CBT mandiri, kami berkomitmen penuh untuk tidak pernah
              menjual, membagikan, atau menyalahgunakan data sekolah, guru,
              maupun siswa kepada pihak ketiga mana pun untuk kepentingan
              komersil atau iklan.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {privasiPoin.map((poin) => (
            <div
              key={poin.title}
              className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-5 items-start"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${poin.bgColor} ${poin.color}`}
              >
                <poin.icon size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">
                  {poin.title}
                </h3>
                <p className="text-gray-600 font-medium leading-relaxed text-sm sm:text-base">
                  {poin.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-teal-900 rounded-[2rem] p-8 text-white shadow-xl shadow-teal-900/10 flex flex-col sm:flex-row items-center justify-between">
          <div className="text-center sm:text-left mb-6 sm:mb-0 flex gap-4 items-center flex-col sm:flex-row">
            <div className="p-3 bg-teal-800 rounded-2xl text-teal-300 border border-teal-700 shrink-0 hidden sm:block">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Kepatuhan Server Mandiri
              </h3>
              <p className="text-teal-100 text-sm max-w-md font-medium leading-relaxed">
                Karena Ujiin berbasis open-source/independen, kendali penuh atas
                retensi data ada di tangan Admin Sekolah Anda selaku pemilik
                kredensial database.
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-teal-50 text-teal-900 rounded-xl text-sm font-bold transition-colors w-full sm:w-auto shrink-0 shadow-sm"
          >
            <ArrowLeft size={16} /> Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
