"use client";

import { useState, useEffect } from "react";
import { Maximize, AlertTriangle } from "lucide-react";
import { recordViolation } from "@/actions/exam";

interface FullscreenGuardProps {
  children: React.ReactNode;
  attemptId: string;
}

export default function FullscreenGuard({
  children,
  attemptId,
}: FullscreenGuardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = async () => {
      // Cek apakah layar fullscreen
      if (!document.fullscreenElement) {
        setIsFullscreen(false);

        if (hasStarted) {
          try {
            await recordViolation(
              attemptId,
              "Keluar dari mode Fullscreen (ESC)",
            );
          } catch (error) {
            console.error("Gagal mencatat pelanggaran:", error);
          }
        }
      } else {
        setIsFullscreen(true);
      }
    };

    // Pasang  event layar berubah
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Cleanup pas komponen keluar halaman
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [hasStarted, attemptId]);

  const enterFullscreen = async () => {
    setIsLoading(true);
    try {
      if (document.documentElement.requestFullscreen) {
        // Paksa seluruh halaman web jadi fullscreen
        await document.documentElement.requestFullscreen();
        setHasStarted(true);
      }
    } catch (error) {
      console.error("Gagal masuk fullscreen:", error);
      alert(
        "Browser Anda tidak mendukung mode Fullscreen. Gunakan Chrome/Edge terbaru.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasStarted || !isFullscreen) {
    return (
      <div className="fixed inset-0 z-9999 bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
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
                untuk mencegah kecurangan.
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
                di sistem pengawas. Silakan kembali ke layar penuh.
              </p>
            </>
          )}

          <button
            onClick={enterFullscreen}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black transition-all active:scale-95 text-white shadow-lg ${
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
    );
  }

  return <div className="w-full min-h-screen bg-gray-50">{children}</div>;
}
