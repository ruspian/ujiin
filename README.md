# 🎓 Ujiin - Modern Computer Based Test (CBT) Platform

![Next.js](https://img.shields.io/badge/Next.js-14%2B-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![Vitest](https://img.shields.io/badge/Tested_with-Vitest-FCC72C?style=for-the-badge&logo=vitest)

**Ujiin** adalah platform ujian berbasis komputer (CBT) modern yang dirancang khusus untuk mempermudah sekolah dalam menyelenggarakan ujian digital. Dibangun dengan ekosistem _Full-stack_ yang menjunjung tinggi performa, integritas ujian, stabilitas sistem, dan kemudahan manajemen data bagi seluruh ekosistem sekolah.

## ✨ Fitur Utama

- **Sistem Ujian Terpusat (CBT):** Mesin ujian berbasis web yang cepat, responsif, dan stabil untuk menampung ratusan sesi siswa secara bersamaan.
- **Role-Based Access Control:** Sistem manajemen hak akses terstruktur yang memisahkan otorisasi dan _dashboard_ untuk **Admin**, **Guru** dan **Siswa**.
- **Dashboard Analitik & Rekap Nilai Otomatis:** Visualisasi data dan rekapitulasi nilai yang dikalkulasi secara _real-time_ setelah ujian selesai, menghemat waktu evaluasi guru.
- **Fitur Anti-Cheat:** Mekanisme keamanan bawaan untuk meminimalisir kecurangan (seperti pindah tab atau _copy-paste_) saat siswa mengerjakan ujian.
- **Manajemen Data Massal:** Mendukung fitur _Import_ data siswa dan soal langsung dari file Excel untuk efisiensi waktu operasional sekolah.
- **Export Soal ke Word:** Memudahkan pengarsipan, _review_, atau pencetakan soal ujian fisik dengan fitur _Export_ langsung ke format dokumen Word.
- **Comprehensive Automated Testing:** Memiliki cakupan pengujian yang menyeluruh untuk menjamin aplikasi 100% _production-ready_:
  - **Vitest:** Menjalankan 275+ _test cases_ (Unit & Component Testing) dalam waktu kurang dari 69 detik, memvalidasi form, logika aplikasi, penanganan error database, hingga Server Actions.
  - **k6:** Diuji secara ekstrem (_Stress/Load Testing_) untuk menangani lonjakan hingga 200 _Virtual Users_ secara bersamaan tanpa _downtime_.
- **Strict Type Safety:** Kode dirancang dengan arsitektur TypeScript yang sangat ketat untuk memastikan struktur data konsisten dan meminimalisir _runtime errors_.

---

## 🔄 Alur Kerja Sistem (Workflow)

Aplikasi Ujiin dirancang dengan alur yang intuitif untuk meminimalisir kebingungan operasional saat hari ujian berlangsung:

1. **Persiapan Data:** Admin atau Guru mengimpor data siswa dan bank soal secara massal menggunakan _template_ Excel yang telah disediakan.
2. **Setup Ujian:** Admin membuat jadwal ujian, mengatur durasi, mengaktifkan fitur pengacakan soal, dan merilis **Token**.
3. **Pelaksanaan Ujian:** Siswa login, memasukkan Token ujian, dan mulai mengerjakan soal di dalam antarmuka yang terkunci oleh sistem _Anti-Cheat_.
4. **Monitoring:** Pengawas memantau progres pengerjaan dan status koneksi siswa secara _real-time_ melalui _dashboard_ Monitoring.
5. **Evaluasi:** Setelah waktu habis atau ujian dikumpulkan, sistem langsung mengkalkulasi nilai. Guru dapat mengekspor rekap nilai akhir ke format Excel.

---

## 📖 Panduan Penggunaan Ringkas

### 👨‍🏫 Untuk Guru & Admin

- **Login Akun:** Masuk menggunakan kredensial Username dan kata sandi yang terdaftar.
- **Manajemen Soal:** Navigasi ke menu **Soal**. Anda dapat menginput soal secara manual atau menggunakan fitur **Import Excel** untuk mempercepat proses.
- **Manajemen Jadwal:** Admin mengelola menu **Jadwal Ujian** untuk mengatur waktu mulai/selesai, menetapkan jadwal mengawas bagi guru.
- **Pelaksanaan Ujian:** Sesuai jadwal pengawasan yang telah ditetapkan Admin, Pengawas tinggal membagikan Token Ujian kepada siswa dan memantau status pengerjaan via _dashboard_.
- **Rekap Nilai:** Kunjungi menu **Laporan & Analitik** setelah ujian selesai untuk mengunduh rekapitulasi nilai siswa secara instan.

### 👨‍🎓 Untuk Siswa

- **Login Peserta:** Masuk menggunakan **NISN** dan kata sandi yang telah diberikan oleh pihak sekolah.
- **Masuk Sesi Ujian:** Masukkan **Token Ujian** yang diberikan oleh pengawas di halaman _dashboard_. Sistem akan secara otomatis mengarahkan Anda ke mata pelajaran yang sedang diujikan pada jam tersebut sesuai dengan jadwal kelas yang telah diatur oleh Admin.
- **Pengerjaan Soal:** Jawab soal dengan teliti. **Penting:** Dilarang membuka atau berpindah _tab_ browser lain, karena sistem _Anti-Cheat_ akan mencatat pelanggaran tersebut.
- **Penyelesaian:** Pastikan semua soal telah terjawab. Tekan tombol **Kumpulkan** (atau ujian akan tersubmit otomatis jika _timer_ habis). Nilai akan langsung tersimpan di sistem.

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router, Server Actions)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database ORM:** Prisma
- **Database Engine:** PostgreSQL
- **Quality Assurance (QA):** Vitest (Unit & Component Testing), k6 (Load & Stress Testing)

