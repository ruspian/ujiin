import Link from "next/link";
import {
  ShieldAlert,
  Database,
  Clock,
  CheckSquare,
  Users,
  LineChart,
  ArrowLeft,
  LayoutDashboard,
} from "lucide-react";

const fiturList = [
  {
    title: "Sistem Anti-Nyontek",
    description:
      "Dilengkapi deteksi pelanggaran. Siswa yang keluar dari tab ujian atau mencoba membuka aplikasi lain akan tercatat di log secara otomatis.",
    icon: ShieldAlert,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  {
    title: "Soal Komprehensif",
    description:
      "Dukung berbagai format ujian masa kini: Pilihan Ganda, PG Kompleks, Menjodohkan, hingga soal Esai dengan dukungan rich text/gambar.",
    icon: Database,
    color: "text-teal-600",
    bgColor: "bg-teal-100",
  },
  {
    title: "Koreksi Pintar & Manual",
    description:
      "Pilihan Ganda dan Menjodohkan dinilai instan oleh sistem. Guru disediakan lembar khusus yang rapi untuk mengoreksi soal Esai secara manual.",
    icon: CheckSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    title: "Timer Server-Side",
    description:
      "Waktu ujian disinkronkan langsung dari server. Siswa tidak bisa mencurangi sisa waktu ujian dengan mengubah jam di laptop atau HP mereka.",
    icon: Clock,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  {
    title: "Manajemen Multi-Kelas",
    description:
      "Satu jadwal ujian dapat didistribusikan ke banyak kelas sekaligus. Lengkap dengan token ujian untuk mencegah akses di luar jadwal.",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    title: "Dashboard & Analitik",
    description:
      "Pantau progres siswa yang sedang ujian secara real-time. Export nilai akhir ke format yang siap diolah untuk rapor sekolah.",
    icon: LineChart,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
];

export default function FiturUtamaPage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="bg-white border-b border-gray-200 pt-16 pb-12 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl mb-4">
            Fitur <span className="text-teal-600">Utama</span>
          </h1>
          <p className="text-lg leading-8 text-gray-600 max-w-2xl mx-auto font-medium">
            Platform Ujian Digital yang aman & terpercaya. Ujiin dirancang
            khusus untuk meringankan beban administrasi guru sekaligus menjaga
            integritas ujian siswa.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fiturList.map((fitur) => (
            <div
              key={fitur.title}
              className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="flex items-center gap-4 mb-5">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl shrink-0 ${fitur.bgColor} ${fitur.color}`}
                >
                  <fitur.icon size={28} strokeWidth={2} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">
                  {fitur.title}
                </h2>
              </div>
              <p className="text-gray-600 font-medium leading-relaxed text-sm sm:text-base">
                {fitur.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between bg-teal-900 rounded-[2rem] p-8 shadow-xl shadow-teal-900/10">
          <div className="text-center sm:text-left mb-6 sm:mb-0">
            <h3 className="text-xl font-bold text-white mb-2">
              Siap Mencoba Semua Fiturnya?
            </h3>
            <p className="text-teal-100 text-sm">
              Masuk ke dashboard guru untuk mulai membuat soal dan jadwal ujian.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-800 hover:bg-teal-700 text-teal-50 rounded-xl text-sm font-bold transition-colors w-full sm:w-auto"
            >
              <ArrowLeft size={16} /> Beranda
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-teal-50 text-teal-900 rounded-xl text-sm font-bold transition-colors w-full sm:w-auto shadow-sm"
            >
              <LayoutDashboard size={16} /> Dashboard Guru
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
