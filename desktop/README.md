# Ujiin Guru (Windows)

Aplikasi desktop ringan untuk **guru & admin** Ujiin, ditulis dengan Rust ([egui](https://github.com/emilk/egui)).
Satu berkas `.exe` (±5 MB), tanpa instalasi, tanpa WebView.

## Fitur
**Guru & admin:** beranda, monitoring ujian (status siswa, pelanggaran, tambah waktu, pengumuman, token, reset sesi, notifikasi desktop),
penilaian & rekap (simpan Excel/CSV), bank soal, **editor soal** (semua jenis: pilihan ganda, PG kompleks, benar/salah,
menjodohkan, esai; teks tebal/miring/garis bawah/sub/sup; unggah gambar ke Cloudinary lewat tombol atau seret-lepas berkas),
**koreksi esai** (guru).
**Admin:** **form jadwal ujian**, **mapel + pengampu per kelas**, **impor siswa dari Excel** (dengan unduh templat),
**kenaikan kelas / kelulusan**, siswa, kelas, jenis ujian, agama, tahun ajaran, pengguna, arsip CSV.
Daftar tersimpan di komputer sehingga tetap terlihat saat internet putus (mode offline, hanya baca).

Catatan: editor teks kaya memakai tombol tag dengan pratinjau (bukan WYSIWYG); gambar tampil sebagai `[gambar]` di editor.
Dialog pilih berkas hanya di Windows; di OS lain gunakan seret-lepas. Unggah gambar butuh Cloudinary aktif di server.
Hak akses mengikuti web: hanya guru yang membuat/ubah soal dan koreksi esai; hanya admin yang membuat jadwal, mapel, impor, kenaikan kelas.

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
