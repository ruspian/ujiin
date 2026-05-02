"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExam, updateExam, getQuestionsForExam } from "@/actions/exam";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Users,
  FileText,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { JadwalFormProps, Question } from "@/types/exam";
import { formatDateToInput, formatTimeToInput } from "@/lib/formatDateTime";

export default function JadwalForm({
  subjects,
  classes,
  examTypes,
  academicYears,
  initialData, // Tangkap data lama (kalau ada)
}: JadwalFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);

  // 1. STATE DASAR: Otomatis keisi kalau initialData ada (Mode Edit)
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    subjectId: initialData?.subjectId || "",
    examTypeId: initialData?.examTypeId || "",
    academicYearId:
      initialData?.academicYearId ||
      academicYears.find((y) => y.active)?.id ||
      "",
    examDate: initialData?.startTime
      ? formatDateToInput(initialData.startTime)
      : "",
    startTime: initialData?.startTime
      ? formatTimeToInput(initialData.startTime)
      : "",
    endTime: initialData?.endTime ? formatTimeToInput(initialData.endTime) : "",
    duration: initialData?.duration || 0,
    randomizeQuestions: initialData?.randomizeQuestions ?? true,
    showResult: initialData?.showResult ?? false,
  });

  const [selectedClasses, setSelectedClasses] = useState<string[]>(
    initialData?.classes?.map((c) => c.id) || [],
  );
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(
    initialData?.questions?.map((q) => q.id) || [],
  );

  // Fungsi buat ngitung durasi otomatis
  const handleTimeChange = (field: "startTime" | "endTime", value: string) => {
    const newFormData = { ...formData, [field]: value };

    if (newFormData.startTime && newFormData.endTime) {
      const [startHour, startMinute] = newFormData.startTime
        .split(":")
        .map(Number);
      const [endHour, endMinute] = newFormData.endTime.split(":").map(Number);

      const startTotalMinutes = startHour * 60 + startMinute;
      let endTotalMinutes = endHour * 60 + endMinute;

      if (endTotalMinutes < startTotalMinutes) {
        endTotalMinutes += 24 * 60;
      }

      newFormData.duration = endTotalMinutes - startTotalMinutes;
    }

    setFormData(newFormData);
  };

  const nextStep = async () => {
    if (step === 1) {
      if (
        !formData.title ||
        !formData.subjectId ||
        !formData.examTypeId ||
        !formData.examDate ||
        !formData.startTime ||
        !formData.endTime
      ) {
        return toast.error("Harap isi semua kolom informasi dasar!");
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedClasses.length === 0) {
        return toast.error("Pilih minimal 1 kelas peserta!");
      }

      setIsLoading(true);
      const res = await getQuestionsForExam(
        formData.subjectId,
        formData.examTypeId,
      );
      if (res.success) {
        setAvailableQuestions(res.data);
      }
      setIsLoading(false);
      setStep(3);
    }
  };

  const prevStep = () => setStep(step - 1);

  const toggleClass = (id: string) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleQuestion = (id: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id],
    );
  };

  const handleSelectAllQuestions = () => {
    if (selectedQuestions.length === availableQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(availableQuestions.map((q) => q.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedQuestions.length === 0)
      return toast.error("Pilih minimal 1 soal untuk diujikan!");

    setIsLoading(true);

    const combinedStartTime = `${formData.examDate}T${formData.startTime}:00`;
    const combinedEndTime = `${formData.examDate}T${formData.endTime}:00`;

    const payload = {
      title: formData.title,
      subjectId: formData.subjectId,
      examTypeId: formData.examTypeId,
      academicYearId: formData.academicYearId,
      startTime: combinedStartTime,
      endTime: combinedEndTime,
      duration: formData.duration,
      randomizeQuestions: formData.randomizeQuestions,
      showResult: formData.showResult,
      status: (initialData?.status || "PUBLISHED") as
        | "DRAFT"
        | "PUBLISHED"
        | "COMPLETED",
      classes: selectedClasses,
      questions: selectedQuestions,
    };

    let res;
    // EDIT
    if (initialData?.id) {
      res = await updateExam({ ...payload, id: initialData.id });
    } else {
      // CREATE
      res = await createExam(payload);
    }

    if (res.success) {
      toast.success(res.message);
      router.push("/admin/jadwal");
      router.refresh();
    } else {
      toast.error(res.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        {[
          { num: 1, title: "Info Dasar", icon: Calendar },
          { num: 2, title: "Pilih Kelas", icon: Users },
          { num: 3, title: "Pilih Soal", icon: FileText },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div
              key={s.num}
              className={`flex-1 p-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${isActive ? "border-teal-500 text-teal-700 bg-white" : isDone ? "border-teal-200 text-teal-500" : "border-transparent text-gray-400"}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? "bg-teal-100" : isDone ? "bg-teal-500 text-white" : "bg-gray-200 text-gray-500"}`}
              >
                {isDone ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Icon size={16} className="nline-block" />
                )}
              </div>
              <span className="font-semibold text-sm hidden sm:block">
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      <div className="p-6">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg inline-block border border-teal-100">
                Judul Ujian <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Misal: Penilaian Tengah Semester Ganjil"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:bg-white focus:ring-teal-500 focus:border-teal-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg inline-block border border-blue-100">
                  Mata Pelajaran <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.subjectId}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:bg-white focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg inline-block border border-purple-100">
                  Kategori Ujian <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.examTypeId}
                  onChange={(e) =>
                    setFormData({ ...formData, examTypeId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:bg-white focus:ring-purple-500 focus:border-purple-500 transition-colors appearance-none"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {examTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-200 shadow-sm">
              <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                <Clock size={18} className="text-gray-500" /> Pengaturan Waktu
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Tanggal Pelaksanaan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.examDate}
                    onChange={(e) =>
                      setFormData({ ...formData, examDate: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:ring-teal-500 focus:border-teal-500 shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Jam Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      handleTimeChange("startTime", e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:ring-teal-500 focus:border-teal-500 shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Jam Selesai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      handleTimeChange("endTime", e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:ring-teal-500 focus:border-teal-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="w-1/3 min-w-37.5 space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                    Durasi Pengerjaan
                    {formData.startTime && formData.endTime && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">
                        Auto
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-center text-teal-700 focus:ring-teal-500 focus:border-teal-500 shadow-sm transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      Menit
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex flex-wrap gap-6 mt-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.randomizeQuestions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      randomizeQuestions: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-orange-600 bg-white border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-bold text-orange-800">
                  Acak Urutan Soal
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showResult}
                  onChange={(e) =>
                    setFormData({ ...formData, showResult: e.target.checked })
                  }
                  className="w-4 h-4 text-orange-600 bg-white border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-bold text-orange-800">
                  Tampilkan Nilai Selesai Ujian
                </span>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in slide-in-from-right-4 duration-200">
            <p className="text-sm font-medium text-gray-500 mb-4">
              Centang kelas mana saja yang akan mengikuti jadwal ujian ini.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-100 overflow-y-auto pr-2">
              {classes.map((cls) => (
                <label
                  key={cls.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedClasses.includes(cls.id) ? "border-teal-500 bg-teal-50 shadow-sm" : "border-gray-200 hover:border-teal-300 bg-gray-50/50"}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedClasses.includes(cls.id)}
                    onChange={() => toggleClass(cls.id)}
                  />
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${selectedClasses.includes(cls.id) ? "bg-teal-500 text-white" : "bg-white border border-gray-300"}`}
                  >
                    {selectedClasses.includes(cls.id) && (
                      <CheckCircle2 size={14} />
                    )}
                  </div>
                  <span className="font-bold text-gray-800">{cls.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in slide-in-from-right-4 duration-200">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="font-bold text-gray-900">Pilih Paket Soal</h3>
                <p className="text-sm text-gray-500">
                  Pilih soal yang akan ditampilkan ke siswa saat ujian.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-teal-700 bg-teal-100 px-3 py-1.5 rounded-full border border-teal-200 shadow-sm">
                  {selectedQuestions.length} Soal Terpilih
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-gray-400">
                <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="font-medium">Memproses data soal...</p>
              </div>
            ) : availableQuestions.length === 0 ? (
              <div className="py-16 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="font-bold text-gray-800 text-lg">
                  Bank Soal Kosong!
                </p>
                <p className="text-sm font-medium text-gray-500 mt-1 max-w-sm mx-auto">
                  Tidak ada soal yang ditemukan untuk Mata Pelajaran dan
                  Kategori Ujian ini.
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={handleSelectAllQuestions}
                  className="mb-4 text-sm font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-teal-100"
                >
                  <CheckCircle2 size={16} />{" "}
                  {selectedQuestions.length === availableQuestions.length
                    ? "Batalkan Semua Pilihan"
                    : "Pilih Semua Soal"}
                </button>
                <div className="space-y-3 max-h-100 overflow-y-auto pr-2">
                  {availableQuestions.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestion(q.id)}
                      className={`flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedQuestions.includes(q.id) ? "border-teal-500 bg-teal-50 shadow-sm" : "border-gray-200 hover:border-teal-300 bg-white"}`}
                    >
                      <div className="pt-1">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${selectedQuestions.includes(q.id) ? "bg-teal-500 text-white" : "bg-white border-2 border-gray-300"}`}
                        >
                          {selectedQuestions.includes(q.id) && (
                            <CheckCircle2 size={14} />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div
                          className="text-sm font-semibold text-gray-800 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: q.text }}
                        />
                        <div className="flex gap-3 mt-3 text-xs font-medium text-gray-500">
                          <span className="bg-white px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1">
                            🎯 Kelas: {q.class?.name || "-"}
                          </span>
                          <span className="bg-white px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1">
                            ✍️ Oleh: {q.author.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-2xl">
        {step > 1 ? (
          <button
            onClick={prevStep}
            disabled={isLoading}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
          >
            <ChevronLeft size={16} /> Kembali
          </button>
        ) : (
          <div></div>
        )}

        {step < 3 ? (
          <button
            onClick={nextStep}
            className="px-6 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
          >
            Selanjutnya <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={availableQuestions.length === 0 || isLoading}
            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-2 shadow-sm"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                Menyimpan...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} />{" "}
                {initialData?.id
                  ? "Update Jadwal Ujian"
                  : "Simpan Jadwal Ujian"}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
