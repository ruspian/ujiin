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
  AnswerValue,
  OptionMatching,
  OptionMC,
  RuangUjianProps,
} from "@/types/ruang-ujian";
import { examCall, UnauthorizedError } from "@/lib/exam-api";
import { useExamSync } from "@/hooks/useExamSync";
import FullscreenGuard from "./FullscreenGuard";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import { isNativeApp } from "@/lib/native-app";
import { HEARTBEAT_INTERVAL_MS, MAX_VIOLATIONS } from "@/lib/exam-config";
import { usePreloadQuestionImages } from "@/hooks/usePreloadQuestionImages";
import RichTextReadOnly from "./RichTextReadOnly";
import { useExamStore } from "@/store/useExamStore";

const TYPE_ORDER: Record<string, number> = {
  MULTIPLE_CHOICE: 1,
  MULTIPLE_CHOICE_COMPLEX: 2,
  MATCHING: 3,
  TRUE_FALSE: 4,
  ESSAY: 5,
};

interface GuardProps {
  children: React.ReactNode;
  attemptId?: string;
  onViolation?: (jenis: string) => void;
}

/** Di APK tidak perlu API fullscreen browser: aplikasi sudah immersive + terkunci. */
const PassThroughGuard = ({ children }: GuardProps) => <>{children}</>;

type HeartbeatRes = {
  success: boolean;
  status?: string;
  remainingSeconds?: number;
  serverTime?: string;
};

