"use client";

import { createExam } from "@/actions/exam";
import { X, CalendarClock, Info, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { AddJadwalModalProps } from "@/types/exam";

export default function AddJadwalModal({
  setIsModalOpen,
  subjects,
  examTypes,
  classes,
  academicYears,
}: AddJadwalModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  let calculatedDuration: number | "" = "";
  if (startDate && startTime && endDate && endTime) {
    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(`${endDate}T${endTime}:00`);
    const diffMs = end.getTime() - start.getTime();

    if (diffMs > 0) {
      calculatedDuration = Math.floor(diffMs / 60000);
    }
  }

  const handleToggleClass = (id: string) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedClasses.length === 0)
      return toast.error("Pilih minimal satu kelas!");
    if (!calculatedDuration || calculatedDuration <= 0)
      return toast.error(
        "Cek kembali pengaturan waktu. Jam selesai harus lebih dari jam mulai!",
      );

    const formData = new FormData(e.currentTarget);

    const finalStartDateTime = `${startDate}T${startTime}:00+08:00`;
    const finalEndDateTime = `${endDate}T${endTime}:00+08:00`;

    const payload = {
      title: formData.get("title") as string,
      subjectId: formData.get("subjectId") as string,
      examTypeId: formData.get("examTypeId") as string,
      academicYearId: formData.get("academicYearId") as string,
      startTime: finalStartDateTime,
      endTime: finalEndDateTime,
      duration: calculatedDuration,
      randomizeQuestions: formData.get("randomizeQuestions") === "true",
      showResult: formData.get("showResult") === "true",
      status: formData.get("status") as "DRAFT" | "PUBLISHED" | "COMPLETED",
      classes: selectedClasses,
    };

    try {
      setIsSubmitting(true);
      const result = await createExam(payload);
      if (!result.success) throw new Error(result.message);
      toast.success(result.message);
      setIsModalOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan!",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 mt-auto mb-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-600">
              <CalendarClock size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Buat Jadwal Ujian
            </h2>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 border-b pb-2">
                  <Info size={16} className="text-teal-600" /> Informasi Utama
                </h3>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Nama Ujian
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="PAS Matematika Kelas 10"
                    className="block w-full rounded-lg border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Mata Pelajaran
                    </label>
                    <select
                      name="subjectId"
                      required
                      defaultValue=""
                      className="block w-full rounded-lg border-gray-300 px-3 py-2 text-sm text-gray-900 invalid:text-gray-400 focus:border-teal-500 focus:ring-teal-500"
                    >
                      <option value="" disabled hidden>
                        Pilih...
                      </option>
                      {subjects.map((s) => (
                        <option
                          key={s.id}
                          value={s.id}
                          className="text-gray-900"
                        >
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Jenis Ujian
                    </label>
                    <select
                      name="examTypeId"
                      required
                      defaultValue=""
                      className="block w-full rounded-lg border-gray-300 px-3 py-2 text-sm text-gray-900 invalid:text-gray-400 focus:border-teal-500 focus:ring-teal-500"
                    >
                      <option value="" disabled hidden>
                        Pilih...
                      </option>
                      {examTypes.map((e) => (
                        <option
                          key={e.id}
                          value={e.id}
                          className="text-gray-900"
                        >
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Tahun Ajaran
                  </label>
                  <select
                    name="academicYearId"
                    required
                    defaultValue=""
                    className="block w-full rounded-lg border-gray-300 px-3 py-2 text-sm text-gray-900 invalid:text-gray-400 focus:border-teal-500 focus:ring-teal-500"
                  >
                    <option value="" disabled hidden>
                      Pilih...
                    </option>
                    {academicYears.map((a) => (
                      <option key={a.id} value={a.id} className="text-gray-900">
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 border-b border-orange-100 pb-2">
                  <Clock size={16} className="text-orange-500" /> Pengaturan
                  Waktu (WITA)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="block w-full rounded-lg border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Jam Mulai
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="block w-full rounded-lg border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Tanggal Ditutup
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="block w-full rounded-lg border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Jam Ditutup
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="block w-full rounded-lg border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Durasi Pengerjaan
                  </label>
                  <input
                    type="number"
                    value={calculatedDuration}
                    readOnly
                    required
                    placeholder="Terisi otomatis..."
                    className="block w-full rounded-lg border-gray-300 bg-gray-100 text-gray-500 px-3 py-2 text-sm font-semibold cursor-not-allowed focus:ring-0 focus:border-gray-300"
                  />
                  {calculatedDuration === "" && startDate && endDate && (
                    <p className="mt-1 text-xs text-red-500">
                      Waktu selesai harus lebih besar dari waktu mulai!
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex h-full flex-col rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 border-b border-indigo-100 pb-2 mb-3">
                  <Users size={16} className="text-indigo-500" /> Peserta Ujian
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Pilih kelas yang berhak mengikuti ujian ini.
                </p>

                <div className="flex-1 overflow-y-auto max-h-62.5 rounded-lg border border-white bg-white/50 p-2 shadow-inner">
                  <div className="grid grid-cols-2 gap-2">
                    {classes.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-2 rounded-md transition-colors border border-transparent hover:border-indigo-100"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(c.id)}
                          onChange={() => handleToggleClass(c.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        <span className="font-medium text-gray-700">
                          {c.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-3 border-t border-indigo-100 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">
                      Acak Urutan Soal?
                    </label>
                    <select
                      name="randomizeQuestions"
                      className="rounded-lg border-gray-300 text-xs py-1.5 pl-2 pr-8 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="true">Ya</option>
                      <option value="false">Tidak</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">
                      Tampilkan Nilai ke Siswa?
                    </label>
                    <select
                      name="showResult"
                      className="rounded-lg border-gray-300 text-xs py-1.5 pl-2 pr-8 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="true">Ya</option>
                      <option value="false">Tidak</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">
                      Status Ujian
                    </label>
                    <select
                      name="status"
                      className="rounded-lg border-gray-300 font-semibold text-xs py-1.5 pl-2 pr-8 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t pt-5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Jadwal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
