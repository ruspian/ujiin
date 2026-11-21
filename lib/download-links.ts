/**
 * Tautan unduh langsung ke berkas pada rilis terbaru GitHub. Nama berkas di rilis
 * sengaja tetap (tanpa nomor versi; versinya ada di tag rilis) agar tautan ini
 * tidak perlu diubah tiap rilis. Ketiga berkas harus ada di rilis yang sama
 * (jalankan tiga workflow dengan tag yang sama).
 * Bisa diganti lewat NEXT_PUBLIC_DOWNLOAD_URL (folder dasar unduhan) bila memakai fork/mirror.
 */
const BASE =
  process.env.NEXT_PUBLIC_DOWNLOAD_URL ||
  "https://github.com/ruspian/ujiin/releases/latest/download";

export const RELEASES_PAGE = "https://github.com/ruspian/ujiin/releases/latest";

export const DOWNLOAD_LINKS = {
  android: `${BASE}/ujiin-siswa.apk`,
  windows: `${BASE}/UjiinGuru.exe`,
  linux: `${BASE}/UjiinGuru-linux-x86_64.tar.gz`,
} as const;
