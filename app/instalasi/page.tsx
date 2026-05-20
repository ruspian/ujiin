import Link from "next/link";
import {
  Terminal,
  Database,
  GitBranch,
  PlayCircle,
  Server,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export default function InstalasiPage() {
  const steps = [
    {
      id: 1,
      name: "Clone Repository",
      description:
        "Unduh *source code* Ujiin dari GitHub ke komputer lokal atau *server* Anda.",
      icon: GitBranch,
      command:
        "git clone https://github.com/ruspian/ujiin.git\ncd ujiin\nnpm install",
    },
    {
      id: 2,
      name: "Konfigurasi Environment",
      description:
        "Buat file .env di folder utama dan isi dengan kredensial database PostgreSQL (disarankan menggunakan Neon) dan konfigurasi Auth.",
      icon: Server,
      command:
        'DATABASE_URL="postgresql://user:password@neon.tech/db"\nAUTH_SECRET="buat_string_acak_disini"\nAUTH_URL="http://localhost:3000"',
    },
    {
      id: 3,
      name: "Migrasi Database (Prisma)",
      description:
        "Sinkronkan skema aplikasi dengan database Anda agar semua tabel ujian dan pengguna otomatis dibuat.",
      icon: Database,
      command: "npx prisma generate\nnpx prisma migrate deploy",
    },
    {
      id: 4,
      name: "Jalankan Aplikasi",
      description:
        "Jalankan mode pengembangan secara lokal. Aplikasi siap diakses melalui browser.",
      icon: PlayCircle,
      command: "npm run dev",
    },
  ];

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="relative isolate px-6 pt-14 lg:px-8 bg-gray-50 border-b border-gray-100">
        <div className="mx-auto max-w-4xl py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl mb-6">
              Cara Instalasi <span className="text-teal-600">Ujiin</span>
            </h1>
            <p className="mt-4 text-lg leading-8 text-gray-600 max-w-2xl mx-auto font-medium">
              Panduan teknis langkah demi langkah untuk melakukan *deploy*
              sistem ujian Ujiin ke *server* sekolah atau platform *cloud*
              seperti Vercel.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 lg:px-8 mt-16">
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6 sm:p-8 mb-12">
          <h2 className="text-xl font-bold text-teal-900 mb-4 flex items-center gap-2">
            <CheckCircle2 size={24} className="text-teal-600" />
            Persyaratan Sistem Minimum
          </h2>
          <ul className="list-disc list-inside text-teal-800 space-y-2 font-medium ml-2">
            <li>Node.js versi 18.x atau terbaru.</li>
            <li>
              Database PostgreSQL (Direkomendasikan menggunakan layanan{" "}
              <i>Serverless</i> seperti Neon).
            </li>
            <li>
              Akun GitHub & Vercel (jika ingin melakukan deployment publik).
            </li>
          </ul>
        </div>

        <div className="space-y-12">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {index !== steps.length - 1 && (
                <div className="absolute left-6 top-16 bottom-12 w-0.5 bg-gray-200 hidden sm:block"></div>
              )}

              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 shadow-md shadow-teal-600/30 text-white">
                  <step.icon size={24} />
                </div>

                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {step.id}. {step.name}
                  </h3>
                  <p className="text-gray-600 font-medium mb-6">
                    {step.description}
                  </p>

                  <div className="rounded-xl bg-gray-900 overflow-hidden shadow-lg border border-gray-800">
                    <div className="flex items-center px-4 py-3 border-b border-gray-700 bg-gray-800/50">
                      <Terminal size={16} className="text-gray-400 mr-2" />
                      <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                        Terminal
                      </span>
                    </div>
                    <div className="p-5 overflow-x-auto">
                      <pre className="text-sm font-mono text-teal-300">
                        <code>{step.command}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 border-t border-gray-200 pt-10 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Deploy ke Vercel?
            </h3>
            <p className="mt-1 text-sm text-gray-500 font-medium max-w-xl">
              Pastikan Anda mengubah <i>Build Command</i> di Vercel menjadi{" "}
              <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">
                prisma generate && prisma migrate deploy && next build
              </code>{" "}
              agar database terhubung dengan benar.
            </p>
          </div>
          <Link
            href="/"
            className="mt-6 sm:mt-0 inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} /> Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
