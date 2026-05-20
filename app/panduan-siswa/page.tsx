import Link from "next/link";
import {
  LogIn,
  KeyRound,
  Edit3,
  AlertOctagon,
  Send,
  ArrowLeft,
  MonitorSmartphone,
  AlertCircle,
} from "lucide-react";

const panduanSiswaSteps = [
  {
    id: 1,
    title: "Login ke Dashboard Siswa",
    description:
      "Buka aplikasi Ujiin melalui browser di HP atau Laptop. Gunakan NISN serta Password yang sudah diberikan oleh pihak sekolah untuk masuk.",
    icon: LogIn,
    color: "teal",
    tips: "Pastikan koneksi internet kamu stabil sebelum login untuk menghindari kendala saat ujian.",
  },
  {
    id: 2,
    title: "Masukkan Token Ujian",
    description:
      "Di halaman utama, kamu akan melihat daftar ujian yang sedang aktif. Klik tombol 'Mulai' dan masukkan Token Ujian yang diberikan oleh guru pengawas.",
    icon: KeyRound,
    color: "blue",
    tips: "Token ujian bersifat rahasia dan biasanya baru dibagikan beberapa menit sebelum waktu ujian dimulai.",
  },
  {
    id: 3,
    title: "Mengerjakan Soal",
    description:
      "Baca setiap soal dengan teliti. Gunakan tombol navigasi di layar untuk berpindah antar soal. Jawaban kamu akan otomatis tersimpan ke server setiap kali kamu memilih atau mengetik jawaban.",
    icon: Edit3,
    color: "purple",
    tips: "Untuk soal Esai, perhatikan batas waktu agar kamu punya cukup waktu untuk mengetik jawaban.",
  },
  {
    id: 4,
    title: "Sistem Keamanan Ujian (PENTING!)",
    description:
      "Ujiin dilengkapi sistem Anti-Kecurangan. Jangan pernah mencoba keluar dari mode layar penuh (fullscreen), membuka tab baru, atau membuka aplikasi lain selama ujian berlangsung.",
    icon: AlertOctagon,
    color: "red",
    tips: "Setiap pelanggaran akan dicatat otomatis oleh sistem dan dilaporkan langsung ke layar guru pengawas!",
  },
  {
    id: 5,
    title: "Selesai & Kumpulkan",
    description:
      "Jika semua soal sudah terjawab dan waktu masih tersisa, periksa kembali jawabanmu. Klik tombol 'Selesai & Kumpulkan' jika sudah yakin.",
    icon: Send,
    color: "emerald",
    tips: "Jika waktu habis, sistem akan otomatis mengumpulkan jawaban kamu yang sudah tersimpan.",
  },
];

export default function PanduanSiswaPage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 pt-16 pb-12 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl mb-4">
            Panduan <span className="text-blue-600">Siswa</span>
          </h1>
          <p className="text-lg leading-8 text-gray-600 max-w-2xl mx-auto font-medium">
            Langkah-langkah mengikuti ujian digital di Ujiin. Pahami alurnya
            agar kamu bisa mengerjakan ujian dengan lancar dan tenang.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 lg:px-8 mt-12">
        <div className="space-y-8">
          {panduanSiswaSteps.map((step) => {
            const colorMap = {
              teal: "bg-teal-100 text-teal-600 border-teal-200",
              blue: "bg-blue-100 text-blue-600 border-blue-200",
              purple: "bg-purple-100 text-purple-600 border-purple-200",
              red: "bg-red-100 text-red-600 border-red-200",
              emerald: "bg-emerald-100 text-emerald-600 border-emerald-200",
            };

            const tipColorMap = {
              teal: "bg-teal-50 text-teal-800",
              blue: "bg-blue-50 text-blue-800",
              purple: "bg-purple-50 text-purple-800",
              red: "bg-red-50 text-red-800 font-bold",
              emerald: "bg-emerald-50 text-emerald-800",
            };

            const selectedColor = colorMap[step.color as keyof typeof colorMap];
            const selectedTipColor =
              tipColorMap[step.color as keyof typeof tipColorMap];

            return (
              <div
                key={step.id}
                className={`bg-white rounded-3xl p-6 sm:p-8 shadow-sm border ${step.color === "red" ? "border-red-200 shadow-red-100" : "border-gray-100"} flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow relative overflow-hidden`}
              >
                {step.color === "red" && (
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>
                )}

                <div className="flex flex-col items-center md:items-start shrink-0">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${selectedColor} mb-2`}
                  >
                    <step.icon size={28} strokeWidth={2} />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center w-full">
                    Step {step.id}
                  </span>
                </div>

                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {step.title}
                  </h2>
                  <p className="text-gray-600 font-medium leading-relaxed mb-4 text-sm sm:text-base">
                    {step.description}
                  </p>

                  <div
                    className={`rounded-xl p-4 flex gap-3 items-start ${selectedTipColor}`}
                  >
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed">{step.tips}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between bg-blue-600 rounded-[2rem] p-8 shadow-xl shadow-blue-600/20">
          <div className="text-center sm:text-left mb-6 sm:mb-0">
            <h3 className="text-xl font-bold text-white mb-2">
              Siap untuk Ujian?
            </h3>
            <p className="text-blue-100 text-sm">
              Masuk ke portal siswa menggunakan akun kamu.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-blue-50 rounded-xl text-sm font-bold transition-colors w-full sm:w-auto"
            >
              <ArrowLeft size={16} /> Beranda
            </Link>
            <Link
              href="/login-siswa"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-blue-700 rounded-xl text-sm font-bold transition-colors w-full sm:w-auto shadow-sm"
            >
              <MonitorSmartphone size={16} /> Portal Siswa
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
