import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Save,
  User,
  HelpCircle,
  FileText,
  Calculator,
} from "lucide-react";
import { simpanKoreksi } from "@/actions/penilaian";

type AnswerValue = string | string[] | Record<string, string>;

type MatchingPair = {
  left: string;
  right: string;
  point?: number;
};

export default async function KoreksiDetailSiswaPage({
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

  if (!attempt || !attempt.exam) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100 max-w-2xl mx-auto mt-10">
        <h2 className="text-red-600 font-bold text-lg">
          Sesi ujian siswa tidak ditemukan!
        </h2>
        <Link
          href={`/guru/penilaian/${subjectId}/${examId}`}
          className="text-blue-600 hover:underline mt-2 inline-block font-medium"
        >
          Kembali ke Daftar Siswa
        </Link>
      </div>
    );
  }

  const studentAnswers = (attempt.answers as Record<string, AnswerValue>) || {};

  const essayQuestions = attempt.exam.questions.filter(
    (q) => q.type === "ESSAY",
  );
  const autoGradedQuestions = attempt.exam.questions.filter(
    (q) => q.type !== "ESSAY",
  );

  // Hitung simulasi skor otomatis
  let currentAutoScore = 0;
  let maxAutoScore = 0;

  autoGradedQuestions.forEach((q) => {
    maxAutoScore += q.score || 0;
    const answer = studentAnswers[q.id];
    if (!answer) return;

    const rawCorrect = q.correctAnswer || "";

    if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
      if (
        typeof answer === "string" &&
        answer.trim().toUpperCase() === rawCorrect.trim().toUpperCase()
      ) {
        currentAutoScore += q.score || 0;
      }
    } else if (q.type === "MULTIPLE_CHOICE_COMPLEX") {
      try {
        let correctArr: string[] = [];
        if (rawCorrect.startsWith("[") && rawCorrect.endsWith("]")) {
          correctArr = (JSON.parse(rawCorrect) as string[]).map((v) =>
            String(v).trim().toUpperCase(),
          );
        } else {
          correctArr = rawCorrect.split(",").map((v) => v.trim().toUpperCase());
        }

        const studentArr = Array.isArray(answer)
          ? (answer as string[]).map((v) => String(v).trim().toUpperCase())
          : [];

        if (
          studentArr.length === correctArr.length &&
          studentArr.every((v) => correctArr.includes(v))
        ) {
          currentAutoScore += q.score || 0;
        }
      } catch (error) {
        console.error("Error Complex UI:", error);
      }
    } else if (q.type === "MATCHING") {
      try {
        const correctData = JSON.parse(rawCorrect) as MatchingPair[];
        const studentData =
          typeof answer === "object" && !Array.isArray(answer)
            ? (answer as Record<string, string>)
            : {};

        let scoreObtained = 0;
        correctData.forEach((item) => {
          const studentAns = studentData[item.left];
          if (
            studentAns &&
            studentAns.trim().toLowerCase() === item.right.trim().toLowerCase()
          ) {
            scoreObtained += item.point || q.score / correctData.length;
          }
        });
        currentAutoScore += scoreObtained;
      } catch (error) {
        console.error("Error Matching UI:", error);
      }
    }
  });

  const handleSubmit = async (formData: FormData) => {
    "use server";
    await simpanKoreksi(subjectId, examId, attemptId, formData);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <Link
          href={`/guru/penilaian/${subjectId}/${examId}`}
          className="inline-flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors mb-4"
        >
          <ChevronLeft size={16} /> Kembali ke Daftar Siswa
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
              <User size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-tight">
                {attempt.student.name}
              </h1>
              <p className="text-gray-500 text-sm font-medium">
                NISN: {attempt.student.nisn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-right">
            <div className="pr-6 border-r border-gray-200 hidden sm:block">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Poin Otomatis (Non-Esai)
              </p>
              <div className="text-2xl font-black text-blue-600">
                {Number.isInteger(currentAutoScore)
                  ? currentAutoScore
                  : currentAutoScore.toFixed(1)}{" "}
                <span className="text-sm text-gray-400">/ {maxAutoScore}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Total Nilai Akhir
              </p>
              <div className="text-3xl font-black text-emerald-600">
                {attempt.score !== null
                  ? Number.isInteger(attempt.score)
                    ? attempt.score
                    : attempt.score.toFixed(1)
                  : "Belum Dinilai"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              Lembar Koreksi Esai Manual
            </h2>
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
              {essayQuestions.length} Soal Esai
            </span>
          </div>

          <div className="p-6 space-y-8">
            {essayQuestions.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Calculator size={48} className="text-gray-300 mb-4" />
                <h3 className="text-gray-700 font-bold text-lg mb-1">
                  Tidak ada soal Esai
                </h3>
                <p className="text-gray-500 text-sm">
                  Ujian ini hanya berisi soal otomatis. Anda cukup klik simpan
                  untuk meresmikan nilai ke database.
                </p>
              </div>
            )}

            {essayQuestions.map((q, index) => {
              const answer = studentAnswers[q.id];

              const renderJawaban = (ans?: AnswerValue) => {
                if (!ans) return null;
                if (typeof ans === "string") return ans;
                if (Array.isArray(ans)) return ans.join(", ");
                if (
                  typeof ans === "object" &&
                  ans !== null &&
                  !Array.isArray(ans)
                ) {
                  return (
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                      {Object.entries(ans).map(([key, val]) => (
                        <li key={key}>
                          <span className="font-bold text-gray-700">{key}</span>{" "}
                          ➔ {String(val)}
                        </li>
                      ))}
                    </ul>
                  );
                }
                return String(ans);
              };

              return (
                <div
                  key={q.id}
                  className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-800 font-bold text-xs rounded-lg uppercase tracking-wider">
                      <HelpCircle size={14} /> Esai {index + 1}
                    </span>
                    <span className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                      Maksimal Poin:{" "}
                      <span className="text-gray-900">{q.score}</span>
                    </span>
                  </div>

                  <div
                    className="prose prose-sm max-w-none mb-4 text-gray-800 font-medium bg-gray-50/50 p-4 rounded-xl border border-gray-100"
                    dangerouslySetInnerHTML={{ __html: q.text }}
                  />

                  <div className="mt-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                    <p className="text-xs font-bold text-blue-800 mb-3 uppercase tracking-wide">
                      Jawaban Siswa:
                    </p>

                    <div className="space-y-4">
                      <div className="p-4 bg-white border border-blue-200 rounded-xl text-sm text-gray-800 min-h-25 whitespace-pre-wrap leading-relaxed shadow-sm">
                        {renderJawaban(answer) || (
                          <span className="text-gray-400 italic">
                            Siswa tidak mengisi jawaban.
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-3">
                        <label className="text-sm font-bold text-gray-700">
                          Beri Nilai Esai:
                        </label>
                        <input
                          type="number"
                          name={`nilai_${q.id}`}
                          defaultValue={0}
                          min="0"
                          max={q.score}
                          step="0.1"
                          className="w-28 px-4 py-2.5 bg-white border-2 border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 rounded-xl text-center font-black text-emerald-700 text-lg transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-6 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all hover:-translate-y-1"
          >
            <Save size={20} />
            Simpan & Konfirmasi Nilai Akhir
          </button>
        </div>
      </form>
    </div>
  );
}
