import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AnswersMap } from "@/types/ruang-ujian";
import type { QueuedViolation } from "@/lib/exam-sync";

/**
 * Penyimpanan lokal (localStorage) pengerjaan ujian di perangkat siswa.
 * Inilah yang membuat ujian "semi daring": semua jawaban, antrean pelanggaran,
 * dan permintaan submit ditulis lebih dulu ke perangkat, lalu disinkronkan ke
 * server di latar belakang dan dicoba ulang otomatis sampai berhasil. Jaringan
 * putus-nyambung tidak membuat jawaban hilang atau siswa tertahan.
 */
interface ExamState {
  attemptId: string | null;
  answers: AnswersMap;
  /** Nomor urut perubahan jawaban di perangkat ini. */
  seq: number;
  /** Nomor urut terakhir yang SUDAH dikonfirmasi tersimpan di server. */
  syncedSeq: number;
  /** Pelanggaran yang belum terkirim ke server. */
  violations: QueuedViolation[];
  /** Siswa sudah menekan Selesai (atau waktu habis) tetapi server belum menerima. */
  submitRequested: boolean;

  initExam: (
    attemptId: string,
    serverAnswers: AnswersMap,
    serverSeq?: number,
  ) => void;
  /** Ganti seluruh jawaban dan naikkan nomor urut. */
  saveAnswers: (newAnswers: AnswersMap) => void;
  markSynced: (seq: number) => void;
  enqueueViolation: (v: Omit<QueuedViolation, "tries">) => void;
  bumpViolationTries: () => void;
  dequeueViolation: () => void;
  setSubmitRequested: (value: boolean) => void;
  clearExam: () => void;
}

const EMPTY = {
  attemptId: null,
  answers: {} as AnswersMap,
  seq: 0,
  syncedSeq: 0,
  violations: [] as QueuedViolation[],
  submitRequested: false,
};

export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      ...EMPTY,

      initExam: (attemptId, serverAnswers, serverSeq = 0) =>
        set((state) => {
          // Ujian berbeda: mulai bersih dari data server
          if (state.attemptId !== attemptId) {
            return {
              ...EMPTY,
              attemptId,
              answers: serverAnswers,
              seq: serverSeq,
              syncedSeq: serverSeq,
            };
          }
          // Ujian sama (halaman dibuka ulang): jawaban lokal yang belum
          // tersinkron tetap menang atas data server.
          const seq = Math.max(state.seq, serverSeq);
          return {
            answers: { ...serverAnswers, ...state.answers },
            seq,
            syncedSeq: Math.max(state.syncedSeq, serverSeq),
          };
        }),

      saveAnswers: (newAnswers) =>
        set((state) => ({ answers: newAnswers, seq: state.seq + 1 })),

      markSynced: (seq) =>
        set((state) => ({ syncedSeq: Math.max(state.syncedSeq, seq) })),

      enqueueViolation: (v) =>
        set((state) => ({
          violations: [...state.violations, { ...v, tries: 0 }].slice(-50),
        })),

      bumpViolationTries: () =>
        set((state) => ({
          violations: state.violations.map((v, i) =>
            i === 0 ? { ...v, tries: v.tries + 1 } : v,
          ),
        })),

      dequeueViolation: () =>
        set((state) => ({ violations: state.violations.slice(1) })),

      setSubmitRequested: (value) => set({ submitRequested: value }),

      clearExam: () => set({ ...EMPTY }),
    }),
    {
      name: "ujiin-backup-jawaban",
    },
  ),
);
