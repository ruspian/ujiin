# Ujiin Guru (Windows)

Aplikasi desktop ringan untuk **guru & admin** Ujiin, ditulis dengan Rust ([egui](https://github.com/emilk/egui)).
Satu berkas `.exe` (±5 MB), tanpa instalasi, tanpa WebView.

## Fitur
**Guru & admin:** beranda, monitoring ujian (status siswa, pelanggaran, tambah waktu, pengumuman, token, reset sesi, notifikasi desktop),
penilaian & rekap (simpan Excel/CSV ke komputer), bank soal (lihat/cari/hapus).
**Admin:** jadwal, siswa, kelas, mapel, jenis ujian, agama, tahun ajaran, pengguna (tambah/hapus), arsip CSV.
Daftar tersimpan di komputer sehingga tetap terlihat saat internet putus (mode offline, hanya baca).

Yang tetap dikerjakan di web (tombol "buka di web" tersedia): editor soal (teks kaya/gambar), form jadwal,
pengampu mapel, impor siswa, koreksi esai, kenaikan kelas.

## Cara pakai
1. Unduh `UjiinGuru.exe` dari GitHub Releases (atau artifact workflow), jalankan.
2. Isi alamat server Ujiin, username, dan password akun guru/admin.

## Build
Otomatis lewat GitHub Actions: **Actions → Build Aplikasi Windows Guru → Run workflow**
(isi `server_url` agar alamat server terisi otomatis, `release_tag` untuk menerbitkan ke Releases).

Lokal: `cd desktop && cargo build --release` (Windows) atau `cargo test` (semua OS).

## Cara kerja
Login memakai sesi yang sama dengan web (cookie). Data dibaca dari `/api/v1/*` dan aksi dikirim ke `/api/v1/rpc`
(daftar aksi dibatasi; setiap aksi tetap memeriksa role & kepemilikan di server).
`tools/mock_server.py` adalah server tiruan untuk uji otomatis tanpa database.
