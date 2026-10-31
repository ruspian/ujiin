"use client";

import { useEffect, useState } from "react";
import { BellOff, Lock, ShieldCheck } from "lucide-react";

interface NativeLockGateProps {
  children: React.ReactNode;
  attemptId?: string;
  onViolation?: (jenis: string) => void;
}

interface LockStatus {
  active: boolean;
  dndGranted: boolean;
  dndBlocking: boolean;
  pinned: boolean;
}

const POLL_MS = 1000;

function readStatus(): LockStatus | null {
  try {
    const raw = window.UjiinNative?.lockStatus?.();
    return raw ? (JSON.parse(raw) as LockStatus) : null;
  } catch {
    return null;
  }
}

/**
 * Gerbang ujian di aplikasi Android: soal baru tampil setelah
 *  1) izin "Jangan Ganggu" diberikan (notifikasi diblokir), dan
 *  2) kunci layar (screen pinning) aktif.
 * Bila salah satu hilang di tengah ujian, soal disembunyikan lagi (ruang ujian
 * tetap terpasang agar timer & sinkronisasi jawaban tidak berhenti). Pelanggaran
 * dicatat oleh sisi native; komponen ini hanya mengatur tampilan.
 * APK versi lama (tanpa lockStatus) langsung dianggap siap.
 */
export default function NativeLockGate({ children }: NativeLockGateProps) {
  // RuangUjian baru dirender setelah hidrasi, jadi aman membaca window di sini
  const [status, setStatus] = useState<LockStatus | null>(() =>
    typeof window === "undefined" ? null : readStatus(),
  );
  const supported =
    typeof window === "undefined" ||
    typeof window.UjiinNative?.lockStatus === "function";

  useEffect(() => {
    if (!supported) return;
    const t = setInterval(() => setStatus(readStatus()), POLL_MS);
    return () => clearInterval(t);
  }, [supported]);

  const ready = !supported || (status !== null && status.dndGranted && status.pinned);
  const needDnd = supported && status !== null && !status.dndGranted;

  return (
    <>
      {!ready && (
        <div className="fixed inset-0 z-9999 bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-6">
              {needDnd ? <BellOff size={40} /> : <Lock size={40} />}
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {needDnd ? "Izinkan Blokir Notifikasi" : "Aktifkan Kunci Layar"}
            </h2>
            <p className="text-gray-500 mb-6 font-medium text-sm px-2">
              {needDnd ? (
                <>
                  Agar tidak ada pesan masuk saat ujian, aplikasi perlu izin{" "}
                  <strong className="text-gray-800">Akses Jangan Ganggu</strong>.
                  Tekan tombol di bawah, nyalakan <strong>Ujiin</strong>, lalu
                  kembali ke aplikasi.
                </>
              ) : (
                <>
                  Tekan <strong className="text-gray-800">Mulai</strong> / {""}
                  <strong className="text-gray-800">Mengerti</strong> pada
                  jendela kunci layar. Soal tampil setelah layar terkunci. Waktu
                  ujian tetap berjalan.
                </>
              )}
            </p>

            <button
              onClick={() =>
                needDnd
                  ? window.UjiinNative?.openDndSettings?.()
                  : window.UjiinNative?.requestPin?.()
              }
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black transition-all active:scale-95 text-white shadow-lg bg-teal-600 hover:bg-teal-700 shadow-teal-600/30"
            >
              <ShieldCheck size={20} />
              {needDnd ? "Buka Pengaturan Jangan Ganggu" : "Aktifkan Kunci Layar"}
            </button>
          </div>
        </div>
      )}

      <div
        data-lock-content
        className="w-full min-h-screen bg-gray-50"
        style={{ display: ready ? "block" : "none" }}
        aria-hidden={!ready}
        inert={!ready}
      >
        {children}
      </div>
    </>
  );
}
