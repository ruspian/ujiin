"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";

export default function LaporkanBugPage() {
  const [form, setForm] = useState({
    title: "",
    category: "Ruang Ujian",
    severity: "Medium",
    description: "",
    steps: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nomorWA = "6282293308893";

    const teksPesan = encodeURIComponent(
      `*🚨 LAPORAN BUG - UJIIN CBT*\n\n` +
        `*Judul Masalah:* ${form.title}\n` +
        `*Kategori Area:* ${form.category}\n` +
        `*Tingkat Keparahan:* [${form.severity}]\n\n` +
        `*Deskripsi Masalah:*\n${form.description}\n\n` +
        `*Langkah Reproduksi:*\n${form.steps || "-"}\n\n` +
        `_Dikirim otomatis via Halaman Laporan Bug Ujiin_`,
    );

    window.open(`https://wa.me/${nomorWA}?text=${teksPesan}`, "_blank");

    setIsSubmitted(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="bg-white border-b border-gray-200 pt-16 pb-12 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl mb-4">
            Laporkan <span className="text-red-500">Bug</span>
          </h1>
          <p className="text-lg leading-8 text-gray-600 max-w-2xl mx-auto font-medium">
            Nemu keanehan, error merah, atau sistem yang macet pas nyoba Ujiin?
            Kasih tau gue biar langsung kita eksekusi!
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 lg:px-8 mt-12">
        {isSubmitted ? (
          <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-xl shadow-emerald-500/5 text-center space-y-6 animate-pop-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle size={36} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                Laporan Berhasil Dikirim!
              </h2>
              <p className="text-gray-500 font-medium max-w-sm mx-auto text-sm sm:text-base">
                Matur nuwun coy! Laporan bug kamu udah masuk ke radar
                pengembang. Bakal langsung dicek secepatnya.
              </p>
            </div>
            <div className="pt-4 flex gap-4">
              <button
                onClick={() => setIsSubmitted(false)}
                className="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors"
              >
                Kirim Laporan Lain
              </button>
              <Link
                href="/"
                className="flex-1 px-5 py-3 bg-linear-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold rounded-xl text-sm text-center transition-colors shadow-lg shadow-teal-600/20"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-100 space-y-6"
          >
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Judul Masalah / Bug
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Gagal mengoreksi soal esai nomor 3"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">
                  Kategori Area
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors text-gray-700"
                >
                  <option>Autentikasi / Login</option>
                  <option>Bank Soal / Editor</option>
                  <option>Ruang Ujian / Siswa</option>
                  <option>Penilaian / Koreksi</option>
                  <option>Lainnya</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">
                  Tingkat Keparahan
                </label>
                <select
                  value={form.severity}
                  onChange={(e) =>
                    setForm({ ...form, severity: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors text-gray-700"
                >
                  <option value="Low">Low (Kosmetik / Typo)</option>
                  <option value="Medium">Medium (Fungsi Terganggu)</option>
                  <option value="High">High (Fitur Rusak/Gagal)</option>
                  <option value="Critical">
                    Critical (Server Crash / Blank)
                  </option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Deskripsi Masalah
              </label>
              <textarea
                required
                rows={4}
                placeholder="Jelaskan secara detail apa yang terjadi..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                Langkah-langkah Mereproduksi Bug{" "}
                <span className="text-xs text-gray-400 font-medium">
                  (Opsional)
                </span>
              </label>
              <textarea
                rows={3}
                placeholder="1. Masuk menu Penilaian&#10;2. Klik tombol Koreksi&#10;3. Muncul error..."
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 text-xs font-medium leading-relaxed">
              <AlertTriangle size={18} className="shrink-0 text-amber-600" />
              <p>
                Jika Anda seorang developer, Anda juga bisa langsung membuat{" "}
                <strong>Issue</strong> secara resmi di repositori GitHub kami
                untuk pelacakan kode yang lebih cepat.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all text-center"
              >
                <ArrowLeft size={16} /> Batal
              </Link>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-linear-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-extrabold rounded-xl text-sm transition-all shadow-xl shadow-teal-600/10"
              >
                <Send size={16} /> Kirim Laporan Bug
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
