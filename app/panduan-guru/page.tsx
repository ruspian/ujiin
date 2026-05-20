import Link from "next/link";
import {
  FileText,
  MonitorPlay,
  PenTool,
  ArrowLeft,
  LayoutDashboard,
  CheckCircle2,
} from "lucide-react";

const panduanSteps = [
  {
    id: 1,
    title: "Membuat Soal",
    description:
      "Langkah pertama sebelum memulai ujian adalah menyiapkan soal. Anda bisa membuat berbagai tipe soal mulai dari Pilihan Ganda, Menjodohkan, hingga Esai.",
    icon: FileText,
    tips: [
      "Gunakan fitur editor teks untuk menambahkan gambar atau rumus pada soal.",
      "Tentukan bobot nilai (skor) yang sesuai untuk setiap soal.",
      "Untuk soal Menjodohkan, pastikan pasangan kunci jawaban sudah tepat.",
      "Gunakan Template soal dalam format excel untuk memudahkan pembuatan soal.",
    ],
  },
  {
    id: 2,
    title: "Memantau Ruang Ujian",
    description:
      "Saat ujian berlangsung, Anda dapat memantau aktivitas siswa secara real-time melalui dashboard.",
    icon: MonitorPlay,
    tips: [
      "Perhatikan indikator warna pada status siswa (Sedang Mengerjakan / Selesai).",
      "Sistem Anti-Nyontek akan otomatis mencatat jika ada siswa yang mencoba keluar dari tab browser atau membuka aplikasi lain.",
      "Anda berhak mereset sesi siswa jika terjadi kendala teknis darurat.",
    ],
  },
  {
    id: 3,
    title: "Koreksi Manual & Rekap Nilai",
    description:
      "Sistem akan menilai otomatis soal Pilihan Ganda. Untuk soal Esai, Anda disediakan halaman khusus untuk memberikan nilai secara manual.",
    icon: PenTool,
    tips: [
      "Masuk ke menu Penilaian, pilih siswa yang sudah selesai ujian.",
      "Baca jawaban Esai siswa dan berikan poin pada kolom yang disediakan, lalu klik Simpan.",
      "Nilai akhir akan terakumulasi otomatis dan siap untuk diekspor ke format Excel/PDF.",
    ],
  },
];

export default function PanduanGuruPage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="bg-white border-b border-gray-200 pt-16 pb-12 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl mb-4">
            Buku Panduan <span className="text-teal-600">Guru</span>
          </h1>
          <p className="text-lg leading-8 text-gray-600 max-w-2xl mx-auto font-medium">
            Selamat datang di Ujiin! Ikuti panduan 3 langkah mudah ini untuk
            mulai mengelola ujian digital di sekolah Anda dengan cepat dan
            praktis.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 lg:px-8 mt-12">
        <div className="space-y-10">
          {panduanSteps.map((step) => (
            <div
              key={step.id}
              className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col items-center md:items-start shrink-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 mb-4">
                  <step.icon size={32} strokeWidth={1.5} />
                </div>
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Langkah {step.id}
                </span>
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center md:text-left">
                  {step.title}
                </h2>
                <p className="text-gray-600 font-medium leading-relaxed mb-6 text-center md:text-left">
                  {step.description}
                </p>

                <div className="bg-teal-50/50 rounded-2xl p-5 border border-teal-100">
                  <h3 className="text-sm font-bold text-teal-900 mb-3 uppercase tracking-wide flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-600" />
                    Pro Tips
                  </h3>
                  <ul className="space-y-2">
                    {step.tips.map((tip, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-teal-800 font-medium"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                        <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between bg-teal-900 rounded-[2rem] p-8 shadow-xl shadow-teal-900/10">
          <div className="text-center sm:text-left mb-6 sm:mb-0">
            <h3 className="text-xl font-bold text-white mb-2">
              Sudah Paham Alurnya?
            </h3>
            <p className="text-teal-100 text-sm">
              Mari mulai buat jadwal ujian pertama Anda.
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
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-teal-50 text-teal-900 rounded-xl text-sm font-bold transition-colors w-full sm:w-auto shadow-sm"
            >
              <LayoutDashboard size={16} /> Buka Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
