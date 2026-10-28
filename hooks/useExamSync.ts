"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useExamStore } from "@/store/useExamStore";
import { examCall, UnauthorizedError } from "@/lib/exam-api";
import {
  ConnectionState,
  MAX_VIOLATION_TRIES,
  SyncState,
  retryDelayMs,
} from "@/lib/exam-sync";
import { STALE_CONTACT_MS } from "@/lib/exam-config";
import type { AnswersMap } from "@/types/ruang-ujian";

interface ViolationResult {
  jenis: string;
  count: number;
  isKicked: boolean;
}

interface Options {
  attemptId: string;
  /** false sampai penyimpanan lokal selesai disiapkan (initExam). */
  enabled: boolean;
  /** Sesi sudah ditutup di server (SUBMITTED / CHEATED / waktu habis). */
  onClosed: (reason: "SUBMITTED" | "CHEATED" | "CLOSED") => void;
  /** Submit diterima server. */
  onSubmitted: () => void;
  /** Sesi login berakhir: harus login ulang. */
  onUnauthorized: () => void;
  /** Satu pelanggaran sudah diterima server (untuk menampilkan peringatan). */
  onViolation: (r: ViolationResult) => void;
}

type SaveRes = { success: boolean; closed?: boolean };
type SubmitRes = { success: boolean; closed?: boolean; message?: string };
type ViolationRes = {
  success: boolean;
  closed?: boolean;
  violationCount?: number;
  isKicked?: boolean;
};

const SAVE_DEBOUNCE_MS = 300;

/**
 * Mesin sinkronisasi ujian semi daring.
 *
 * Prinsip: apa pun yang dilakukan siswa (menjawab, melanggar aturan, menekan
 * Selesai) LANGSUNG ditulis ke penyimpanan perangkat, lalu dikirim ke server
 * di latar belakang. Gagal kirim (jaringan putus, lambat, server sibuk)
 * dicoba lagi otomatis dengan jeda bertahap, tanpa mengganggu siswa. Satu
 * request yang macet dibatalkan oleh timeout sehingga tidak menahan yang lain.
 */
