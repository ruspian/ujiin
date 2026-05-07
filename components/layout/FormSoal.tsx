"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, XCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "./RichTextEditor";
import { createQuestion } from "@/actions/question";
import { FormSoalProps, OptionData, QuestionType } from "@/types/question";

export default function FormSoal({
  subjectId,
  classId,
  typeId,
}: FormSoalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [questionType, setQuestionType] =
    useState<QuestionType>("MULTIPLE_CHOICE");
  const [text, setText] = useState("");

  const [options, setOptions] = useState({ A: "", B: "", C: "", D: "", E: "" });
  const [correctSingle, setCorrectSingle] = useState<string>("A");
  const [correctMultiple, setCorrectMultiple] = useState<string[]>([]);
  const [score, setScore] = useState<number>(10);

  const [textAnswer, setTextAnswer] = useState("");

  const [matchingPairs, setMatchingPairs] = useState([
    { left: "", right: "", point: 5 },
    { left: "", right: "", point: 5 },
  ]);

  const handleToggleMultiple = (opt: string) => {
    setCorrectMultiple((prev) =>
      prev.includes(opt) ? prev.filter((item) => item !== opt) : [...prev, opt],
    );
  };

  const handleAddMatchingPair = () => {
    setMatchingPairs([...matchingPairs, { left: "", right: "", point: 5 }]);
  };

  const handleRemoveMatchingPair = (index: number) => {
    const newPairs = [...matchingPairs];
    newPairs.splice(index, 1);
    setMatchingPairs(newPairs);
  };

  const totalMatchingScore = matchingPairs.reduce(
    (acc, curr) => acc + (Number(curr.point) || 0),
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text || text === "<p></p>" || text.trim() === "") {
      return toast.error("Teks pertanyaan wajib diisi!");
    }

    let finalOptions: OptionData = [];
    let finalCorrectAnswer: string = "";
    let finalScore = score;

    if (questionType === "MULTIPLE_CHOICE") {
      if (!options.A || !options.B)
        return toast.error("Minimal Opsi A dan B harus diisi!");
      finalOptions = [
        { id: "A", text: options.A },
        { id: "B", text: options.B },
        ...(options.C ? [{ id: "C", text: options.C }] : []),
        ...(options.D ? [{ id: "D", text: options.D }] : []),
        ...(options.E ? [{ id: "E", text: options.E }] : []),
      ];
      finalCorrectAnswer = correctSingle;
    } else if (questionType === "MULTIPLE_CHOICE_COMPLEX") {
      if (!options.A || !options.B)
        return toast.error("Minimal Opsi A dan B harus diisi!");
      if (correctMultiple.length < 1)
        return toast.error("Pilih minimal 1 jawaban benar!");
      finalOptions = [
        { id: "A", text: options.A },
        { id: "B", text: options.B },
        ...(options.C ? [{ id: "C", text: options.C }] : []),
        ...(options.D ? [{ id: "D", text: options.D }] : []),
        ...(options.E ? [{ id: "E", text: options.E }] : []),
      ];
      finalCorrectAnswer = correctMultiple.join(",");
    } else if (questionType === "ESSAY" || questionType === "SHORT_ANSWER") {
      if (!textAnswer)
        return toast.error("Kunci jawaban / rubrik penilaian wajib diisi!");
      finalOptions = [];
      finalCorrectAnswer = textAnswer;
    } else if (questionType === "MATCHING") {
      const isValid = matchingPairs.every(
        (p) => p.left.trim() !== "" && p.right.trim() !== "",
      );
      if (!isValid) return toast.error("Semua baris menjodohkan harus diisi!");

      finalOptions = {
        left: matchingPairs.map((p) => p.left),
        right: matchingPairs
          .map((p) => p.right)
          .sort(() => Math.random() - 0.5),
      };

      finalCorrectAnswer = JSON.stringify(matchingPairs);
      finalScore = totalMatchingScore;
    }

    setIsLoading(true);

    try {
      const result = await createQuestion({
        subjectId,
        classId: classId as string,
        typeId,
        type: questionType,
        score: finalScore,
        text,
        options: finalOptions,
        correctAnswer: finalCorrectAnswer,
      });

      if (result.success) {
        toast.success(result.message);
        router.push(
          `/guru/soal/${subjectId}?classId=${classId}&type=${typeId}`,
        );
      } else {
        toast.error(result.message);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error("Terjadi kesalahan jaringan saat menyimpan soal.");
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-bold text-gray-800 block mb-2">
            Jenis Soal
          </label>
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as QuestionType)}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500 font-medium text-blue-700 shadow-sm"
          >
            <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
            <option value="MULTIPLE_CHOICE_COMPLEX">
              Pilihan Ganda Kompleks
            </option>
            <option value="MATCHING">Menjodohkan</option>
            <option value="SHORT_ANSWER">Isian Singkat </option>
            <option value="ESSAY">Uraian / Esai </option>
          </select>
        </div>

        <div className="w-full md:w-48">
          <label className="text-sm font-bold text-gray-800 block mb-2">
            {questionType === "MATCHING"
              ? "Total Skor (Otomatis)"
              : "Bobot Nilai"}
          </label>
          {questionType === "MATCHING" ? (
            <input
              type="number"
              readOnly
              value={totalMatchingScore}
              title="Dijumlahkan otomatis dari poin pasangan"
              className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 text-center shadow-sm cursor-not-allowed"
            />
          ) : (
            <input
              type="number"
              min="1"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-800 text-center shadow-sm"
            />
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-800">
            Teks Soal <span className="text-red-500">*</span>
          </label>
          <RichTextEditor content={text} onChange={(val) => setText(val)} />
        </div>

        <hr className="border-gray-100" />

        {(questionType === "MULTIPLE_CHOICE" ||
          questionType === "MULTIPLE_CHOICE_COMPLEX") && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-gray-800">
                Opsi Jawaban & Kunci
              </label>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                Pilih kotak hijau untuk mengatur Kunci Jawaban
              </span>
            </div>

            {(["A", "B", "C", "D", "E"] as const).map((opt) => {
              const isChecked =
                questionType === "MULTIPLE_CHOICE"
                  ? correctSingle === opt
                  : correctMultiple.includes(opt);

              return (
                <div
                  key={opt}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${isChecked ? "border-green-500 bg-green-50/30" : "border-gray-100 bg-white"}`}
                >
                  <div className="pt-2">
                    {questionType === "MULTIPLE_CHOICE" ? (
                      <input
                        type="radio"
                        name="correct"
                        checked={isChecked}
                        onChange={() => setCorrectSingle(opt)}
                        className="w-5 h-5 text-green-600 focus:ring-green-500 cursor-pointer"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMultiple(opt)}
                        className="w-5 h-5 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                      />
                    )}
                  </div>

                  <div className="flex-1 flex gap-3">
                    <div
                      className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center font-bold text-lg ${isChecked ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}`}
                    >
                      {opt}
                    </div>
                    <input
                      type="text"
                      placeholder={`Tulis opsi ${opt}...`}
                      value={options[opt as keyof typeof options]}
                      onChange={(e) =>
                        setOptions({ ...options, [opt]: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-transparent border-b border-gray-200 focus:border-blue-500 focus:ring-0 text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(questionType === "ESSAY" || questionType === "SHORT_ANSWER") && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <label className="text-sm font-bold text-gray-800">
              {questionType === "ESSAY"
                ? "Rubrik Penilaian / Kunci Jawaban"
                : "Kunci Jawaban Pasti"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder={
                questionType === "ESSAY"
                  ? "Contoh: Siswa menjawab A mendapat skor 5..."
                  : "Tulis jawaban singkat yang benar..."
              }
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-green-500 focus:border-green-500"
            />
            <p className="text-xs text-gray-500">
              {questionType === "ESSAY"
                ? "Ditampilkan ke guru saat proses koreksi manual."
                : "Sistem akan menilai benar jika jawaban siswa sama persis dengan ini."}
            </p>
          </div>
        )}

        {questionType === "MATCHING" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <label className="text-sm font-bold text-gray-800 block">
              Pasangan Menjodohkan & Poin
            </label>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <div className="flex gap-3 mb-2 px-1">
                <span className="flex-1 text-xs font-bold text-gray-500 uppercase">
                  Premis (Kiri)
                </span>
                <span className="flex-1 text-xs font-bold text-gray-500 uppercase">
                  Jawaban (Kanan)
                </span>
                <span className="w-20 text-xs font-bold text-gray-500 uppercase text-center">
                  Poin
                </span>
                <span className="w-10"></span>
              </div>

              {matchingPairs.map((pair, index) => (
                <div key={index} className="flex items-start gap-3">
                  <input
                    type="text"
                    placeholder="Sisi Kiri..."
                    value={pair.left}
                    onChange={(e) => {
                      const newPairs = [...matchingPairs];
                      newPairs[index].left = e.target.value;
                      setMatchingPairs(newPairs);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Sisi Kanan..."
                    value={pair.right}
                    onChange={(e) => {
                      const newPairs = [...matchingPairs];
                      newPairs[index].right = e.target.value;
                      setMatchingPairs(newPairs);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    min="1"
                    value={pair.point}
                    onChange={(e) => {
                      const newPairs = [...matchingPairs];
                      newPairs[index].point = Number(e.target.value);
                      setMatchingPairs(newPairs);
                    }}
                    className="w-20 px-3 py-2 rounded-lg border border-gray-300 text-sm text-center font-bold focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMatchingPair(index)}
                    disabled={matchingPairs.length <= 2}
                    className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-colors shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddMatchingPair}
                className="mt-3 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Plus size={16} /> Tambah Pasangan
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2"
        >
          <XCircle size={18} /> Batal
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
        >
          <Save size={18} /> Simpan Soal
        </button>
      </div>
    </form>
  );
}
