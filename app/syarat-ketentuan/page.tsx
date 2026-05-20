import Link from "next/link";
import {
  Scale,
  FileWarning,
  UserCheck,
  Copyright,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

const ketentuanPoin = [
  {
    title: "Ketentuan Penggunaan",
    description:
      "Dengan menggunakan platform Ujiin, pihak sekolah, pengajar, maupun siswa setuju untuk mematuhi seluruh aturan akademis yang berlaku. Platform ini dilarang keras digunakan untuk tindakan manipulasi nilai, pemalsuan data, atau serangan siber ke infrastruktur server.",
    icon: UserCheck,
    color: "text-teal-600",
    bgColor: "bg-teal-100",
  },
  {
    title: "Hak Cipta & Portofolio",
    description:
      "Ujiin dibangun secara independen sebagai proyek portofolio pengembangan aplikasi web. Seluruh desain antarmuka, arsitektur database, dan source code dilindungi hak cipta. Penggunaan untuk skala komersil atau instansi wajib mendapatkan izin tertulis dari pengembang resmi.",
    icon: Copyright,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    title: "Batasan Tanggung Jawab",
    description:
      "Pengembang menyediakan platform Ujiin 'sebagaimana adanya' (as is). Pengembang tidak bertanggung jawab atas hilangnya data akibat kelalaian manajemen server internal sekolah, kegagalan penyedia hosting pihak ketiga (Vercel/Neon), atau kebocoran token ujian oleh pihak pengawas.",
    icon: FileWarning,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
];

export default function SyaratKetentuanPage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="bg-white border-b border-gray-200 pt-16 pb-12 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl mb-4">
            Syarat & <span className="text-teal-600">Ketentuan</span>
          </h1>
          <p className="text-lg leading-8 text-gray-600 max-w-2xl mx-auto font-medium">
            Aturan main dan kesepakatan hukum mengenai penggunaan platform ujian
            digital mandiri Ujiin.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 lg:px-8 mt-12 space-y-12">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex gap-4 sm:gap-6 items-start">
          <div className="shrink-0 p-3 bg-teal-50 rounded-2xl text-teal-600 hidden sm:block">
            <Scale size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="sm:hidden text-teal-600">
                <Scale size={24} />
              </span>
              Kesepakatan Bersama
            </h2>
            <p className="text-gray-600 font-medium leading-relaxed text-sm sm:text-base">
              Harap baca syarat dan ketentuan ini secara saksama sebelum mulai
              mengimplementasikan Ujiin di sekolah Anda. Menggunakan aplikasi
              ini berarti Anda memahami dan menyetujui seluruh poin legalitas
              yang tercantum di bawah ini.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {ketentuanPoin.map((poin) => (
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

        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between bg-teal-900 rounded-[2rem] p-8 shadow-xl shadow-teal-900/10">
          <div className="text-center sm:text-left mb-6 sm:mb-0 flex gap-4 items-center flex-col sm:flex-row">
            <div className="p-3 bg-teal-800 rounded-2xl text-teal-300 border border-teal-700 shrink-0 hidden sm:block">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Pembaruan Ketentuan
              </h3>
              <p className="text-teal-100 text-sm max-w-md font-medium leading-relaxed">
                Syarat & ketentuan ini dapat berubah sewaktu-waktu mengikuti
                pembaruan fitur dan lisensi kode aplikasi Ujiin ke depannya.
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
