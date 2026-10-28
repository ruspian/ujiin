"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, AlertTriangle } from "lucide-react";

interface FullscreenGuardProps {
  children: React.ReactNode;
  attemptId?: string;
  /** Pelanggaran dilaporkan lewat satu jalur yang sama dengan anti-cheat lain
   *  supaya ikut terhitung menuju batas auto-kick. */
  onViolation?: (jenis: string) => void;
}

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
};
type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type KeyboardWithLock = Navigator & {
  keyboard?: {
    lock?: (keys: string[]) => Promise<void>;
    unlock?: () => void;
  };
};

const POLL_MS = 1000;
export const FULLSCREEN_VIOLATION = "Keluar dari mode Fullscreen";

const currentFullscreenElement = () => {
  const d = document as FsDocument;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
};

const canFullscreen = () => {
  const el = document.documentElement as FsElement;
  return (
    typeof el.requestFullscreen === "function" ||
    typeof el.webkitRequestFullscreen === "function"
  );
};

/**
 * Pengunci layar penuh untuk ruang ujian.
 *
 * Yang dilakukan:
 *  - Ruang ujian baru tampil setelah siswa masuk layar penuh.
 *  - Begitu keluar (ESC, F11, gestur, dsb.) soal LANGSUNG disembunyikan dan
 *    dicatat sebagai pelanggaran (satu kali per keluar). Siswa harus menekan
 *    tombol untuk masuk lagi.
 *  - Ruang ujian TIDAK dibongkar saat keluar: timer, simpan jawaban, dan
 *    auto-submit tetap berjalan, dan posisi soal tidak kembali ke nomor 1.
 *  - Di Chrome/Edge, tombol ESC dikunci (Keyboard Lock): ESC harus ditahan
 *    sekitar 2 detik untuk keluar, jadi tidak bisa keluar karena tersentuh.
 *  - Selain event `fullscreenchange`, status dicek tiap detik sebagai cadangan.
 *
 * Batasan jujur: ini kontrol di browser. Orang yang memodifikasi halaman lewat
 * DevTools bisa menyembunyikan overlay ini. Karena itu setiap keluar tercatat
 * di SERVER, dan pelanggaran ke-3 mengeluarkan siswa; itu penegakan yang
 * sebenarnya. Di HP/tablet pakai aplikasi Ujiin (APK) yang terkunci di sisi
 * perangkat.
 */
export default function FullscreenGuard({
  children,
  onViolation,
}: FullscreenGuardProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const violationRef = useRef(onViolation);
  useEffect(() => {
    violationRef.current = onViolation;
  });
  const startedRef = useRef(false);
  const wasFullscreenRef = useRef(false);

  const lockEscape = useCallback(() => {
    try {
      void (navigator as KeyboardWithLock).keyboard?.lock?.(["Escape"]);
    } catch {
      // browser tidak mendukung: tetap dijaga lewat pencatatan pelanggaran
    }
  }, []);

  /**
   * Satu-satunya tempat status layar penuh diproses. Dipanggil oleh event dan
   * polling; pelanggaran hanya dilaporkan pada peralihan layar penuh -> bukan.
   */
  const syncState = useCallback(() => {
    const inFullscreen = currentFullscreenElement() !== null;
    if (inFullscreen === wasFullscreenRef.current) return;

    wasFullscreenRef.current = inFullscreen;
    setIsFullscreen(inFullscreen);

    if (inFullscreen) {
      lockEscape();
    } else if (startedRef.current) {
      violationRef.current?.(FULLSCREEN_VIOLATION);
    }
  }, [lockEscape]);

  useEffect(() => {
    document.addEventListener("fullscreenchange", syncState);
    document.addEventListener("webkitfullscreenchange", syncState);
    // cadangan bila event terlewat (mis. beberapa browser/ekstensi)
    const poll = setInterval(syncState, POLL_MS);

    return () => {
      document.removeEventListener("fullscreenchange", syncState);
      document.removeEventListener("webkitfullscreenchange", syncState);
      clearInterval(poll);
      try {
        (navigator as KeyboardWithLock).keyboard?.unlock?.();
      } catch {
        // abaikan
      }
    };
  }, [syncState]);

  const enterFullscreen = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const el = document.documentElement as FsElement;
      if (typeof el.requestFullscreen === "function") {
        await el.requestFullscreen({ navigationUI: "hide" });
      } else if (typeof el.webkitRequestFullscreen === "function") {
        await el.webkitRequestFullscreen();
      } else {
        setErrorMessage(
          "Perangkat ini tidak mendukung layar penuh. Gunakan Chrome/Edge di komputer, atau aplikasi Ujiin (APK) di HP/tablet.",
        );
        return;
      }
      startedRef.current = true;
      setHasStarted(true);
      syncState();
    } catch (error) {
      console.error("Gagal masuk fullscreen:", error);
      setErrorMessage(
        canFullscreen()
          ? "Gagal masuk layar penuh. Coba tekan tombol sekali lagi."
          : "Browser Anda tidak mendukung mode Fullscreen. Gunakan Chrome/Edge terbaru atau aplikasi Ujiin (APK).",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const showGate = !hasStarted || !isFullscreen;

  return (
    <>
      {showGate && (
        <div className="fixed inset-0 z-9999 bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300">
            {!hasStarted ? (
              <>
                <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-6">
                  <Maximize size={40} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">
                  Siap Ujian?
                </h2>
                <p className="text-gray-500 mb-8 font-medium text-sm px-4">
                  Ujian ini menggunakan mode{" "}
                  <strong className="text-gray-800">
                    Layar Penuh (Fullscreen)
                  </strong>{" "}
                  untuk mencegah kecurangan. Keluar dari layar penuh akan
                  dicatat sebagai pelanggaran.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <AlertTriangle size={40} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">
                  Peringatan!
                </h2>
                <p className="text-red-500 font-black mb-2 uppercase tracking-widest text-xs">
                  Anda Keluar Dari Layar Penuh
                </p>
                <p className="text-gray-500 mb-8 font-medium text-sm px-4">
                  Aktivitas ini{" "}
                  <strong className="text-red-600">
                    telah dicatat sebagai pelanggaran
                  </strong>{" "}
                  di sistem pengawas. Waktu ujian tetap berjalan. Soal baru
                  tampil lagi setelah Anda kembali ke layar penuh.
                </p>
              </>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="mb-4 text-sm font-semibold text-red-600"
              >
                {errorMessage}
              </p>
            )}

            <button
              onClick={enterFullscreen}
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black transition-all active:scale-95 text-white shadow-lg disabled:opacity-60 ${
                !hasStarted
                  ? "bg-teal-600 hover:bg-teal-700 shadow-teal-600/30"
                  : "bg-red-600 hover:bg-red-700 shadow-red-600/30"
              }`}
            >
              <Maximize size={20} />
              {hasStarted ? "Kembali ke Ujian" : "Masuk Layar Penuh"}
            </button>
          </div>
        </div>
      )}

      {/* Setelah ujian dimulai, ruang ujian TETAP terpasang (hanya disembunyikan)
          supaya timer, sinkronisasi jawaban, dan auto-submit tidak mati. */}
      {hasStarted && (
        <div
          data-fullscreen-content
          className="w-full min-h-screen bg-gray-50"
          style={{ display: showGate ? "none" : "block" }}
          aria-hidden={showGate}
          inert={showGate}
        >
          {children}
        </div>
      )}
    </>
  );
}
