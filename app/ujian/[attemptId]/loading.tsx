import Loader2 from "@/components/layout/Loader2";

// Ruang ujian sedang disiapkan (soal & jawaban tersimpan diambil dari server)
export default function UjianLoading() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center"
      role="status"
    >
      <Loader2 size={40} className="animate-spin text-teal-600" />
      <p className="text-sm font-bold text-gray-700">Menyiapkan ruang ujian...</p>
      <p className="max-w-xs text-xs text-gray-500">
        Mohon tunggu, jangan tutup halaman ini.
      </p>
    </div>
  );
}
