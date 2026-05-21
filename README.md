# 🎓 Ujiin - Modern Computer Based Test (CBT) Platform

![Next.js](https://img.shields.io/badge/Next.js-14%2B-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![Vitest](https://img.shields.io/badge/Tested_with-Vitest-FCC72C?style=for-the-badge&logo=vitest)

**Ujiin** adalah platform ujian berbasis komputer (CBT) modern yang dirancang khusus untuk mempermudah sekolah dalam menyelenggarakan ujian digital. Dibangun dengan ekosistem _Full-stack_ yang menjunjung tinggi performa, integritas ujian, stabilitas sistem, dan kemudahan manajemen data bagi seluruh ekosistem sekolah.

## ✨ Fitur Utama

- **Sistem Ujian Terpusat (CBT):** Mesin ujian berbasis web yang cepat, responsif, dan stabil untuk menampung ratusan sesi siswa secara bersamaan.
- **Dukungan 5 Jenis Soal:** Mendukung format soal ujian yang komprehensif, meliputi: **Pilihan Ganda**, **Pilihan Ganda Kompleks**, **Benar-Salah**, **Menjodohkan**, dan **Essay/Uraian**.
- **Manajemen Jenis Ujian Dinamis:** Fleksibilitas dalam membuat dan mengategorikan berbagai jenis ujian sesuai kebutuhan akademik sekolah (misalnya: Ulangan Harian, Penilaian Tengah Semester, hingga Ujian Sekolah).
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

---

## 📊 Format Template Excel

Untuk menghindari kegagalan proses impor (_parsing error_), pastikan baris pertama (Header) pada file Excel Anda ditulis dengan huruf kecil dan nama kolom yang sama persis seperti tabel di bawah ini.

### 1. Template Import Siswa

| nisn       | name           | className | religion |
| :--------- | :------------- | :-------- | :------- |
| 0051234567 | Otong Surotong | X TKJ     | Islam    |
| 0069876543 | Mei Mei        | XI ATR    | Kristen  |

- **Aturan Pengisian:**
  - `nisn`: Harus unik dan tidak boleh duplikat di database.
  - `name`: Isi dengan nama lengkap siswa.
  - `className`: Harus sama persis dengan nama kelas yang telah didaftarkan Admin di sistem (bersifat _case-sensitive_, misal: `X TKJ`).
  - `religion`: Diisi dengan standar nama agama (Islam, Kristen, Katolik, Hindu, Buddha, Konghucu).

---

### 2. Template Import Guru

| Nama Lengkap        | Username    | Password    | Peran |
| :------------------ | :---------- | :---------- | :---- |
| Budi Setiadi, M.Kom | budisetiadi | Password123 | GURU  |
| Siti Aminah, S.Pd   | sitiaminah  | Password123 | GURU  |

- **Aturan Pengisian:**
  - `username`: Digunakan guru untuk keperluan login ke _dashboard_ pendidik.
  - `Peran`: Wajib diisi dengan string kapital `GURU` (sesuai dengan skema ENUM Prisma database).

---

### 3. Template Import Soal

Untuk mempermudah manajemen soal, format _import_ soal dapat disimpan ke dalam **satu file Excel yang sama**. Namun, pengisiannya dipisah ke dalam beberapa **Sheet (Lembar Kerja)** yang berbeda.

Sistem akan otomatis membedakan _parsing_ data berdasarkan nama sheet. Pastikan Anda tidak mengubah nama-nama sheet standar berikut:

- 📄 **Sheet `PG`** ➔ Khusus untuk soal Pilihan Ganda biasa.
- 📄 **Sheet `PG Kompleks`** ➔ Khusus untuk soal Pilihan Ganda Kompleks.
- 📄 **Sheet `Menjodohkan`** ➔ Khusus untuk soal Menjodohkan.
- 📄 **Sheet `Benar Salah`** ➔ Khusus untuk soal pernyataan Benar - Salah.
- 📄 **Sheet `Esai`** ➔ Khusus untuk soal Essay / Uraian.

<br>

#### Berikut adalah beberapa contoh format _import_ soal:

- **Soal Pilihan Ganda**

Format ini dikhususkan untuk mengimpor soal berjenis Pilihan Ganda. Pastikan nama kolom pada baris pertama (Header) sama persis dengan tabel di bawah ini.

| Teks_Soal                          | Opsi_A  | Opsi_B  | Opsi_C   | Opsi_D | Opsi_E | Kunci_Jawaban | Skor |
| :--------------------------------- | :------ | :------ | :------- | :----- | :----- | :------------ | :--- |
| Ibukota negara Indonesia adalah... | Jakarta | Bandung | Surabaya | Medan  | Bali   | A             | 2    |

**📝 Aturan Pengisian:**

- **`Teks_Soal`:** Wajib diisi dengan pertanyaan atau pernyataan soal.
- **`Opsi_A` s/d `Opsi_E`:** Wajib diisi dengan pilihan jawaban. (Jika opsi hanya sampai D, biarkan kolom `Opsi_E` kosong).
- **`Kunci_Jawaban`:** Wajib diisi dengan **satu huruf kapital** yang mewakili jawaban benar (`A`, `B`, `C`, `D`, atau `E`).
- **`Skor`:** Wajib diisi dengan angka bulat yang mewakili bobot nilai jika siswa menjawab soal ini dengan benar (Contoh: `2`, `5`, `10`).

<br>

- **Soal Pilihan Ganda Kompleks**

Format ini digunakan untuk soal berjenis Pilihan Ganda Kompleks di mana siswa dapat memilih **lebih dari satu jawaban benar**.

| Teks_Soal                                      | Opsi_A | Opsi_B    | Opsi_C | Opsi_D    | Opsi_E     | Kunci_Jawaban | Skor |
| :--------------------------------------------- | :----- | :-------- | :----- | :-------- | :--------- | :------------ | :--- |
| Yang termasuk bahasa pemrograman web adalah... | Word   | Photoshop | PHP    | CorelDraw | JavaScript | C,E           | 2    |

**📝 Aturan Pengisian:**

- **`Teks_Soal`:** Wajib diisi dengan pertanyaan atau pernyataan soal.
- **`Opsi_A` s/d `Opsi_E`:** Wajib diisi dengan pilihan jawaban.
- **`Kunci_Jawaban`:** Wajib diisi dengan huruf kapital yang benar, **dipisahkan dengan tanda koma (,) tanpa spasi** (Contoh: `C,E` atau `A,B,D`).
- **`Skor`:** Wajib diisi dengan angka bulat yang mewakili bobot nilai (Contoh: `2`, `5`).

<br>

- **Soal Menjodohkan**

Format ini digunakan untuk jenis soal Menjodohkan. Berbeda dengan jenis soal lain, skor dan pasangan jawaban pada soal menjodohkan ditulis langsung di dalam kolom Opsi dengan menggunakan pemisah garis vertikal atau _pipe_ (`|`).

| Teks_Soal               | Opsi_A                    | Opsi_B                        | Opsi_C               | Opsi_D | Opsi_E |
| :---------------------- | :------------------------ | :---------------------------- | :------------------- | :----- | :----- |
| Pasangkan dengan tepat! | Indonesia \| Jakarta \| 2 | Malaysia \| Kuala Lumpur \| 2 | Jepang \| Tokyo \| 2 |        |        |
| Pasangkan fungsinya!    | Mouse \| Klik \| 2        | Keyboard \| Ngetik \| 2       |                      |        |        |

**📝 Aturan Pengisian:**

- **`Teks_Soal`:** Wajib diisi dengan instruksi atau pertanyaan soal utama.
- **`Opsi_A` s/d `Opsi_E`:** Diisi dengan format khusus: **`Pernyataan | Pasangan | Skor`**.
  - **Pernyataan:** Teks di sisi kiri (contoh: _Indonesia_).
  - **Pasangan:** Teks jawaban yang benar di sisi kanan (contoh: _Jakarta_). Sistem akan otomatis mengacak pasangan ini saat ditampilkan ke siswa.
  - **Skor:** Angka bobot nilai untuk satu pasangan tersebut (contoh: _2_).
  - **Pemisah:** Gunakan spasi, lalu simbol _pipe_ (`|`), lalu spasi lagi sebagai pemisah antar elemen.
- **Kolom Kunci_Jawaban & Skor Total:** (Jika ada di dalam _template_ master Excel, kolom ini bisa dikosongkan karena skor sudah diakumulasi dari masing-masing opsi).

<br>

- **Soal Essay (Uraian)**

Format ini dikhususkan untuk soal berjenis Essay atau Uraian. Karena siswa harus mengetik jawaban secara manual, semua kolom opsi dibiarkan kosong.

| Teks_Soal                             | Opsi_A | Opsi_B | Opsi_C | Opsi_D | Opsi_E | Kunci_Jawaban                      | Skor |
| :------------------------------------ | :----- | :----- | :----- | :----- | :----- | :--------------------------------- | :--- |
| Jelaskan visi dan misi desa Banuroja! |        |        |        |        |        | Visi: Maju bersama... Misi: 1. ... | 10   |

**📝 Aturan Pengisian:**

- **`Teks_Soal`:** Wajib diisi dengan pertanyaan atau instruksi soal essay.
- **`Opsi_A` s/d `Opsi_E`:** Wajib **dikosongkan** (biarkan _blank_ tanpa spasi).
- **`Kunci_Jawaban`:** Diisi dengan pedoman jawaban, kata kunci, atau rubrik penilaian. Teks ini tidak akan muncul di layar siswa, tetapi berfungsi sebagai referensi bagi guru saat melakukan koreksi dan pemberian nilai manual.
- **`Skor`:** Wajib diisi dengan angka bulat yang mewakili **nilai maksimal** jika siswa menjawab essay tersebut dengan sangat sempurna (Contoh: `10`, `15`, atau `20`).

<br>

- **Soal Benar - Salah**

Format ini digunakan untuk jenis soal pernyataan di mana siswa hanya perlu memilih apakah pernyataan tersebut Benar atau Salah. Untuk mempermudah guru, semua kolom opsi tidak perlu diisi.

| Teks_Soal                                        | Opsi_A | Opsi_B | Opsi_C | Opsi_D | Opsi_E | Kunci_Jawaban | Skor |
| :----------------------------------------------- | :----- | :----- | :----- | :----- | :----- | :------------ | :--- |
| Javascript adalah bahasa pemrograman             |        |        |        |        |        | BENAR         | 2    |
| Ibukota negara Indonesia saat ini adalah Bandung |        |        |        |        |        | SALAH         | 2    |

**📝 Aturan Pengisian:**

- **`Teks_Soal`:** Wajib diisi dengan pernyataan yang akan dievaluasi oleh siswa.
- **`Opsi_A` s/d `Opsi_E`:** Wajib **dikosongkan** (biarkan _blank_ tanpa spasi). Sistem akan secara otomatis men- _generate_ tombol pilihan "Benar" dan "Salah" di layar ujian siswa.
- **`Kunci_Jawaban`:** Wajib diisi dengan kata **BENAR** atau **SALAH** (gunakan huruf kapital) sesuai dengan fakta dari pernyataan di kolom soal.
- **`Skor`:** Wajib diisi dengan angka bulat yang mewakili bobot nilai (Contoh: `2`, `5`).

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
