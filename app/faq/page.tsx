import Link from "next/link";
import { HelpCircle, ArrowLeft, Mail } from "lucide-react";

const faqs = [
  {
    id: 1,
    question: "Apa itu Ujiin?",
    answer:
      "Ujiin adalah platform Computer Based Test (CBT) berbasis web yang dirancang khusus untuk memudahkan sekolah dalam menyelenggarakan ujian secara digital. Sistem ini ringan, cepat, dan dilengkapi fitur anti-kecurangan.",
  },
  {
    id: 2,
    question: "Apakah Ujiin membutuhkan server khusus yang mahal?",
    answer:
      "Tidak wajib. Anda bisa melakukan deploy aplikasi ini di layanan cloud modern seperti Vercel dan menggunakan database serverless (seperti Neon). Namun, Ujiin juga sepenuhnya bisa dipasang di server lokal sekolah (On-Premise) jika dibutuhkan.",
  },
  {
    id: 3,
    question: "Bagaimana jika koneksi internet siswa terputus di tengah ujian?",
    answer:
      "Jangan panik! Sistem Ujiin otomatis menyimpan setiap jawaban siswa secara real-time ke database. Jika koneksi terputus atau HP mati, siswa cukup memuat ulang halaman (refresh) atau login kembali, dan mereka bisa melanjutkan dari soal terakhir tanpa kehilangan jawaban.",
  },
  {
    id: 4,
    question: "Apakah siswa bisa menyontek dengan membuka Google?",
    answer:
      "Sangat sulit. Ujiin dilengkapi fitur keamanan Anti-Nyontek. Jika siswa mencoba keluar dari mode layar penuh (fullscreen), membuka tab baru, atau berpindah ke aplikasi lain, sistem akan langsung mencatat pelanggaran tersebut dan mengirim notifikasi peringatan ke layar guru pengawas.",
  },
  {
    id: 5,
    question: "Apakah sistem bisa menampilkan soal matematika dan gambar?",
    answer:
      "Tentu saja! Editor Bank Soal kami mendukung format teks kaya (Rich Text). Guru bisa dengan mudah menyisipkan gambar, tabel, hingga menebalkan bagian teks tertentu langsung ke dalam pertanyaan maupun pilihan jawaban.",
  },
  {
    id: 6,
    question: "Apakah nilai ujian langsung keluar otomatis?",
    answer:
      "Untuk tipe soal objektif seperti Pilihan Ganda dan Menjodohkan, sistem akan langsung menghitung nilai segera setelah siswa mengumpulkan ujian. Untuk soal tipe Esai, guru disediakan halaman khusus untuk membaca jawaban dan memberikan poin secara manual.",
  },
];

export default function FAQPage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="bg-white border-b border-gray-200 pt-16 pb-12 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl mb-4">
            Tanya Jawab <span className="text-teal-600">(FAQ)</span>
          </h1>
          <p className="text-lg leading-8 text-gray-600 max-w-2xl mx-auto font-medium">
            Temukan jawaban cepat untuk pertanyaan yang paling sering diajukan
            seputar penggunaan platform ujian digital Ujiin.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 lg:px-8 mt-12">
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex gap-4 sm:gap-6 hover:shadow-md transition-shadow"
            >
              <div className="shrink-0 mt-1 hidden sm:block">
                <HelpCircle className="h-8 w-8 text-teal-500 opacity-80" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-start gap-2">
                  <span className="sm:hidden text-teal-500 mt-0.5">
                    <HelpCircle size={20} />
                  </span>
                  {faq.question}
                </h2>
                <p className="text-gray-600 font-medium leading-relaxed text-sm sm:text-base">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between bg-teal-900 rounded-[2rem] p-8 shadow-xl shadow-teal-900/10">
          <div className="text-center sm:text-left mb-6 sm:mb-0">
            <h3 className="text-xl font-bold text-white mb-2">
              Masih Punya Pertanyaan Lain?
            </h3>
            <p className="text-teal-100 text-sm">
              Jangan ragu untuk menghubungi tim bantuan Ujiin.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-800 hover:bg-teal-700 text-teal-50 rounded-xl text-sm font-bold transition-colors w-full sm:w-auto"
            >
              <ArrowLeft size={16} /> Beranda
            </Link>
            <a
              href="mailto:support@ujiin.com"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-teal-50 text-teal-900 rounded-xl text-sm font-bold transition-colors w-full sm:w-auto shadow-sm"
            >
              <Mail size={16} /> Hubungi Kami
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
