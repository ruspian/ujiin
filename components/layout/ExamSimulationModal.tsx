"use client";

import { useState, useMemo } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Monitor,
  Smartphone,
  CheckCircle2,
  Menu,
} from "lucide-react";
import {
  ExamSimulationModalProps,
  OptionMatching,
  OptionMC,
} from "@/types/exam";
import { toast } from "sonner";
import RichTextReadOnly from "./RichTextReadOnly";

const TYPE_ORDER: Record<string, number> = {
  MULTIPLE_CHOICE: 1,
  MULTIPLE_CHOICE_COMPLEX: 2,
  MATCHING: 3,
  TRUE_FALSE: 4,
  ESSAY: 5,
};

type AnswerType = string | string[] | Record<string, string>;

export default function ExamSimulationModal({
  questions,
  subjectName,
  examName,
}: ExamSimulationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [simulatedAnswers, setSimulatedAnswers] = useState<
    Record<string, AnswerType>
  >({});
  const [isMobileView, setIsMobileView] = useState(false);

  const [showMobileNav, setShowMobileNav] = useState(false);
  const [activeLeftMatch, setActiveLeftMatch] = useState<string | null>(null);

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

  const handleSelectAnswer = (
    questionId: string,
    value: string,
    isComplex: boolean = false,
  ) => {
    setSimulatedAnswers((prev) => {
      if (isComplex) {
        const currentVals = (prev[questionId] as string[]) || [];
        if (currentVals.includes(value)) {
          return {
            ...prev,
            [questionId]: currentVals.filter((v) => v !== value),
          };
        } else {
          return { ...prev, [questionId]: [...currentVals, value] };
        }
      }
      return { ...prev, [questionId]: value };
    });
  };

  const handleSelectMatch = (
    questionId: string,
    left: string,
    right: string,
  ) => {
    setSimulatedAnswers((prev) => {
      const currentMatches = (prev[questionId] as Record<string, string>) || {};
      return { ...prev, [questionId]: { ...currentMatches, [left]: right } };
    });
    setActiveLeftMatch(null);
  };

  const removeMatch = (questionId: string, left: string) => {
    setSimulatedAnswers((prev) => {
      const currentMatches = {
        ...((prev[questionId] as Record<string, string>) || {}),
      };
      delete currentMatches[left];
      return { ...prev, [questionId]: currentMatches };
    });
  };

  if (!sortedQuestions.length) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-100 shadow-sm"
      >
        <LayoutGrid size={18} /> Preview
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-100 bg-gray-50 flex flex-col animate-in fade-in duration-300">
          <div className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between shadow-sm shrink-0 z-10">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="hidden md:flex bg-blue-600 text-white p-2 rounded-lg">
                <Monitor size={20} />
              </div>
              <div>
                <h2 className="text-xs md:text-sm font-bold text-gray-900 leading-none line-clamp-1">
                  {subjectName}
                </h2>
                <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider">
                  {examName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => setIsMobileView(!isMobileView)}
                className={`hidden md:block p-2 rounded-lg transition-colors ${
                  isMobileView
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-400 hover:bg-gray-100"
                }`}
                title="Simulasi Layar HP"
              >
                {isMobileView ? (
                  <Smartphone size={20} />
                ) : (
                  <Monitor size={20} />
                )}
              </button>

              <div className="hidden md:block h-8 w-px bg-gray-200 mx-2" />

              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs md:text-sm hover:bg-red-100 transition-colors"
              >
                <X size={18} /> <span className="hidden md:inline">Keluar</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden justify-center items-center bg-gray-100/50">
            <div
              className={`flex flex-col bg-white transition-all duration-500 overflow-hidden shadow-2xl relative
                ${
                  isMobileView
                    ? "w-full max-w-93.75 h-full max-h-203 md:rounded-[2.5rem] md:border-[6px] border-gray-800"
                    : "w-full h-full"
                }
              `}
            >
              <div className="flex-1 overflow-y-auto p-5 md:p-10 custom-scrollbar relative">
                <div
                  className={`${isMobileView ? "max-w-full" : "max-w-3xl"} mx-auto`}
                >
                  <div className="flex justify-between items-center mb-6 md:mb-8">
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
                        {currentQuestion.type === "TRUE_FALSE" &&
                          "Benar / Salah"}
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
                        className={`p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 ${!isMobileView && "lg:hidden"}`}
                      >
                        <Menu size={18} />
                      </button>
                    </div>
                  </div>

                  <div
                    className={`mb-8 ${isMobileView ? "text-base" : "text-lg"} w-full max-w-full overflow-x-auto whitespace-pre-wrap wrap-break-words`}
                  >
                    <RichTextReadOnly
                      key={currentQuestion.id}
                      content={currentQuestion.text}
                    />
                  </div>

                  <div className="space-y-3 mb-10 animate-in slide-in-from-bottom-4 duration-500">
                    {(currentQuestion.type === "MULTIPLE_CHOICE" ||
                      currentQuestion.type === "MULTIPLE_CHOICE_COMPLEX") &&
                      (currentQuestion.options as unknown as OptionMC[]).map(
                        (opt) => {
                          const isComplex =
                            currentQuestion.type === "MULTIPLE_CHOICE_COMPLEX";
                          const isSelected = isComplex
                            ? (
                                (simulatedAnswers[
                                  currentQuestion.id
                                ] as string[]) || []
                              ).includes(opt.id)
                            : simulatedAnswers[currentQuestion.id] === opt.id;

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
                                } ${isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-400"}
                            `}
                              >
                                {opt.id}
                              </div>
                              <div className="flex-1 min-w-0 pointer-events-none mt-0.5">
                                <RichTextReadOnly
                                  key={`${currentQuestion.id}-${opt.id}`}
                                  content={opt.text}
                                />
                              </div>
                            </button>
                          );
                        },
                      )}

                    {currentQuestion.type === "MATCHING" &&
                      (() => {
                        const matchOpts =
                          currentQuestion.options as unknown as OptionMatching;
                        const currentMatches =
                          (simulatedAnswers[currentQuestion.id] as Record<
                            string,
                            string
                          >) || {};

                        return (
                          <div
                            className={`grid gap-4 sm:gap-6 bg-gray-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200 ${isMobileView ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}
                          >
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
                                    className={`p-3 border-2 rounded-xl shadow-sm transition-all flex flex-col gap-2 text-left ${
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
                                      <div className="pt-2 border-t border-emerald-200/50 flex flex-col gap-1.5">
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
                                          title="Hapus Pasangan"
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
                        onChange={(e) =>
                          handleSelectAnswer(currentQuestion.id, e.target.value)
                        }
                        value={
                          (simulatedAnswers[currentQuestion.id] as string) || ""
                        }
                      />
                    )}

                    {currentQuestion.type === "TRUE_FALSE" && (
                      <div className="grid grid-cols-2 gap-4">
                        {["BENAR", "SALAH"].map((opt) => {
                          const isSelected =
                            simulatedAnswers[currentQuestion.id] === opt;
                          const isTrue = opt === "BENAR";

                          return (
                            <button
                              key={opt}
                              onClick={() =>
                                handleSelectAnswer(currentQuestion.id, opt)
                              }
                              className={`py-4 rounded-2xl border-2 font-bold text-lg transition-all ${
                                isSelected
                                  ? isTrue
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

              {/* FOOTER NAVIGASI  */}
              <div className="p-3 sm:p-4 border-t border-gray-200 bg-white flex justify-between items-center shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => handleNavigate((prev) => prev - 1)}
                  className="flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-6 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-20"
                >
                  <ChevronLeft size={18} />{" "}
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>

                {currentIndex === sortedQuestions.length - 1 ? (
                  <button
                    onClick={() => {
                      if (confirm("Selesai Simulasi?")) setIsOpen(false);
                    }}
                    className="flex items-center gap-1 sm:gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs sm:text-sm"
                  >
                    Selesai{" "}
                    <CheckCircle2 size={16} className="hidden sm:block" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleNavigate((prev) => prev + 1)}
                    className="flex items-center gap-1 sm:gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-100"
                  >
                    <span className="hidden sm:inline">Selanjutnya</span>
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>

              {/* POP-UP MODE HP */}
              {(showMobileNav || isMobileView) && (
                <div
                  className={`absolute inset-x-0 bottom-0 bg-white border-t rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-5 z-50 transition-transform duration-300 ${showMobileNav ? "translate-y-0" : "translate-y-full"}`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-sm">Pilih Nomor Soal</h3>
                    <button
                      onClick={() => setShowMobileNav(false)}
                      className="p-1 bg-gray-100 rounded-full"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar pb-2">
                    {sortedQuestions.map((q, i) => {
                      const answer = simulatedAnswers[q.id];
                      let isAnswered = false;
                      if (answer !== undefined) {
                        if (Array.isArray(answer))
                          isAnswered = answer.length > 0;
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
            </div>

            {/* SIDEBAR DESKTOP  */}
            {!isMobileView && (
              <div className="w-80 bg-white border-l border-gray-200 p-6 hidden lg:flex flex-col h-full shrink-0 shadow-lg z-10">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
                  <LayoutGrid size={18} className="text-blue-600" /> Navigasi
                  Soal
                </h3>

                <div className="grid grid-cols-5 gap-2 overflow-y-auto pr-2 custom-scrollbar">
                  {sortedQuestions.map((q, i) => {
                    const answer = simulatedAnswers[q.id];
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

                <div className="mt-auto pt-6 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase">
                    <div className="w-4 h-4 bg-emerald-500 rounded-md"></div>{" "}
                    Sudah Dijawab
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase">
                    <div className="w-4 h-4 bg-blue-600 rounded-md"></div>{" "}
                    Sedang Dibuka
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase">
                    <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded-md"></div>{" "}
                    Belum Dijawab
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
