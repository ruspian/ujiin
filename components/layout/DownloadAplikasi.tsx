import { Download, Monitor, Smartphone, Terminal } from "lucide-react";
import { RELEASES_URL } from "@/lib/download-links";

const ITEMS = [
  {
    icon: Smartphone,
    title: "Android",
    untuk: "Untuk siswa",
    file: "ujiin-siswa-….apk",
    note: "Unduh lalu pasang (izinkan sumber tidak dikenal). Dipakai mengerjakan ujian.",
  },
  {
    icon: Monitor,
    title: "Windows",
    untuk: "Untuk guru & admin",
    file: "UjiinGuru-….exe",
    note: "Satu berkas, tanpa instalasi. Klik dua kali untuk menjalankan.",
  },
  {
    icon: Terminal,
    title: "Linux",
    untuk: "Untuk guru & admin",
    file: "UjiinGuru-linux-x86_64.tar.gz",
    note: "Ekstrak lalu jalankan ujiin-guru.",
  },
];

export default function DownloadAplikasi() {
  return (
    <section
      id="unduh"
      aria-labelledby="unduh-judul"
      className="mt-24 rounded-3xl border border-teal-100 bg-teal-50/60 px-6 py-10 sm:px-10"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2
          id="unduh-judul"
          className="text-2xl font-bold tracking-tight text-gray-900"
        >
          Unduh Aplikasi Ujiin
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Pilih sesuai perangkat. Semua berkas ada di halaman rilis terbaru.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {ITEMS.map(({ icon: Icon, title, untuk, file, note }) => (
          <a
            key={title}
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:border-teal-300 hover:shadow-md"
          >
            <Icon className="mb-3 text-teal-600" />
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-xs font-semibold text-teal-700">{untuk}</p>
            <p className="mt-2 flex-1 text-sm text-gray-500">{note}</p>
            <p className="mt-3 truncate font-mono text-xs text-gray-400">
              {file}
            </p>
            <span className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white group-hover:bg-teal-700">
              <Download size={16} /> Unduh
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
