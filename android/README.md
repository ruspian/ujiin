# Ujiin Android (APK)

Aplikasi ini adalah WebView penuh ke website Ujiin yang sudah online. Semua fitur
web (guru input soal, koreksi nilai, rekap) langsung sama karena memakai server yang sama.
Yang ditambahkan APK: kunci perangkat saat ujian.

## Cara build (paling mudah: GitHub Actions)

1. Push project ini ke GitHub (termasuk folder `android/` dan `.github/`).
2. Buka tab **Actions** -> **Build APK Ujiin** -> **Run workflow**.
3. Isi `app_url` dengan alamat website Ujiin (wajib `https://`), lalu jalankan.
4. Setelah selesai, unduh `ujiin-apk` dari bagian Artifacts, ekstrak, dan install `.apk`.

## Cara build (Android Studio / lokal)

Butuh JDK 17 dan Android SDK 34.

```bash
cd android
gradle assembleRelease -PujiinUrl=https://ujian.sekolahku.sch.id
# hasil: app/build/outputs/apk/release/app-release.apk
```

Opsi lain: `-PujiinAppName="CBT Sekolah"`, `-PujiinStrictDeviceCheck=false`.

## Pengamanan saat ujian (URL `/ujian/...`)

- Screenshot dan perekam layar menghasilkan layar hitam (FLAG_SECURE).
- Screen pinning: tombol Home/Recents diblokir. Tombol Back dimatikan.
- Layar selalu menyala dan mode penuh (immersive).
- Terdeteksi dan dicatat sebagai pelanggaran: keluar aplikasi, notifikasi/overlay
  yang mencuri fokus, split-screen, PiP, screenshot (Android 14+).
- Ujian ditolak bila USB debugging aktif atau HP ter-root (bisa dimatikan).
- Hanya HTTPS dan sertifikat bawaan sistem, WebView tidak bisa diinspeksi.
- Navigasi ke situs lain diblokir.

Pelanggaran dikirim ke web, lalu dicatat server. Pelanggaran ke-3 otomatis
mengeluarkan siswa (status CHEATED).

## Wajibkan ujian lewat APK

Di server (env), set `EXAM_REQUIRE_APP=true`. Akses ke `/ujian` dari browser biasa
akan dialihkan. Catatan: ini memeriksa User-Agent, jadi hanya menutup cara paling
mudah, bukan jaminan mutlak.

## Setelah update kode web

Jalankan migrasi database (sudah termasuk di `npm run build`):
`prisma/migrations/20261027000000_tambah_essay_scores_dan_last_seen`.

## Batasan yang perlu diketahui

- Screen pinning tanpa Device Owner tetap menampilkan dialog konfirmasi ke siswa
  sekali, dan siswa yang paham bisa keluar dengan menekan Back + Recents bersamaan.
  Keluarnya akan terdeteksi dan dihitung sebagai pelanggaran. Kunci penuh tanpa
  dialog butuh mode kiosk (Device Owner) lewat provisioning HP sekolah.
- APK belum dites di perangkat nyata. Coba dulu pada 1-2 HP sebelum dipakai ujian.
