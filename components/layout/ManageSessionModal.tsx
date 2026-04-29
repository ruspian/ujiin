// src/components/layout/master/ManageSessionModal.tsx
"use client";

import { randomizeSessions, resetSessions } from "@/actions/student";
import { X, Dices, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import { ManageSessionModalProps } from "@/types/student";

export default function ManageSessionModal({
  classes,
  setIsModalSessionOpen,
  isSubmitting,
  setIsSubmitting,
}: ManageSessionModalProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleRandomize = async () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);

    // Validasi manual dikit sebelum lempar ke server
    if (!formData.get("classId")) return toast.error("Pilih kelas dulu!");
    if (!formData.get("totalSessions")) return toast.error("Isi jumlah sesi!");

    try {
      setIsSubmitting(true);
      const result = await randomizeSessions(formData);
      if (!result.success) throw new Error(result.message);
      toast.success(result.message);
      setIsModalSessionOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan!",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);

    if (!formData.get("classId"))
      return toast.error("Pilih kelas yang mau direset!");

    try {
      setIsSubmitting(true);
      const result = await resetSessions(formData);
      if (!result.success) throw new Error(result.message);
      toast.success(result.message);
      setIsModalSessionOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan!",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Dices size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Atur Sesi & Ruangan
            </h2>
          </div>
          <button
            onClick={() => setIsModalSessionOpen(false)}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form
          ref={formRef}
          className="space-y-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 mb-4">
            <p className="text-xs text-blue-800 leading-relaxed">
              Pilih kelas untuk mengacak siswa ke dalam beberapa sesi ujian
              secara merata. Jika ujian menggunakan HP tanpa sesi, gunakan
              tombol Reset.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Pilih Kelas Target
            </label>
            <select
              name="classId"
              required
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Pilih Kelas</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Jumlah Sesi
              </label>
              <input
                type="number"
                name="totalSessions"
                min="1"
                max="5"
                placeholder="Contoh: 2"
                className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Ruangan (Opsional)
              </label>
              <input
                type="text"
                name="room"
                placeholder="Lab Komputer 1"
                className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              type="button"
              onClick={handleRandomize}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              <Dices size={18} />
              {isSubmitting ? "Memproses..." : "Acak & Bagi Sesi"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
            >
              <RotateCcw size={18} />
              Reset Sesi Kelas Ini
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
