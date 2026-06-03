"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  CheckCircle2,
  Menu,
  Timer,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { useRouter } from "next/navigation";
import {
  AnswersMap,
  AnswerValue,
  OptionMatching,
  OptionMC,
  RuangUjianProps,
} from "@/types/ruang-ujian";
import {
  autoSaveJawaban,
  submitUjianSiswa,
  catatPelanggaran,
  cekStatusAttempt,
} from "@/actions/ruang-ujian";
import FullscreenGuard from "./FullscreenGuard";
import RichTextReadOnly from "./RichTextReadOnly";
import { useExamStore } from "@/store/useExamStore";

const TYPE_ORDER: Record<string, number> = {
  MULTIPLE_CHOICE: 1,
  MULTIPLE_CHOICE_COMPLEX: 2,
  MATCHING: 3,
  TRUE_FALSE: 4,
  ESSAY: 5,
};

export default function RuangUjian({
  attemptId,
  examName,
  subjectName,
  questions,
  endTime,
  initialAnswers,
  serverTime,
}: RuangUjianProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const { answers, initExam, updateAnswers, clearExam } = useExamStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [showMobileNav, setShowMobileNav] = useState(false);
  const [activeLeftMatch, setActiveLeftMatch] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const end = new Date(endTime).getTime();
    const serverNow = new Date(serverTime).getTime();
    const difference = end - serverNow;
    return difference > 0 ? Math.floor(difference / 1000) : 0;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [violationData, setViolationData] = useState<{
    jenis: string;
    count: number;
    isKicked: boolean;
  } | null>(null);
  const isProcessingViolation = useRef(false);
  const MAX_VIOLATION = 3;

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // inisialisasi zustand pas pertama render
  useEffect(() => {
    Promise.resolve().then(() => {
      initExam(attemptId, initialAnswers);
      setIsHydrated(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      setIsOnline(navigator.onLine);
    });

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Koneksi internet terhubung kembali!");
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Koneksi terputus! Tenang, jawaban tetap disimpan di HP.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handlePelanggaran = async (jenis: string) => {
    if (isProcessingViolation.current) return;
    isProcessingViolation.current = true;

    try {
      const result = await catatPelanggaran(attemptId, jenis);
      if (result && result.success) {
        setViolationData({
          jenis,
          count: result.violationCount as number,
          isKicked: result.isKicked as boolean,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
        isProcessingViolation.current = false;
      }, 2000);
    }
  };

  // anti cheat
  useEffect(() => {
    const validasiStatusSiswa = async () => {
      const res = await cekStatusAttempt(attemptId);
      if (
        res.success &&
        (res.status === "CHEATED" || res.status === "SUBMITTED")
      ) {
        router.replace("/siswa?error=pelanggaran");
      }
    };
    validasiStatusSiswa();

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      toast.error("Tidak diperkenankan untuk kembali ke halaman sebelumnya!");
    };
    window.addEventListener("popstate", handlePopState);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handlePelanggaran("Meninggalkan tab browser / Membuka aplikasi lain");
      }
    };

    const handleWindowBlur = () => {
      handlePelanggaran("Meninggalkan tab browser");
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.warning("Klik kanan dinonaktifkan!");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
        e.preventDefault();
        handlePelanggaran("Mencoba menginspeksi elemen (F12)");
      }
      if (
        e.ctrlKey &&
        (e.key === "c" || e.key === "v" || e.key === "C" || e.key === "V")
      ) {
        e.preventDefault();
        toast.warning("Fitur Copy-Paste dimatikan!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelesaiUjian = (isAutoSubmit = false) => {
    if (!isAutoSubmit) {
      setShowConfirmModal(true);
      return;
    }
    executeSubmit();
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    const toastId = toast.loading("Sedang mengumpulkan jawaban...");

    try {
      // Kirim dari state Zustand ke server
      const res = await submitUjianSiswa(attemptId, answers);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        clearExam(); // Hapus sampah localStorage setelah sukses
        router.push("/siswa");
      } else {
        throw new Error(res.message);
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan!",
        {
          id: toastId,
        },
      );
      setIsSubmitting(false);
    }
  };

  // timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setTimeout(() => handleSelesaiUjian(true), 0);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        const newTime = prevTime - 1;
        if (newTime <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => handleSelesaiUjian(true), 0);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleNavigate = (indexAction: number | ((prev: number) => number)) => {
    setCurrentIndex(indexAction);
    setActiveLeftMatch(null);
  };

  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => {
      const orderA = TYPE_ORDER[a.type] || 99;
      const orderB = TYPE_ORDER[b.type] || 99;
      return orderA - orderB;
    });
  }, [questions]);

  const currentQuestion = sortedQuestions[currentIndex];

  const saveToServer = async (newAnswers: AnswersMap) => {
    setIsSaving(true);
    try {
      await autoSaveJawaban(attemptId, newAnswers);
    } catch (error) {
      console.error("Gagal nyimpen ke server, tapi data aman di lokal:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAnswer = (
    questionId: string,
    value: string,
    isComplex: boolean = false,
  ) => {
    const currentAnswers = { ...answers };
    let newValue: AnswerValue;

    if (isComplex) {
      const currentVals = (currentAnswers[questionId] as string[]) || [];
      if (currentVals.includes(value)) {
        newValue = currentVals.filter((v) => v !== value);
      } else {
        newValue = [...currentVals, value];
      }
    } else {
      newValue = value;
    }

    const updatedAnswers = { ...currentAnswers, [questionId]: newValue };

    updateAnswers(updatedAnswers);
    saveToServer(updatedAnswers);
  };

  const handleSelectMatch = (
    questionId: string,
    left: string,
    right: string,
  ) => {
    const currentAnswers = { ...answers };
    const currentMatches =
      (currentAnswers[questionId] as Record<string, string>) || {};
    const newValue = { ...currentMatches, [left]: right };

    const updatedAnswers = { ...currentAnswers, [questionId]: newValue };

    updateAnswers(updatedAnswers);
    saveToServer(updatedAnswers);
    setActiveLeftMatch(null);
  };

  const removeMatch = (questionId: string, left: string) => {
    const currentAnswers = { ...answers };
    const currentMatches = {
      ...((currentAnswers[questionId] as Record<string, string>) || {}),
    };
    delete currentMatches[left];

    const updatedAnswers = { ...currentAnswers, [questionId]: currentMatches };

    updateAnswers(updatedAnswers);
    saveToServer(updatedAnswers);
  };

  // jangan render sebelum Zustand nya siap & data pertanyaannya ada, biar gak error hydration sama undefined
  if (!isHydrated || !sortedQuestions.length) return null;

  const isTimeCritical = timeLeft > 0 && timeLeft <= 300;

  return (
    <FullscreenGuard attemptId={attemptId}>
      <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col h-screen overflow-hidden">
        <div className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex bg-blue-600 text-white p-2 rounded-lg">
              <LayoutGrid size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-none line-clamp-1">
                {subjectName}
              </h2>
              <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider flex items-center gap-2">
                {examName}
                {isSaving && (
                  <span className="text-blue-500 animate-pulse">
                    Menyimpan...
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs tracking-wide transition-colors shadow-sm ${
                isOnline
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-red-100 text-red-600 border border-red-200 animate-pulse"
              }`}
              title={isOnline ? "Internet Stabil" : "Koneksi Terputus"}
            >
              {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              <span className="hidden sm:inline">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold font-mono tracking-wider transition-colors ${
                isTimeCritical
                  ? "bg-red-100 text-red-600 animate-pulse"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              <Timer
                size={18}
                className={isTimeCritical ? "text-red-500" : "text-gray-500"}
              />
              {timeLeft > 0 ? formatTime(timeLeft) : "WAKTU HABIS"}
            </div>

            <button
              onClick={() => handleSelesaiUjian(false)}
              disabled={isSubmitting || timeLeft <= 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <CheckCircle2 size={18} />
              )}
              <span className="hidden sm:inline">
                {isSubmitting ? "Mengumpulkan..." : "Selesai Ujian"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden bg-gray-100/50">
          <div className="flex-1 flex flex-col bg-white overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-12 custom-scrollbar">
              <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-6 sm:mb-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="px-3 py-1 bg-gray-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest">
                      No. {currentIndex + 1}
                    </div>
                    <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold uppercase">
                      {currentQuestion.type === "MULTIPLE_CHOICE" &&
                        "Pilihan Ganda"}
                      {currentQuestion.type === "MULTIPLE_CHOICE_COMPLEX" &&
                        "Pilihan Ganda Kompleks"}
                      {currentQuestion.type === "MATCHING" && "Menjodohkan"}
                      {currentQuestion.type === "ESSAY" && "Uraian / Esai"}
                      {currentQuestion.type === "TRUE_FALSE" && "Benar / Salah"}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-gray-400 text-xs font-bold hidden sm:block">
                      Bobot:{" "}
                      <span className="text-blue-600">
                        {currentQuestion.score} Poin
                      </span>
                    </div>
                    <button
                      onClick={() => setShowMobileNav(true)}
                      className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 lg:hidden"
                    >
                      <Menu size={18} />
                    </button>
                  </div>
                </div>

                <div className="mb-8 sm:text-lg w-full max-w-full overflow-x-auto whitespace-pre-wrap wrap-break-words">
                  <RichTextReadOnly
                    key={currentQuestion.id}
                    content={currentQuestion.text}
                  />
                </div>

                <div className="space-y-3 mb-10 animate-in slide-in-from-bottom-4 duration-500">
                  {(currentQuestion.type === "MULTIPLE_CHOICE" ||
                    currentQuestion.type === "MULTIPLE_CHOICE_COMPLEX") &&
                    (currentQuestion.options as OptionMC[]).map((opt) => {
                      const isComplex =
                        currentQuestion.type === "MULTIPLE_CHOICE_COMPLEX";
                      const isSelected = isComplex
                        ? (
                            (answers[currentQuestion.id] as string[]) || []
                          ).includes(opt.id)
                        : answers[currentQuestion.id] === opt.id;

                      return (
                        <button
                          key={opt.id}
                          onClick={() =>
                            handleSelectAnswer(
                              currentQuestion.id,
                              opt.id,
                              isComplex,
                            )
                          }
                          className={`w-full flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 shadow-sm"
                              : "border-gray-100 hover:border-blue-200"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center font-bold text-xs sm:text-sm border-2 ${
                              isComplex ? "rounded-md" : "rounded-full"
                            } ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-gray-200 text-gray-400"
                            }`}
                          >
                            {opt.id}
                          </div>
                          <div className="flex-1 min-w-0 pointer-events-none mt-0.5 max-w-full overflow-x-auto whitespace-pre-wrap wrap-break-words">
                            <RichTextReadOnly
                              key={`${currentQuestion.id}-${opt.id}`}
                              content={opt.text}
                            />
                          </div>
                        </button>
                      );
                    })}

                  {currentQuestion.type === "MATCHING" &&
                    (() => {
                      const matchOpts =
                        currentQuestion.options as unknown as OptionMatching;
                      const currentMatches =
                        (answers[currentQuestion.id] as Record<
                          string,
                          string
                        >) || {};

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-gray-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200">
                          <div className="space-y-2 sm:space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest sm:mb-2">
                              1. Pilih Kiri
                            </p>
                            {matchOpts.left.map((l, i) => {
                              const isAnswered = !!currentMatches[l];
                              const isActive = activeLeftMatch === l;
                              return (
                                <div
                                  key={i}
                                  onClick={() =>
                                    !isAnswered &&
                                    setActiveLeftMatch(isActive ? null : l)
                                  }
                                  className={`p-3 sm:p-4 border-2 rounded-xl shadow-sm text-xs sm:text-sm font-bold transition-all ${
                                    isActive
                                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 sm:ring-4 ring-blue-100 cursor-pointer"
                                      : isAnswered
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 opacity-90"
                                        : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 cursor-pointer"
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <span>{l}</span>
                                    {isAnswered && (
                                      <CheckCircle2
                                        size={16}
                                        className="text-emerald-500 shrink-0"
                                      />
                                    )}
                                  </div>
                                  {isAnswered && (
                                    <div className="mt-2 pt-2 border-t border-emerald-200/50 flex items-center justify-between text-[10px] sm:text-xs">
                                      <div className="flex items-center gap-1 sm:gap-2 text-emerald-600 font-semibold bg-emerald-100/50 px-2 py-1 rounded line-clamp-1">
                                        <span>➔</span> {currentMatches[l]}
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeMatch(currentQuestion.id, l);
                                        }}
                                        className="p-1 sm:p-1.5 bg-red-50 text-red-500 rounded-md"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="space-y-2 sm:space-y-3 mt-4 sm:mt-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest sm:mb-2">
                              2. Pasangkan Kanan
                            </p>
                            {matchOpts.right.map((r, i) => {
                              const isUsed =
                                Object.values(currentMatches).includes(r);
                              return (
                                <button
                                  key={i}
                                  disabled={isUsed}
                                  onClick={() => {
                                    if (!activeLeftMatch)
                                      return toast.warning(
                                        "Klik opsi Kiri dulu!",
                                      );
                                    handleSelectMatch(
                                      currentQuestion.id,
                                      activeLeftMatch,
                                      r,
                                    );
                                  }}
                                  className={`w-full p-3 sm:p-4 border-2 rounded-xl shadow-sm text-xs sm:text-sm font-bold transition-all text-center ${
                                    isUsed
                                      ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                                      : activeLeftMatch
                                        ? "bg-white border-blue-400 text-blue-600 hover:bg-blue-600 hover:text-white cursor-pointer animate-pulse"
                                        : "bg-white border-gray-200 text-gray-600"
                                  }`}
                                >
                                  {r}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                  {currentQuestion.type === "ESSAY" && (
                    <textarea
                      className="w-full p-4 sm:p-6 bg-gray-50 border-2 border-gray-100 rounded-2xl sm:rounded-3xl text-sm focus:bg-white focus:border-blue-500 transition-all outline-none min-h-37.5 sm:min-h-50"
                      placeholder="Ketik jawaban Anda..."
                      onBlur={(e) => {
                        const updatedAnswers = {
                          ...answers,
                          [currentQuestion.id]: e.target.value,
                        };
                        updateAnswers(updatedAnswers);
                        saveToServer(updatedAnswers);
                      }}
                      onChange={(e) => {
                        const updatedAnswers = {
                          ...answers,
                          [currentQuestion.id]: e.target.value,
                        };
                        updateAnswers(updatedAnswers);
                      }}
                      value={(answers[currentQuestion.id] as string) || ""}
                    />
                  )}

                  {currentQuestion.type === "TRUE_FALSE" && (
                    <div className="grid grid-cols-2 gap-4">
                      {["BENAR", "SALAH"].map((opt) => {
                        const isSelected = answers[currentQuestion.id] === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() =>
                              handleSelectAnswer(currentQuestion.id, opt)
                            }
                            className={`py-4 rounded-2xl border-2 font-bold text-lg transition-all ${
                              isSelected
                                ? opt === "BENAR"
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md"
                                  : "border-red-500 bg-red-50 text-red-700 shadow-md"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-gray-200 bg-white flex justify-between items-center shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
              <button
                disabled={currentIndex === 0}
                onClick={() => handleNavigate((prev) => prev - 1)}
                className="flex items-center gap-1 sm:gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-20 transition-colors"
              >
                <ChevronLeft size={18} />{" "}
                <span className="hidden sm:inline">Soal Sebelumnya</span>
              </button>

              {currentIndex === sortedQuestions.length - 1 ? (
                <button
                  onClick={() => handleSelesaiUjian(false)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Memproses..." : "Selesai Ujian"}{" "}
                  <CheckCircle2 size={18} />
                </button>
              ) : (
                <button
                  onClick={() => handleNavigate((prev) => prev + 1)}
                  className="flex items-center gap-2 px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors"
                >
                  Soal Berikutnya <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="w-80 bg-white border-l border-gray-200 p-6 hidden lg:flex flex-col h-full shrink-0 shadow-lg z-10">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
              <LayoutGrid size={18} className="text-blue-600" /> Daftar Soal
            </h3>

            <div className="grid grid-cols-5 gap-2 overflow-y-auto pr-2 custom-scrollbar">
              {sortedQuestions.map((q, i) => {
                const answer = answers[q.id];
                let isAnswered = false;
                if (answer !== undefined) {
                  if (Array.isArray(answer)) isAnswered = answer.length > 0;
                  else if (typeof answer === "object")
                    isAnswered = Object.keys(answer).length > 0;
                  else isAnswered = answer !== "";
                }
                const isActive = currentIndex === i;

                return (
                  <button
                    key={q.id}
                    onClick={() => handleNavigate(i)}
                    className={`h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center border-2 ${
                      isActive
                        ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200"
                        : isAnswered
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-100"
                          : "border-gray-100 text-gray-400 hover:border-gray-300 bg-gray-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {showMobileNav && (
          <div
            className={`fixed inset-x-0 bottom-0 bg-white border-t rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] p-5 z-90 transition-transform duration-300 lg:hidden ${
              showMobileNav ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm">Pilih Nomor Soal</h3>
              <button
                onClick={() => setShowMobileNav(false)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar pb-2">
              {sortedQuestions.map((q, i) => {
                const answer = answers[q.id];
                let isAnswered = false;
                if (answer !== undefined) {
                  if (Array.isArray(answer)) isAnswered = answer.length > 0;
                  else if (typeof answer === "object")
                    isAnswered = Object.keys(answer).length > 0;
                  else isAnswered = answer !== "";
                }
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      handleNavigate(i);
                      setShowMobileNav(false);
                    }}
                    className={`aspect-square rounded-lg text-xs font-black flex items-center justify-center border-2 ${
                      currentIndex === i
                        ? "border-blue-600 bg-blue-600 text-white"
                        : isAnswered
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-gray-200 text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showConfirmModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md animate-in fade-in zoom-in-95 rounded-3xl bg-white p-6 shadow-2xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4">
                <HelpCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Kumpulkan Jawaban?
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Apakah Anda yakin ingin menyelesaikan ujian ini? Anda{" "}
                <b>tidak bisa</b> mengubah jawaban lagi setelah ini.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={executeSubmit}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Ya, Kumpulkan
                </button>
              </div>
            </div>
          </div>
        )}

        {violationData && (
          <div className="fixed inset-0 z-200 flex items-center justify-center bg-red-950/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-md animate-in zoom-in rounded-3xl bg-white p-8 shadow-2xl text-center border-4 border-red-500">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4 ring-8 ring-red-50">
                <AlertTriangle size={40} />
              </div>

              {violationData.isKicked ? (
                <>
                  <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase">
                    Ujian Dibatalkan!
                  </h2>
                  <p className="text-gray-600 font-medium mb-6">
                    Anda telah melakukan pelanggaran berat sebanyak{" "}
                    <span className="font-bold text-red-600">
                      {MAX_VIOLATION} kali
                    </span>
                    .
                  </p>
                  <button
                    onClick={() => router.push("/siswa?error=pelanggaran")}
                    className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                  >
                    Kembali ke Dashboard
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-black text-gray-900 mb-1 uppercase">
                    Peringatan Kecurangan!
                  </h2>
                  <p className="text-sm text-red-600 font-bold mb-4">
                    Pelanggaran ke: {violationData.count} dari {MAX_VIOLATION}
                  </p>
                  <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100 text-left">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                      Aktivitas Terdeteksi:
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {violationData.jenis}
                    </p>
                  </div>
                  <button
                    onClick={() => setViolationData(null)}
                    className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
                  >
                    Saya Mengerti & Lanjutkan Ujian
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </FullscreenGuard>
  );
}
