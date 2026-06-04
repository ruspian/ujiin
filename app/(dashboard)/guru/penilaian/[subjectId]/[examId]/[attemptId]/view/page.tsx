import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Award,
} from "lucide-react";
import RichTextReadOnly from "@/components/layout/RichTextReadOnly";

type AnswerValue = string | string[] | Record<string, string>;
type OptionMC = { id: string; text: string };
type MatchPair = { left: string; right: string; point: number };

export default async function ViewJawabanSiswaPage({
  params,
}: {
  params: Promise<{ subjectId: string; examId: string; attemptId: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "GURU") redirect("/login");

  const resolvedParams = await params;
  const { subjectId, examId, attemptId } = resolvedParams;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      student: true,
      exam: {
        include: {
          subject: true,
          questions: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!attempt) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100 max-w-2xl mx-auto mt-10">
        <h2 className="text-red-600 font-bold text-lg">
          Data Ujian Siswa tidak ditemukan!
        </h2>
        <Link
          href={`/guru/penilaian/${subjectId}/${examId}`}
          className="text-blue-600 hover:underline mt-2 inline-block font-medium"
        >
          Kembali ke Daftar Peserta
        </Link>
      </div>
    );
  }

  let studentAnswers: Record<string, AnswerValue> = {};
  try {
    if (typeof attempt.answers === "string") {
      studentAnswers = JSON.parse(attempt.answers) as Record<
        string,
        AnswerValue
      >;
    } else if (attempt.answers) {
      studentAnswers = attempt.answers as Record<string, AnswerValue>;
    }
  } catch (e) {
    console.error("Gagal parse jawaban siswa", e);
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm">
        <Link
          href={`/guru/penilaian/${subjectId}/${examId}`}
          className="inline-flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors mb-6"
        >
          <ChevronLeft size={16} /> Kembali ke Daftar Peserta
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <FileText size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-tight">
                {attempt.student.name}
              </h1>
              <p className="text-sm font-bold text-gray-500 mt-1">
                NISN: {attempt.student.nisn}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold border border-gray-200">
                  {attempt.exam.title}
                </span>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                    attempt.status === "CHEATED"
                      ? "bg-red-50 text-red-600 border-red-200"
                      : attempt.status === "SUBMITTED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                  }`}
                >
                  Status: {attempt.status}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-center min-w-35">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Award size={14} /> Total Skor
            </p>
            <p className="text-3xl font-black text-blue-700">
              {attempt.score !== null ? Math.round(attempt.score) : "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {attempt.exam.questions.map((q, index) => {
          const answer = studentAnswers[q.id];
          const isAnswered =
            answer !== undefined && answer !== null && answer !== "";

          return (
            <div
              key={q.id}
              className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="bg-gray-900 text-white w-8 h-8 flex items-center justify-center rounded-xl font-black text-sm">
                    {index + 1}
                  </span>
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-lg uppercase">
                    {q.type === "MULTIPLE_CHOICE" && "PILIHAN GANDA"}
                    {q.type === "MULTIPLE_CHOICE_COMPLEX" &&
                      "PILIHAN GANDA KOMPLEKS"}
                    {q.type === "MATCHING" && "MENJODOHKAN"}
                    {q.type === "TRUE_FALSE" && "BENAR / SALAH"}
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  Bobot: {q.score} Poin
                </span>
              </div>

              <div className="p-6 md:p-8">
                <div className="mb-6 text-gray-800">
                  <RichTextReadOnly content={q.text} />
                </div>

                <div className="bg-gray-50/50 rounded-2xl border border-gray-200 p-5 space-y-4">
                  {(q.type === "MULTIPLE_CHOICE" ||
                    q.type === "MULTIPLE_CHOICE_COMPLEX") && (
                    <div className="space-y-3">
                      {(q.options as unknown as OptionMC[]).map((opt) => {
                        const isStudentChoice =
                          q.type === "MULTIPLE_CHOICE_COMPLEX"
                            ? Array.isArray(answer) && answer.includes(opt.id)
                            : answer === opt.id;

                        const isCorrectKey =
                          q.type === "MULTIPLE_CHOICE_COMPLEX"
                            ? q.correctAnswer.split(",").includes(opt.id)
                            : q.correctAnswer === opt.id;

                        let borderClass = "border-gray-200 bg-white";
                        let badge = null;

                        if (isStudentChoice && isCorrectKey) {
                          borderClass =
                            "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500";
                          badge = (
                            <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full shrink-0">
                              Pilihan Siswa (Benar)
                            </span>
                          );
                        } else if (isStudentChoice && !isCorrectKey) {
                          borderClass = "border-red-400 bg-red-50";
                          badge = (
                            <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full shrink-0">
                              Pilihan Siswa (Salah)
                            </span>
                          );
                        } else if (!isStudentChoice && isCorrectKey) {
                          borderClass =
                            "border-blue-400 bg-blue-50/50 ring-1 ring-blue-400 border-dashed";
                          badge = (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">
                              Kunci Jawaban
                            </span>
                          );
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`flex items-start gap-4 p-4 rounded-xl border ${borderClass}`}
                          >
                            <div
                              className={`w-8 h-8 shrink-0 flex items-center justify-center font-bold text-sm rounded-lg border-2 ${isStudentChoice ? "bg-gray-900 border-gray-900 text-white" : "bg-gray-100 border-gray-200 text-gray-500"}`}
                            >
                              {opt.id}
                            </div>
                            <div className="flex-1 min-w-0 mt-1">
                              <RichTextReadOnly content={opt.text} />
                            </div>
                            {badge && <div className="mt-1">{badge}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "TRUE_FALSE" && (
                    <div className="flex gap-4">
                      {["BENAR", "SALAH"].map((opt) => {
                        const isStudentChoice = answer === opt;
                        const isCorrectKey = q.correctAnswer === opt;

                        let bgClass = "bg-white border-gray-200 text-gray-400";
                        if (isStudentChoice && isCorrectKey)
                          bgClass =
                            "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-100";
                        else if (isStudentChoice && !isCorrectKey)
                          bgClass =
                            "bg-red-50 border-red-500 text-red-700 ring-2 ring-red-100";
                        else if (!isStudentChoice && isCorrectKey)
                          bgClass =
                            "bg-blue-50 border-blue-400 text-blue-700 border-dashed";

                        return (
                          <div
                            key={opt}
                            className={`flex-1 p-4 rounded-2xl border-2 font-bold text-center flex flex-col gap-1 items-center justify-center ${bgClass}`}
                          >
                            <span>{opt}</span>
                            {isStudentChoice && (
                              <span className="text-[10px] font-black uppercase bg-gray-900 text-white px-2 py-0.5 rounded-md mt-1">
                                Siswa
                              </span>
                            )}
                            {isCorrectKey && !isStudentChoice && (
                              <span className="text-[10px] font-black uppercase bg-blue-200 text-blue-800 px-2 py-0.5 rounded-md mt-1">
                                Kunci
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "MATCHING" &&
                    (() => {
                      let correctPairs: MatchPair[] = [];
                      try {
                        correctPairs = JSON.parse(
                          q.correctAnswer,
                        ) as MatchPair[];
                      } catch (e) {
                        console.error("Gagal parse kunci menjodohkan", e);
                      }
                      const studentMatches =
                        (answer as Record<string, string>) || {};

                      return (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Detail Pasangan Menjodohkan:
                          </h4>
                          {correctPairs.map((pair, i) => {
                            const studentAnswerRight =
                              studentMatches[pair.left];
                            const isCorrect = studentAnswerRight === pair.right;
                            const isAttempted = !!studentAnswerRight;

                            return (
                              <div
                                key={i}
                                className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-2xl"
                              >
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                  <span className="text-[10px] font-bold text-gray-400 block mb-1">
                                    SOAL SISI KIRI
                                  </span>
                                  <RichTextReadOnly content={pair.left} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                  <div className="p-3 bg-blue-50/50 border border-blue-100 border-dashed rounded-xl relative">
                                    <span className="text-[10px] font-bold text-blue-500 block mb-1">
                                      KUNCI JAWABAN BENAR
                                    </span>
                                    <RichTextReadOnly content={pair.right} />
                                  </div>

                                  <div
                                    className={`p-3 border rounded-xl relative ${
                                      !isAttempted
                                        ? "bg-gray-50 border-gray-200"
                                        : isCorrect
                                          ? "bg-emerald-50 border-emerald-300"
                                          : "bg-red-50 border-red-300"
                                    }`}
                                  >
                                    <div className="flex justify-between items-center mb-1">
                                      <span
                                        className={`text-[10px] font-bold ${!isAttempted ? "text-gray-400" : isCorrect ? "text-emerald-600" : "text-red-600"}`}
                                      >
                                        JAWABAN SISWA
                                      </span>
                                      {isAttempted &&
                                        (isCorrect ? (
                                          <CheckCircle2
                                            size={14}
                                            className="text-emerald-500"
                                          />
                                        ) : (
                                          <XCircle
                                            size={14}
                                            className="text-red-500"
                                          />
                                        ))}
                                    </div>
                                    {!isAttempted ? (
                                      <span className="text-sm text-gray-400 italic">
                                        Tidak dijawab
                                      </span>
                                    ) : (
                                      <RichTextReadOnly
                                        content={studentAnswerRight}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                  {q.type === "ESSAY" && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          Jawaban Siswa{" "}
                          {isAnswered ? (
                            <CheckCircle2
                              size={14}
                              className="text-emerald-500"
                            />
                          ) : (
                            <AlertCircle size={14} className="text-red-400" />
                          )}
                        </h4>
                        <div className="w-full p-4 bg-white border border-gray-300 rounded-2xl min-h-25 whitespace-pre-wrap text-sm text-gray-800">
                          {isAnswered ? (
                            String(answer)
                          ) : (
                            <span className="text-gray-400 italic">
                              Siswa tidak mengisi jawaban.
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">
                          Kunci Jawaban / Rubrik Penilaian
                        </h4>
                        <div className="w-full p-4 bg-blue-50/50 border border-blue-200 border-dashed rounded-2xl text-sm">
                          <RichTextReadOnly content={q.correctAnswer} />
                        </div>
                      </div>
                    </div>
                  )}

                  {!isAnswered && q.type !== "ESSAY" && (
                    <div className="mt-4 flex items-center gap-2 text-sm font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
                      <AlertCircle size={16} /> Siswa tidak menjawab soal ini.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
