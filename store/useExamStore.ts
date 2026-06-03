import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AnswersMap } from "@/types/ruang-ujian";

interface ExamState {
  attemptId: string | null;
  answers: AnswersMap;
  initExam: (attemptId: string, serverAnswers: AnswersMap) => void;
  updateAnswers: (newAnswers: AnswersMap) => void;
  clearExam: () => void;
}

export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      attemptId: null,
      answers: {},

      initExam: (attemptId, serverAnswers) =>
        set((state) => {
          // Kalau ID Ujiannya beda, timpa dengan data server
          if (state.attemptId !== attemptId) {
            return { attemptId, answers: serverAnswers };
          }
          // Kalau ID Ujiannya sama, gabungkan data lokal & server
          return { answers: { ...serverAnswers, ...state.answers } };
        }),

      updateAnswers: (newAnswers) => set({ answers: newAnswers }),

      clearExam: () => set({ attemptId: null, answers: {} }),
    }),
    {
      name: "ujiin-backup-jawaban",
    },
  ),
);
