import Link from "next/link";
import {
  Info,
  Target,
  Code2,
  Server,
  ShieldCheck,
  Zap,
  ArrowLeft,
  GitBranch,
} from "lucide-react";

const techStack = [
  {
    name: "Next.js & React",
    description:
      "Framework modern untuk performa aplikasi web yang super cepat dan responsif.",
    icon: Zap,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    name: "Tailwind CSS",
    description:
      "Utility-first CSS untuk meracik desain UI yang estetik, konsisten, dan mobile-friendly.",
    icon: Code2,
    color: "text-teal-600",
    bgColor: "bg-teal-100",
  },
  {
    name: "Prisma & Neon (PostgreSQL)",
    description:
      "Manajemen database relasional yang tangguh, aman, dan dirancang untuk skala besar.",
    icon: Server,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    name: "NextAuth.js",
    description:
      "Sistem autentikasi tingkat lanjut untuk menjaga keamanan sesi ujian siswa dan admin.",
    icon: ShieldCheck,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
];

export default function TentangPage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="bg-white border-b border-gray-200 pt-16 pb-12 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl mb-4">
            Tentang <span className="text-teal-600">Ujiin</span>
          </h1>
          <p className="text-lg leading-8 text-gray-600 max-w-2xl mx-auto font-medium">
            Mendigitalisasi ekosistem pendidikan lokal dengan platform ujian
            yang ringan, mandiri, dan bebas hambatan.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 lg:px-8 mt-12 space-y-16">
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
              <Info size={24} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Cerita di Balik Proyek Ini
            </h2>
          </div>
          <div className="prose prose-teal max-w-none text-gray-600 font-medium leading-relaxed space-y-4">
            <p>
              Berawal dari kebutuhan untuk mempermudah proses administrasi dan
              evaluasi belajar di lingkungan sekolah, <strong>Ujiin</strong>{" "}
              dibangun sebagai solusi alternatif platform CBT (Computer Based
              Test) yang seringkali berat, mahal, atau sulit dikonfigurasi.
            </p>
            <p>
              Proyek ini dikembangkan secara independen dengan dedikasi tinggi
              terhadap desain antarmuka yang intuitif dan sistem keamanan yang
              ketat. Fokus utamanya adalah memastikan guru dapat membuat soal
              dengan mudah, sementara siswa dapat mengerjakan ujian dengan jujur
              dan nyaman tanpa takut kehilangan data akibat koneksi terputus.
            </p>
          </div>
        </div>

        <div className="bg-teal-900 rounded-3xl p-8 sm:p-10 shadow-xl shadow-teal-900/10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-teal-800 rounded-full blur-3xl opacity-50"></div>
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-teal-800 text-teal-300 border border-teal-700">
              <Target size={40} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Misi Kami</h2>
              <p className="text-teal-100 leading-relaxed font-medium">
                Membantu sekolah-sekolah dan pengajar di daerah untuk
                bertransisi ke sistem ujian digital tanpa hambatan teknis yang
                berarti. Menjadikan teknologi pendidikan dapat diakses secara
                merata dengan kode yang bersih, modern, dan efisien.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Teknologi di Balik Layar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tech.bgColor} ${tech.color}`}
                >
                  <tech.icon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {tech.name}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    {tech.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold transition-colors w-full sm:w-auto shadow-sm"
          >
            <ArrowLeft size={18} className="text-gray-400" /> Kembali ke Beranda
          </Link>
          <a
            href="https://github.com/ruspian/ujiin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-colors w-full sm:w-auto shadow-md"
          >
            <GitBranch size={18} /> Lihat Source Code
          </a>
        </div>
      </div>
    </div>
  );
}
