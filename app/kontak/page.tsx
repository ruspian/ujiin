"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  MessageSquare,
  Send,
  ArrowLeft,
  CheckCircle,
  Globe,
} from "lucide-react";

export default function KontakPengembangPage() {
  const [form, setForm] = useState({
    nama: "",
    instansi: "",
    pesan: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nomorWA = "6282293308893";

    const teksPesan = encodeURIComponent(
      `*📬 PESAN BARU - PENGUNJUNG UJIIN*\n\n` +
        `*Nama Pengirim:* ${form.nama}\n` +
        `*Asal Instansi/Sekolah:* ${form.instansi || "-"}\n\n` +
        `*Isi Pesan:*\n${form.pesan}\n\n` +
        `_Dikirim via Halaman Kontak Pengembang Ujiin_`,
    );

    window.open(`https://wa.me/${nomorWA}?text=${teksPesan}`, "_blank");
    setIsSubmitted(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="bg-white border-b border-gray-200 pt-16 pb-12 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl mb-4">
            Kontak <span className="text-teal-600">Pengembang</span>
          </h1>
          <p className="text-lg leading-8 text-gray-600 max-w-2xl mx-auto font-medium">
            Tertarik berkolaborasi, mau pasang Ujiin di server sekolah kamu,
            atau sekadar mau kenalan? Drop pesan kamu di bawah ya!
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 lg:px-8 mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center md:text-left space-y-4">
            <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mx-auto md:mx-0">
              <User size={40} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Ruspian Majid</h2>
              <p className="text-sm font-semibold text-teal-600">
                Full-stack Web Developer
              </p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Fokus membangun aplikasi web modern yang cepat, aman, dan
              berorientasi pada kemudahan pengguna.
            </p>

            <div className="pt-2 border-t border-gray-100 flex justify-center md:justify-start gap-3">
              <a
                href="https://github.com/ruspian"
                target="_blank"
                className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
              >
                <Globe size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          {isSubmitted ? (
            <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-xl shadow-emerald-500/5 text-center space-y-6 animate-pop-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle size={36} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  Pesan Dialihkan!
                </h2>
                <p className="text-gray-500 font-medium max-w-sm mx-auto text-sm">
                  Pesan kamu sudah diformat dan dialihkan langsung ke WhatsApp
                  pengembang. Terima kasih!
                </p>
              </div>
              <div className="pt-4 flex gap-4 max-w-xs mx-auto">
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Kirim Lagi
                </button>
                <Link
                  href="/"
                  className="flex-1 px-5 py-3 bg-linear-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold rounded-xl text-sm text-center transition-colors shadow-lg shadow-teal-600/20"
                >
                  Beranda
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama kamu"
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">
                  Asal Sekolah / Instansi{" "}
                  <span className="text-xs text-gray-400 font-medium">
                    (Opsional)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                    <Mail size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="Contoh: SMK Negeri 1 Gorontalo"
                    value={form.instansi}
                    onChange={(e) =>
                      setForm({ ...form, instansi: e.target.value })
                    }
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">
                  Isi Pesan
                </label>
                <div className="relative">
                  <span className="absolute top-3.5 left-4 text-gray-400">
                    <MessageSquare size={18} />
                  </span>
                  <textarea
                    required
                    rows={5}
                    placeholder="Tuliskan maksud atau pesan kolaborasi kamu di sini..."
                    value={form.pesan}
                    onChange={(e) =>
                      setForm({ ...form, pesan: e.target.value })
                    }
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all text-center"
                >
                  <ArrowLeft size={16} /> Kembali
                </Link>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-linear-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-extrabold rounded-xl text-sm transition-all shadow-xl shadow-teal-600/10"
                >
                  <Send size={16} /> Kirim
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
