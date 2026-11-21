/**
 * Tautan unduh aplikasi. Semua mengarah ke rilis terbaru di GitHub Releases
 * (nama berkas memuat nomor versi, jadi halaman rilis yang stabil).
 * Bisa diganti lewat NEXT_PUBLIC_DOWNLOAD_URL bila sekolah memakai fork/mirror sendiri.
 */
export const RELEASES_URL =
  process.env.NEXT_PUBLIC_DOWNLOAD_URL ||
  "https://github.com/ruspian/ujiin/releases/latest";