export default function RuangUjian({
  attemptId,
  examName,
  subjectName,
  questions,
  endTime,
  initialAnswers,
  initialSeq = 0,
  serverTime,
}: RuangUjianProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const { answers, initExam, clearExam } = useExamStore();
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
  const [isNative, setIsNative] = useState(false);
  // Sisa waktu dihitung dari DEADLINE + selisih jam server, bukan dikurangi
  // per detik. Interval dibekukan saat app/tab di background, sehingga timer
  // lama bisa menampilkan sisa waktu yang lebih banyak dari kenyataan.
  const deadlineRef = useRef<number>(new Date(endTime).getTime());
  const clockOffsetRef = useRef<number>(0);
  const submitRef = useRef<() => void>(() => {});

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [violationData, setViolationData] = useState<{
    jenis: string;
    count: number;
    isKicked: boolean;
  } | null>(null);
  const isProcessingViolation = useRef(false);
  const MAX_VIOLATION = MAX_VIOLATIONS;

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mesin sinkronisasi semi daring: jawaban/pelanggaran/submit ditulis ke HP
  // lebih dulu, dikirim ke server di latar belakang, dan dicoba ulang otomatis.
  const sync = useExamSync({
    attemptId,
    enabled: isHydrated,
    onClosed: (reason) => {
      clearExam();
      router.replace(
        reason === "CHEATED"
          ? "/siswa?error=pelanggaran"
          : "/siswa?error=sudah_selesai",
      );
    },
    onSubmitted: () => {
      toast.success("Ujian berhasil dikumpulkan!");
      clearExam();
      router.push("/siswa");
    },
    onUnauthorized: () => {
      // jawaban tetap tersimpan di HP; setelah login ulang akan dikirim
      toast.error("Sesi login berakhir. Silakan login ulang.");
      router.replace("/login-siswa");
    },
    onViolation: (r) => setViolationData(r),
  });
  const syncRef = useRef(sync);
  useEffect(() => {
    syncRef.current = sync;
  });
  const isSubmitting = sync.submitting;

  // inisialisasi zustand pas pertama render
  useEffect(() => {
    Promise.resolve().then(() => {
      initExam(attemptId, initialAnswers, initialSeq);
      setIsNative(isNativeApp());
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

  // Cegah tab ditutup tidak sengaja saat masih ada jawaban yang belum terkirim
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      const s = useExamStore.getState();
      if (s.seq > s.syncedSeq || s.violations.length > 0 || s.submitRequested) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Web: dibatasi 1 pelanggaran per 2 detik (1 kejadian sering memicu banyak event)
  const handlePelanggaran = (jenis: string) => {
    if (isProcessingViolation.current) return;
    isProcessingViolation.current = true;
    setTimeout(() => {
      isProcessingViolation.current = false;
    }, 2000);
    sync.reportViolation(jenis, "web");
  };

  // Pelanggaran dari aplikasi Android: TIDAK di-throttle (tiap kejadian
  // penting); antrean dikirim berurutan oleh mesin sinkronisasi.
  const handleNativeViolation = (jenis: string) => {
    sync.reportViolation(jenis, "android");
  };

  // semua proteksi sisi web (copy/paste, devtools, screenshot, pindah tab, dll.)
  useAntiCheat({
    onViolation: handlePelanggaran,
    enabled: !isSubmitting,
    watchFocus: !isNative,
  });

  // status sesi + blok tombol back
  useEffect(() => {
    examCall<{ success: boolean; status?: string }>(
      { type: "status", attemptId },
      10_000,
    )
      .then((res) => {
        if (res.success && res.status === "CHEATED") {
          router.replace("/siswa?error=pelanggaran");
        } else if (res.success && res.status === "SUBMITTED") {
          router.replace("/siswa?error=sudah_selesai");
        }
      })
      .catch(() => {
        // offline saat membuka: abaikan, mesin sinkronisasi akan menyusul
      });

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      toast.error("Tidak diperkenankan untuk kembali ke halaman sebelumnya!");
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pelanggaran yang dideteksi aplikasi Android (fokus hilang, split-screen,
  // screenshot, dll.)
  useEffect(() => {
    if (!isNative) return;

    const onNativeViolation = (e: Event) => {
      const jenis = (e as CustomEvent<{ jenis?: string }>).detail?.jenis;
      if (jenis) handleNativeViolation(String(jenis));
    };
    window.addEventListener("ujiin-native-violation", onNativeViolation);

    try {
      window.UjiinNative?.examReady?.();
      const pending = JSON.parse(window.UjiinNative?.drainViolations?.() ?? "[]");
      if (Array.isArray(pending)) {
        pending.forEach((j) => handleNativeViolation(String(j)));
      }
    } catch (error) {
      console.error(error);
    }

    return () =>
      window.removeEventListener("ujiin-native-violation", onNativeViolation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative]);

  const handleSelesaiUjian = (isAutoSubmit = false) => {
    if (!isAutoSubmit) {
      setShowConfirmModal(true);
      return;
    }
    executeSubmit();
  };

  // Submit = "permintaan" yang ditulis ke HP lalu dikirim berulang sampai server
  // menerima (jaringan jelek tidak membuat siswa tertahan atau jawaban hilang).
  const executeSubmit = () => {
    setShowConfirmModal(false);
    sync.requestSubmit();
  };
  useEffect(() => {
    submitRef.current = executeSubmit;
  });

  // selaraskan jam: selisih jam server vs jam HP saat halaman dimuat
  useEffect(() => {
    clockOffsetRef.current = new Date(serverTime).getTime() - Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // timer berbasis deadline
  useEffect(() => {
    const computeLeft = () =>
      Math.max(
        0,
        Math.floor(
          (deadlineRef.current - (Date.now() + clockOffsetRef.current)) / 1000,
        ),
      );

    const tick = () => {
      const left = computeLeft();
      setTimeLeft(left);
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => submitRef.current(), 0);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // heartbeat: sinkron waktu server + deteksi sesi yang ditutup/di-reset guru.
  // Memakai fetch dengan batas waktu sendiri, jadi tidak ikut tertahan oleh
  // request lain yang sedang macet.
  useEffect(() => {
    let stopped = false;

    const beat = async () => {
      try {
        const r = await examCall<HeartbeatRes>(
          { type: "heartbeat", attemptId },
          10_000,
        );
        if (stopped || !r || !r.success) return;

        syncRef.current.noteContact();

        if (r.status === "CHEATED") {
          router.replace("/siswa?error=pelanggaran");
          return;
        }
        if (r.status === "SUBMITTED") {
          router.replace("/siswa?error=sudah_selesai");
          return;
        }

        if (r.serverTime && typeof r.remainingSeconds === "number") {
          const serverNow = new Date(r.serverTime).getTime();
          clockOffsetRef.current = serverNow - Date.now();
          deadlineRef.current = serverNow + r.remainingSeconds * 1000;
          if (r.remainingSeconds <= 0) submitRef.current();
        }

        // koneksi terbukti hidup: dorong apa pun yang masih tertunda
        void syncRef.current.flush();
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          syncRef.current.noteContact();
          toast.error("Sesi login berakhir. Silakan login ulang.");
          router.replace("/login-siswa");
        }
        // selain itu: offline, timer lokal tetap jalan
      }
    };

    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    window.addEventListener("online", beat);
    return () => {
      stopped = true;
      clearInterval(interval);
      window.removeEventListener("online", beat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

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
  usePreloadQuestionImages(sortedQuestions, currentIndex, isHydrated);
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

    sync.saveAnswers(updatedAnswers);
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

    sync.saveAnswers(updatedAnswers);
    setActiveLeftMatch(null);
  };

  const removeMatch = (questionId: string, left: string) => {
    const currentAnswers = { ...answers };
    const currentMatches = {
      ...((currentAnswers[questionId] as Record<string, string>) || {}),
    };
    delete currentMatches[left];

    const updatedAnswers = { ...currentAnswers, [questionId]: currentMatches };

    sync.saveAnswers(updatedAnswers);
  };

  if (!isHydrated || !sortedQuestions.length) return null;

  const isTimeCritical = timeLeft > 0 && timeLeft <= 300;
  const Guard: React.ComponentType<GuardProps> = isNative
    ? PassThroughGuard
    : FullscreenGuard;

  return (
    <Guard attemptId={attemptId} onViolation={handlePelanggaran}>
      <div
        className="fixed inset-0 z-50 bg-gray-50 flex flex-col h-screen overflow-hidden select-none [&_textarea]:select-text"
        style={{ WebkitTouchCallout: "none" }}
      >
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
                {sync.syncState === "saving" && (
                  <span className="text-blue-500 animate-pulse">
                    Menyimpan...
                  </span>
                )}
                {sync.syncState === "pending" && (
                  <span className="text-amber-600">
                    Tersimpan di HP · menunggu sinyal
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs tracking-wide transition-colors shadow-sm ${
                !isOnline
                  ? "bg-red-100 text-red-600 border border-red-200 animate-pulse"
                  : sync.connection === "unstable"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-100"
              }`}
              title={
                !isOnline
                  ? "Koneksi Terputus"
                  : sync.connection === "unstable"
                    ? "Jaringan tidak stabil"
                    : "Internet Stabil"
              }
            >
              {isOnline && sync.connection === "online" ? (
                <Wifi size={16} />
              ) : (
                <WifiOff size={16} />
              )}
              <span className="hidden sm:inline">
                {!isOnline
                  ? "Offline"
                  : sync.connection === "unstable"
                    ? "Tidak stabil"
                    : "Online"}
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
                                  className={`p-3 sm:p-4 border-2 rounded-xl shadow-sm transition-all flex flex-col gap-2 text-left ${
                                    isActive
                                      ? "border-blue-600 bg-blue-50 ring-2 sm:ring-4 ring-blue-100 cursor-pointer"
                                      : isAnswered
                                        ? "border-emerald-500 bg-emerald-50 opacity-90"
                                        : "border-gray-200 bg-white hover:border-blue-300 cursor-pointer"
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0 text-xs sm:text-sm font-bold text-gray-700">
                                      <RichTextReadOnly content={l} />
                                    </div>
                                    {isAnswered && (
                                      <CheckCircle2
                                        size={16}
                                        className="text-emerald-500 shrink-0 mt-0.5"
                                      />
                                    )}
                                  </div>

                                  {isAnswered && (
                                    <div className="mt-2 pt-2 border-t border-emerald-200/50 flex flex-col gap-1.5">
                                      <div className="flex items-start gap-2 text-emerald-700 font-bold bg-emerald-100/50 p-2 rounded text-[10px] sm:text-xs">
                                        <span className="shrink-0 mt-0.5">
                                          ➔
                                        </span>
                                        <div className="flex-1 min-w-0 font-medium">
                                          <RichTextReadOnly
                                            content={currentMatches[l]}
                                          />
                                        </div>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeMatch(currentQuestion.id, l);
                                        }}
                                        className="self-end p-1 bg-red-50 text-red-500 hover:bg-red-100 rounded-md transition-colors"
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
                                  className={`w-full p-3 sm:p-4 border-2 rounded-xl shadow-sm text-left flex items-center transition-all ${
                                    isUsed
                                      ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                                      : activeLeftMatch
                                        ? "bg-white border-blue-400 text-blue-600 hover:bg-blue-600 hover:text-white cursor-pointer animate-pulse"
                                        : "bg-white border-gray-200 text-gray-600"
                                  }`}
                                >
                                  <div className="flex-1 min-w-0 text-xs sm:text-sm font-bold pointer-events-none">
                                    <RichTextReadOnly content={r} />
                                  </div>
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
                      onPaste={(e) => e.preventDefault()}
                      onDrop={(e) => e.preventDefault()}
                      spellCheck={false}
                      autoComplete="off"
                      autoCorrect="off"
                      onBlur={() => {
                        void sync.flush();
                      }}
                      onChange={(e) => {
                        const updatedAnswers = {
                          ...answers,
                          [currentQuestion.id]: e.target.value,
                        };
                        // esai: tunda kirim 1,5 detik setelah berhenti mengetik
                        sync.saveAnswers(updatedAnswers, 1500);
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

        {isSubmitting && (
          <div className="fixed inset-0 z-150 flex items-center justify-center bg-white/90 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl border border-gray-100">
              <Loader2
                size={40}
                className="mx-auto mb-4 animate-spin text-blue-600"
              />
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                Mengumpulkan jawaban...
              </h2>
              <p className="text-sm text-gray-500">
                {sync.connection === "unstable" || !isOnline
                  ? "Jaringan sedang tidak stabil. Jawaban Anda aman di HP ini dan akan dikirim ulang otomatis. Jangan tutup halaman ini."
                  : "Mohon tunggu sebentar."}
              </p>
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
    </Guard>
  );
}
