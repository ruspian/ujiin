"use client";

import { useState } from "react";
import {
  BookOpen,
  FileQuestion,
  X,
  ChevronRight,
  Layers,
  Tag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SubjectCardProps } from "@/types/subject";

export default function SubjectCard({
  subjectId,
  subjectName,
  questionCount,
  examTypes,
  classes,
}: SubjectCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const router = useRouter();

  const handleNextStep = (classId: string) => {
    setSelectedClassId(classId);
  };

  const handleSelectExamType = (examTypeId: string) => {
    router.push(
      `/guru/soal/${subjectId}?classId=${selectedClassId}&type=${examTypeId}`,
    );
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setSelectedClassId(null);
  };

  return (
    <>
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 flex flex-col h-full group">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {subjectName}
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Mata Pelajaran
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-600">
            <FileQuestion size={16} className="text-orange-500" />
            {questionCount} Soal
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-sm font-bold rounded-lg transition-colors flex items-center gap-1"
          >
            Kelola <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-linear-to-r from-blue-50 to-white">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                {selectedClassId === null ? (
                  <>
                    <Layers size={18} className="text-blue-600" /> Pilih Kelas
                  </>
                ) : (
                  <>
                    <Tag size={18} className="text-blue-600" /> Pilih Kategori
                    Ujian
                  </>
                )}
              </h3>
              <button
                onClick={resetModal}
                className="text-gray-400 hover:text-red-500 bg-white rounded-full p-1.5 hover:bg-red-50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {selectedClassId === null ? (
                <>
                  <p className="text-sm text-gray-500 mb-5 text-center">
                    Anda akan mengelola soal{" "}
                    <strong className="text-gray-800">{subjectName}</strong>.
                    Pilih kelas yang dituju:
                  </p>

                  <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2">
                    {classes.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => handleNextStep(cls.id)}
                        className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                      >
                        <div className="text-left">
                          <span className="block font-bold text-gray-700 group-hover:text-blue-700">
                            {cls.name}
                          </span>
                        </div>
                        <ChevronRight
                          size={18}
                          className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-transform"
                        />
                      </button>
                    ))}

                    {classes.length === 0 && (
                      <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100">
                        <p className="text-red-600 text-sm font-semibold">
                          Belum ada kelas yang terhubung.
                        </p>
                        <p className="text-xs text-red-500 mt-1">
                          Silakan hubungi Admin untuk menghubungkan mapel ini
                          dengan kelas.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-5 text-center">
                    Pilih kategori ujian untuk soal{" "}
                    <strong className="text-gray-800">{subjectName}</strong>:
                  </p>
                  <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2">
                    {examTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => handleSelectExamType(type.id)}
                        className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                      >
                        <div className="text-left">
                          <span className="block font-bold text-gray-700 group-hover:text-blue-700">
                            {type.name}
                          </span>
                          <span className="text-xs text-gray-400 font-mono mt-0.5 block">
                            {type.code}
                          </span>
                        </div>
                        <ChevronRight
                          size={18}
                          className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-transform"
                        />
                      </button>
                    ))}

                    {examTypes.length === 0 && (
                      <p className="text-center text-red-500 text-sm p-4">
                        Belum ada kategori ujian di sistem.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedClassId(null)}
                    className="mt-4 text-sm font-semibold text-gray-500 hover:text-blue-600 flex items-center justify-center w-full"
                  >
                    &larr; Kembali ke Pilihan Kelas
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