---

## 🚀 Panduan Instalasi Lokal (Getting Started)

### 1. Kloning Repositori

```bash
git clone https://github.com/ruspian/ujiin.git
cd ujiin
```

### 2. Instalasi Dependensi

Pastikan Anda menggunakan Node.js versi 18 atau yang lebih baru.

```bash

npm install
```

### 3. Konfigurasi Environment Variables

Gandakan file .env.example menjadi .env dan lengkapi data koneksi database:

```bash

cp .env.example .env
```

Contoh .env:

```env
AUTH_SECRET=secret

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=YOUR_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET

DATABASE_URL="postgresql://user:password@localhost:5432/ujiin?schema=public"
```

### 4. Setup Database & Migrasi

Jalankan perintah ini untuk membangun skema tabel di database lokal Anda:

```Bash

npx prisma migrate dev --name init
npx prisma generate
```

### 5. Jalankan Server Development

```Bash

npm run dev
```

Aplikasi akan berjalan di http://localhost:3000.

## 🧪 Arsitektur Pengujian (Testing)

Stabilitas adalah prioritas di Ujiin. Kami menerapkan berbagai lapisan pengujian untuk memastikan aplikasi tidak tumbang atau buggy saat hari H ujian.

### A. Unit & Component Testing (Vitest)

Digunakan untuk memvalidasi logic inti aplikasi dan memastikan komponen UI dirender dengan tepat. Tes ini memvalidasi database errors, form validations, kontrol akses RBAC, dan server actions.

```Bash

// Menjalankan seluruh 275+ test suite menggunakan Vitest
npm run test
```

### B. Load & Stress Testing (k6)

Skenario uji beban untuk menyimulasikan ratusan siswa login secara serentak (mampu menangani 70+ Requests per Second dengan 0% failure rate).

Untuk menjalankan ulang simulasi k6 di mesin lokal:

    Jalankan server lokal pada mode production (npm run build && npm run start).

    Eksekusi skrip:
    k6 run testing/load-testing/login-stress.ts

## ☁️ Panduan Deployment (Vercel / Serverless)

Aplikasi ini siap di-deploy ke environment serverless seperti Vercel. Untuk menjaga performa saat ujian serentak, harap penuhi standar berikut:

    Connection Pooling: Wajib menggunakan Database Proxy (seperti Prisma Accelerate atau PgBouncer) agar koneksi PostgreSQL tidak menyentuh limit maksimal akibat Cold Starts.

    Limitasi Timeout: Pastikan kalkulasi komputasi disesuaikan agar tidak melampaui batasan durasi eksekusi layanan serverless.

## ☕ Dukung Project Ini

Jika platform **Ujiin** ini membantu kamu atau kamu ingin mengapresiasi kerja keras saya, kamu bisa traktir saya kopi untuk menemani koding di malam hari:

[![Dukung via Saweria](https://img.shields.io/badge/Saweria-Dukung%20Saya-orange?style=for-the-badge&logo=target)](https://saweria.co/ruspian)

_Dukungan anda sangat berarti untuk pengembangan fitur-fitur baru di masa depan!_

## 🤝 Kontak & Dukungan

Jika ada kendala dalam penggunaan atau instalasi platform Ujiin, silakan hubungi:

- **Developer:** Ruspian Majid

- **Email:** ruspianntb@gmail.com

- **GitHub:** github.com/ruspian

---

Dibuat dengan 🧡 oleh Ruspian Majid
