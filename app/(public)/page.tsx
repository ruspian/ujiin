// src/app/(public)/page.tsx
import { ArrowRight, ShieldCheck, Zap, Database } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Ujian Sekolah Jadi Lebih{" "}
            <span className="text-teal-600">Mudah & Cepat</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Platform CBT modern yang dirancang khusus untuk kemudahan guru dalam
            mengelola soal dan kenyamanan siswa dalam mengerjakan ujian.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/login"
              className="rounded-xl bg-teal-600 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-teal-700  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 flex items-center gap-2"
            >
              Mulai Sekarang <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        {/* Fitur Singkat */}
        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
            <Zap className="text-teal-600 mb-4" />
            <h3 className="font-bold">Performa Kencang</h3>
            <p className="text-sm text-gray-500">
              Akses tanpa lemot meski ribuan siswa ujian barengan.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
            <ShieldCheck className="text-teal-600 mb-4" />
            <h3 className="font-bold">Anti-Nyontek</h3>
            <p className="text-sm text-gray-500">
              Fitur deteksi pindah tab dan proteksi ujian yang ketat.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
            <Database className="text-teal-600 mb-4" />
            <h3 className="font-bold">Self-Hosted</h3>
            <p className="text-sm text-gray-500">
              Data aman di server sekolah, tidak tercampur sekolah lain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
