import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="bg-white border-t border-gray-200"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8 xl:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
                <BookOpen size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">
                Uji<span className="text-teal-600">in</span>
              </span>
            </div>
            <p className="text-sm leading-6 text-gray-500">
              Sistem ujian sekolah mandiri yang ringan, cepat, dan anti-nyontek.
              Membantu guru dan siswa dalam kegiatan evaluasi belajar digital.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-gray-900">
                  Produk
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link
                      href="/fitur"
                      className="text-sm leading-6 text-gray-500 hover:text-teal-600 transition-colors"
                    >
                      Fitur Utama
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/instalasi"
                      className="text-sm leading-6 text-gray-500 hover:text-teal-600 transition-colors"
                    >
                      Cara Instalasi
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-gray-900">
                  Dukungan
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link
                      href="panduan-guru"
                      className="text-sm leading-6 text-gray-500 hover:text-teal-600 transition-colors"
                    >
                      Panduan Guru
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="panduan-siswa"
                      className="text-sm leading-6 text-gray-500 hover:text-teal-600 transition-colors"
                    >
                      Panduan Siswa
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="faq"
                      className="text-sm leading-6 text-gray-500 hover:text-teal-600 transition-colors"
                    >
                      FAQ
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-gray-900">
                  Informasi Project
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link
                      href="/tentang"
                      className="text-sm leading-6 text-gray-500 hover:text-teal-600 transition-colors"
                    >
                      Tentang Ujiin
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/bugs"
                      className="text-sm leading-6 text-gray-500 hover:text-teal-600 transition-colors"
                    >
                      Laporkan Bug
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/kontak"
                      className="text-sm leading-6 text-gray-500 hover:text-teal-600 transition-colors"
                    >
                      Kontak Pengembang
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-gray-900">
                  Legal
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link
                      href="/kebijakan-privasi"
                      className="text-sm leading-6 text-gray-500 hover:text-teal-600 transition-colors"
                    >
                      Kebijakan Privasi
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/syarat-ketentuan"
                      className="text-sm leading-6 text-gray-500 hover:text-teal-600 transition-colors"
                    >
                      Syarat & Ketentuan
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-gray-200 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-gray-500 text-center">
            &copy; {new Date().getFullYear()} Ujiin. Dibuat dengan
            <span className="text-red-500 animate-pulse mx-1">❤️</span>oleh{" "}
            <a
              href="/kontak"
              className="font-semibold text-gray-700 hover:text-teal-600 transition-colors"
            >
              Ruspian Majid
            </a>
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
