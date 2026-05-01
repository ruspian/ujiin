"use client";

import { useEffect, useCallback } from "react";
import { recordViolation } from "@/actions/exam";
import { toast } from "sonner";

interface UseAntiCheatProps {
  attemptId: string;
  studentName: string;
}

export function useAntiCheat({ attemptId, studentName }: UseAntiCheatProps) {
  const reportCheat = useCallback(
    async (action: string) => {
      toast.error(`Peringatan untuk ${studentName}!`, {
        description: `Sistem mencatat: ${action}. Admin telah menerima notifikasi ini.`,
        duration: 5000,
      });

      await recordViolation(attemptId, action);
    },
    [attemptId, studentName],
  );

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {
        toast.warning(
          `Halo ${studentName}, harap izinkan akses fullscreen untuk mulai ujian.`,
        );
      });
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.warning(`Maaf ${studentName}, klik kanan dimatikan selama ujian!`);
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      reportCheat("Mencoba Copy/Paste jawaban");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        reportCheat("Mencoba membuka Inspect Element (F12)");
      }

      if (
        e.ctrlKey &&
        (e.key === "u" ||
          e.key === "U" ||
          (e.shiftKey && (e.key === "i" || e.key === "I")))
      ) {
        e.preventDefault();
        reportCheat("Mencoba melihat Source Code / DevTools");
      }

      if (e.key === "PrintScreen") {
        navigator.clipboard.writeText("");
        reportCheat("Mencoba melakukan Screenshot");
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        reportCheat("Meninggalkan tab ujian / membuka aplikasi lain");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        reportCheat("Keluar dari mode Fullscreen");
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("cut", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("cut", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [reportCheat, studentName]);

  return { enterFullscreen };
}