export function useExamSync({
  attemptId,
  enabled,
  onClosed,
  onSubmitted,
  onUnauthorized,
  onViolation,
}: Options) {
  const cbRef = useRef({ onClosed, onSubmitted, onUnauthorized, onViolation });
  useEffect(() => {
    cbRef.current = { onClosed, onSubmitted, onUnauthorized, onViolation };
  });

  const seq = useExamStore((s) => s.seq);
  const syncedSeq = useExamStore((s) => s.syncedSeq);
  const queuedViolations = useExamStore((s) => s.violations.length);
  const submitRequested = useExamStore((s) => s.submitRequested);

  const [saving, setSaving] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>("online");

  const runningRef = useRef(false);
  const rerunRef = useRef(false);
  const failuresRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOkRef = useRef<number>(0);
  const stoppedRef = useRef(false);
  // flush terbaru, dipakai oleh timer coba-ulang (menghindari referensi melingkar)
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const noteContact = useCallback(() => {
    lastOkRef.current = Date.now();
    setConnection("online");
  }, []);

  const handleClosedStatus = (status?: string) => {
    const reason =
      status === "CHEATED"
        ? "CHEATED"
        : status === "SUBMITTED"
          ? "SUBMITTED"
          : "CLOSED";
    cbRef.current.onClosed(reason);
  };

  /** Satu putaran: pelanggaran -> jawaban -> submit. true bila semuanya sukses. */
  const pumpOnce = useCallback(async (): Promise<boolean> => {
    // Jangan pernah mengirim data milik ujian lain yang tertinggal di perangkat
    if (useExamStore.getState().attemptId !== attemptId) return true;
    let allOk = true;

    // 1) Pelanggaran lebih dulu (berurutan) agar status kick cepat diketahui
    while (!stoppedRef.current && useExamStore.getState().violations.length > 0) {
      const v = useExamStore.getState().violations[0];
      try {
        const res = await examCall<ViolationRes>({
          type: "violation",
          attemptId,
          jenis: v.jenis,
          sumber: v.sumber,
          occurredAt: v.at,
        });
        noteContact();
        if (res.success) {
          useExamStore.getState().dequeueViolation();
          if (res.closed) {
            handleClosedStatus(res.isKicked ? "CHEATED" : "SUBMITTED");
            return true;
          }
          cbRef.current.onViolation({
            jenis: v.jenis,
            count: res.violationCount ?? 0,
            isKicked: !!res.isKicked,
          });
        } else if (v.tries + 1 >= MAX_VIOLATION_TRIES) {
          useExamStore.getState().dequeueViolation(); // menyerah: jangan macet
        } else {
          useExamStore.getState().bumpViolationTries();
          allOk = false;
          break;
        }
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          cbRef.current.onUnauthorized();
          return true;
        }
        allOk = false;
        break;
      }
    }

    // 2) Jawaban yang belum tersinkron
    const s = useExamStore.getState();
    if (!stoppedRef.current && s.seq > s.syncedSeq) {
      const sentSeq = s.seq;
      setSaving(true);
      try {
        const res = await examCall<SaveRes>({
          type: "save",
          attemptId,
          answers: s.answers,
          seq: sentSeq,
        });
        noteContact();
        if (res.success) {
          useExamStore.getState().markSynced(sentSeq);
        } else if (res.closed) {
          if (!useExamStore.getState().submitRequested) {
            handleClosedStatus("CLOSED");
            return true;
          }
        } else {
          allOk = false;
        }
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          cbRef.current.onUnauthorized();
          return true;
        }
        allOk = false;
      } finally {
        setSaving(false);
      }
    }

    // 3) Submit (membawa jawaban lengkap sendiri, tidak menunggu langkah 2)
    if (!stoppedRef.current && useExamStore.getState().submitRequested) {
      try {
        const res = await examCall<SubmitRes>(
          {
            type: "submit",
            attemptId,
            answers: useExamStore.getState().answers,
          },
          25_000,
        );
        noteContact();
        if (res.success) {
          cbRef.current.onSubmitted();
          return true;
        }
        if (res.closed) {
          handleClosedStatus("CLOSED");
          return true;
        }
        allOk = false;
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          cbRef.current.onUnauthorized();
          return true;
        }
        allOk = false;
      }
    }

    return allOk;
  }, [attemptId, noteContact]);

  const scheduleRetry = useCallback(() => {
    if (stoppedRef.current || retryTimerRef.current) return;
    failuresRef.current += 1;
    const delay = retryDelayMs(failuresRef.current);
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      void flushRef.current();
    }, delay);
  }, []);

  /** Jalankan sinkronisasi sekarang (aman dipanggil berkali-kali). */
  const flush = useCallback(async () => {
    if (stoppedRef.current) return;
    if (runningRef.current) {
      rerunRef.current = true; // ada perubahan baru saat sedang jalan
      return;
    }
    runningRef.current = true;
    try {
      let ok = await pumpOnce();
      while (ok && rerunRef.current && !stoppedRef.current) {
        rerunRef.current = false;
        ok = await pumpOnce();
      }
      rerunRef.current = false;
      if (ok) {
        failuresRef.current = 0;
      } else {
        scheduleRetry();
      }
    } finally {
      runningRef.current = false;
    }
  }, [pumpOnce, scheduleRetry]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // ---- API untuk komponen -------------------------------------------------

  const saveAnswers = useCallback(
    (answers: AnswersMap, delayMs: number = SAVE_DEBOUNCE_MS) => {
      useExamStore.getState().saveAnswers(answers); // tulis ke perangkat DULU
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void flush();
      }, delayMs);
    },
    [flush],
  );

  const reportViolation = useCallback(
    (jenis: string, sumber: "web" | "android" = "web") => {
      useExamStore.getState().enqueueViolation({
        jenis,
        sumber,
        at: new Date().toISOString(),
      });
      void flush();
    },
    [flush],
  );

  const requestSubmit = useCallback(() => {
    useExamStore.getState().setSubmitRequested(true);
    failuresRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    void flush();
  }, [flush]);

  // ---- pemicu otomatis ----------------------------------------------------

  useEffect(() => {
    if (!enabled) return;
    stoppedRef.current = false;
    lastOkRef.current = Date.now(); // halaman baru saja dimuat dari server

    const kick = () => {
      // koneksi kembali / tab aktif lagi: coba sekarang, jangan tunggu jeda
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      void flush();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") kick();
    };

    window.addEventListener("online", kick);
    document.addEventListener("visibilitychange", onVisible);

    // sisa jawaban / pelanggaran / submit dari sesi sebelumnya (browser ditutup saat offline)
    const s = useExamStore.getState();
    if (s.seq > s.syncedSeq || s.violations.length > 0 || s.submitRequested) {
      void flush();
    }

    const ticker = setInterval(() => {
      setConnection(
        Date.now() - lastOkRef.current > STALE_CONTACT_MS
          ? "unstable"
          : "online",
      );
    }, 5_000);

    return () => {
      stoppedRef.current = true;
      window.removeEventListener("online", kick);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(ticker);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      retryTimerRef.current = null;
      debounceRef.current = null;
    };
  }, [flush, enabled]);

  const pendingChanges = Math.max(0, seq - syncedSeq);
  let syncState: SyncState = "synced";
  if (saving) syncState = "saving";
  else if (pendingChanges > 0 || queuedViolations > 0) syncState = "pending";

  return {
    saveAnswers,
    reportViolation,
    requestSubmit,
    /** Dipanggil saat heartbeat berhasil, supaya status koneksi akurat. */
    noteContact,
    /** Paksa sinkron sekarang (dipakai heartbeat). */
    flush,
    syncState,
    pendingChanges,
    queuedViolations,
    submitting: submitRequested,
    connection,
  };
}
