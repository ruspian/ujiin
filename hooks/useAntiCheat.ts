"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface UseAntiCheatOptions {
  /** Dipanggil untuk setiap pelanggaran yang TERHITUNG. */
  onViolation: (jenis: string) => void;
  /** Matikan semua pengawasan (mis. saat sedang submit). */
  enabled?: boolean;
  /**
   * Pantau pindah tab/jendela di sisi web. Di APK ini dimatikan karena
   * native sudah memantau fokus jendela (menghindari hitungan ganda).
   */
  watchFocus?: boolean;
}

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable);

/**
 * Satu-satunya tempat anti-cheat sisi web (sebelumnya terduplikasi di
 * RuangUjian dan di hook ini, dan hook ini tidak pernah dipakai).
 *
 * Catatan jujur: semua proteksi sisi browser bisa dilewati oleh orang yang
 * memodifikasi client. Karena itu penegakan sebenarnya ada di server
 * (batas waktu, kepemilikan sesi, auto-kick) dan di aplikasi Android.
 */
export function useAntiCheat({
  onViolation,
  enabled = true,
  watchFocus = true,
}: UseAntiCheatOptions) {
  const cbRef = useRef(onViolation);
  useEffect(() => {
    cbRef.current = onViolation;
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const report = (jenis: string) => cbRef.current(jenis);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        report("Meninggalkan tab browser / Membuka aplikasi lain");
      }
    };
    const handleWindowBlur = () => report("Meninggalkan tab browser");

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.warning("Klik kanan dinonaktifkan!");
    };

    const blockAndReport = (jenis: string) => (e: Event) => {
      e.preventDefault();
      report(jenis);
    };
    const handleCopy = blockAndReport("Mencoba copy / cut soal");
    const handlePaste = blockAndReport("Mencoba paste jawaban");

    const handleSelectStart = (e: Event) => {
      if (!isEditable(e.target)) e.preventDefault();
    };
    const handleDragStart = (e: Event) => e.preventDefault();

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === "F12") {
        e.preventDefault();
        return report("Mencoba menginspeksi elemen (F12)");
      }
      if (ctrl && e.shiftKey && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
        return report("Mencoba membuka DevTools");
      }
      // Snipping tool Windows / screenshot area macOS
      if (e.metaKey && e.shiftKey && (key === "s" || key === "3" || key === "4")) {
        e.preventDefault();
        return report("Mencoba melakukan Screenshot");
      }
      if (!ctrl) return;

      if (key === "u") {
        e.preventDefault();
        return report("Mencoba melihat source code");
      }
      if (key === "c" || key === "x") {
        e.preventDefault();
        return report("Mencoba copy / cut soal");
      }
      if (key === "v") {
        e.preventDefault();
        return report("Mencoba paste jawaban");
      }
      if (key === "p") {
        e.preventDefault();
        return report("Mencoba mencetak halaman");
      }
      if (key === "s") {
        e.preventDefault();
        return report("Mencoba menyimpan halaman");
      }
      if (key === "a" && !isEditable(e.target)) {
        e.preventDefault();
      }
    };

    // Windows tidak mengirim keydown untuk PrintScreen, hanya keyup.
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        navigator.clipboard?.writeText("").catch(() => {});
        report("Mencoba melakukan Screenshot (PrintScreen)");
      }
    };

    const handleBeforePrint = () => report("Mencoba mencetak halaman");

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("beforeprint", handleBeforePrint);
    if (watchFocus) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("blur", handleWindowBlur);
    }

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("beforeprint", handleBeforePrint);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [enabled, watchFocus]);
}
