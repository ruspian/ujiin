"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { Search, Filter, XCircle } from "lucide-react";

export default function QuestionSearchFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("q") || "";
  const initialType = searchParams.get("qType") || "ALL";

  const [text, setText] = useState(initialSearch);
  const [debouncedText] = useDebounce(text, 500);

  const [questionType, setQuestionType] = useState(initialType);

  useEffect(() => {
    const currentUrl = new URLSearchParams(Array.from(searchParams.entries()));

    if (debouncedText) {
      currentUrl.set("q", debouncedText);
    } else {
      currentUrl.delete("q");
    }

    if (questionType && questionType !== "ALL") {
      currentUrl.set("qType", questionType);
    } else {
      currentUrl.delete("qType");
    }

    const newSearch = currentUrl.toString();
    const oldSearch = searchParams.toString();

    if (newSearch !== oldSearch) {
      const query = newSearch ? `?${newSearch}` : "";

      router.push(`${pathname}${query}`, { scroll: false });
    }
  }, [debouncedText, questionType, pathname, router, searchParams]);

  const handleReset = () => {
    setText("");
    setQuestionType("ALL");
  };

  const hasActiveFilter = text !== "" || questionType !== "ALL";

  return (
    <div className="flex flex-col md:flex-row gap-3 w-full bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Cari kata di dalam teks soal..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="relative w-full md:w-64 shrink-0 flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter size={18} className="text-gray-400" />
          </div>
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:bg-white focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none"
          >
            <option value="ALL">Semua Jenis Soal</option>
            <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
            <option value="MULTIPLE_CHOICE_COMPLEX">
              Pilihan Ganda Kompleks
            </option>
            <option value="MATCHING">Menjodohkan</option>
            <option value="SHORT_ANSWER">Isian Singkat</option>
            <option value="ESSAY">Uraian / Esai</option>
          </select>
        </div>

        {hasActiveFilter && (
          <button
            onClick={handleReset}
            className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-gray-200 hover:border-red-200 transition-colors flex items-center justify-center shrink-0"
            title="Reset Filter"
          >
            <XCircle size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
