"use client";

import { useState } from "react";
import {
  AttemptAnswersJSON,
  CorrectionFormProps,
  StudentAnswerValue,
} from "@/types/attempt";
import { updateAttemptScore } from "@/actions/koreksi";
import { toast } from "sonner";
import { Save, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSafeHTML } from "@/lib/getSafeHTML";

export default function CorrectionForm({
  attemptId,
  examId,
  questions,
  initialAnswers,
}: CorrectionFormProps) {
  const router = useRouter();
  const [answersState, setAnswersState] =
    useState<AttemptAnswersJSON>(initialAnswers);
  const [isSaving, setIsSaving] = useState(false);

  const currentTotalScore = Object.values(answersState).reduce(
    (total, ans) => total + (ans?.score || 0),
    0,
  );
  const maxPossibleScore = questions.reduce((total, q) => total + q.score, 0);

  const handleScoreChange = (
    questionId: string,
    newScore: number,
    maxScore: number,
  ) => {
    // Validasi biar guru nggak ngasih nilai minus atau lebih dari poin maksimal soal
    const validScore = Math.max(0, Math.min(newScore, maxScore));

    setAnswersState((prev) => ({
      ...prev,
      [questionId]: {
        value: prev[questionId]?.value || "",
        score: validScore,
        isGraded: true, // Otomatis tandai sudah dikoreksi kalau nilainya diubah
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading("Menyimpan nilai...");

    try {
      const res = await updateAttemptScore({
        attemptId,
        examId,
        updatedAnswers: answersState,
      });

      if (res.success) {
        toast.success(res.message, { id: toastId });
        router.push(`/guru/koreksi/${examId}`);
      } else {
        toast.error(res.message, { id: toastId });
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error("Terjadi kesalahan sistem.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // format jawaban siswa
  const renderStudentAnswer = (
    value: StudentAnswerValue | undefined,
    type: string,
  ) => {
    if (!value)
      return <span className="text-gray-400 italic">Tidak dijawab</span>;

    if (
      type === "MATCHING" &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const matches = value as Record<string, string>;
      return (
        <div className="space-y-1">
          {Object.entries(matches).map(([left, right], i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">{left}</span>
              <ArrowRight size={14} className="text-gray-400" />
              <span className="font-bold text-blue-600">{right}</span>
            </div>
          ))}
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <span className="font-bold text-gray-800">{value.join(", ")}</span>
      );
    }

    return (
      <span className="font-medium text-gray-800 whitespace-pre-wrap">
        {value as string}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Total Nilai Sementara
            </p>
            <p className="text-2xl font-black text-blue-600">
              {currentTotalScore}{" "}
              <span className="text-lg text-gray-400 font-bold">
                / {maxPossibleScore}
              </span>
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            <Save size={20} />
            {isSaving ? "Menyimpan..." : "Simpan & Selesai"}
          </button>
        </div>
      </div>

      <div className="space-y-6 max-w-5xl mx-auto">
        {questions.map((q, index) => {
          const studentAns = answersState[q.id];
          const isManualGrading = q.type === "ESSAY" || q.type === "TRUE_FALSE";
          const needsGrading =
            isManualGrading && (!studentAns || !studentAns.isGraded);

          return (
            <div
              key={q.id}
              className={`bg-white rounded-3xl border-2 p-6 transition-all ${
                needsGrading
                  ? "border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-4 ring-amber-50"
                  : "border-gray-100 shadow-sm"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${needsGrading ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {index + 1}
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase">
                    {q.type.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    Poin Maksimal: {q.score}
                  </span>
                  {isManualGrading ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={q.score}
                        value={studentAns?.score ?? ""}
                        onChange={(e) =>
                          handleScoreChange(
                            q.id,
                            Number(e.target.value),
                            q.score,
                          )
                        }
                        className={`w-20 text-center font-black text-lg py-1.5 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${
                          needsGrading
                            ? "border-amber-400 text-amber-700 bg-amber-50 focus:border-amber-500 focus:ring-amber-100 animate-pulse"
                            : "border-emerald-200 text-emerald-700 bg-emerald-50 focus:border-emerald-500 focus:ring-emerald-100"
                        }`}
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                      {studentAns?.score === q.score ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <AlertCircle size={16} className="text-red-500" />
                      )}
                      <span className="font-black text-gray-700">
                        {studentAns?.score || 0}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="prose prose-sm max-w-none text-gray-800 mb-6"
                dangerouslySetInnerHTML={{ __html: getSafeHTML(q.text) }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Jawaban Siswa
                  </p>
                  <div className="text-sm">
                    {renderStudentAnswer(studentAns?.value, q.type)}
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">
                    Kunci / Rubrik Guru
                  </p>
                  <div className="text-sm font-medium text-emerald-800 whitespace-pre-wrap">
                    {q.correctAnswer}
                  </div>
                </div>
              </div>

              {needsGrading && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-700 text-xs font-bold">
                  <AlertCircle size={16} /> Silakan baca jawaban siswa dan
                  masukkan nilai di pojok kanan atas.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
