"use client";

import { useState } from "react";
import { prosesKenaikanKelas } from "@/actions/kenaikan-kelas";
import {
  ArrowRight,
  Users,
  GraduationCap,
  CheckSquare,
  Square,
  Loader2,
  AlertTriangle,
  Search,
  HelpCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { KenaikanKelasClientProps } from "@/types/kenaikan-kelas";

export default function KenaikanKelasClient({
  classes,
  allStudents,
}: KenaikanKelasClientProps) {
  const [classAsal, setClassAsal] = useState("");
  const [classTujuan, setClassTujuan] = useState("");
  const [actionType, setActionType] = useState<"NAIK_KELAS" | "LULUS">(
    "NAIK_KELAS",
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const availableStudents = allStudents.filter((s) => s.classId === classAsal);

  const filteredStudents = availableStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.includes(searchTerm),
  );

  const handleClassAsalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setClassAsal(e.target.value);
    setSelectedIds([]);
    setSearchTerm("");
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleSelectStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleOpenConfirmModal = () => {
    if (selectedIds.length === 0) {
      toast.error("Pilih minimal satu siswa untuk diproses!");
      return;
    }

    if (actionType === "NAIK_KELAS" && !classTujuan) {
      toast.error("Silakan tentukan kelas tujuan kenaikan!");
      return;
    }

    if (classAsal === classTujuan) {
      toast.error("Kelas asal dan kelas tujuan tidak boleh sama!");
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const executePromotionAction = async () => {
    try {
      setIsSubmitting(true);
      const result = await prosesKenaikanKelas(
        selectedIds,
        actionType,
        actionType === "NAIK_KELAS" ? classTujuan : undefined,
      );

      if (!result.success) throw new Error(result.message);

      toast.success(result.message);
      setSelectedIds([]);
      setClassAsal("");
      setClassTujuan("");
      setIsConfirmModalOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan!",
      );
      setIsConfirmModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetClassName = classes.find((c) => c.id === classTujuan)?.name;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5 h-fit">
          <h3 className="font-bold text-gray-900 text-md flex items-center gap-2">
            <ArrowRight size={18} className="text-teal-600" /> Langkah 1:
            Konfigurasi
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">
              Kelas Asal
            </label>
            <select
              value={classAsal}
              onChange={handleClassAsalChange}
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Pilih Kelas Asal</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase block">
              Aksi Transisi
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActionType("NAIK_KELAS")}
                className={`p-3 rounded-xl border font-semibold text-xs flex flex-col items-center gap-2 transition-all ${
                  actionType === "NAIK_KELAS"
                    ? "border-teal-500 bg-teal-50 text-teal-700 ring-2 ring-teal-500"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Users size={18} /> Naik Kelas
              </button>
              <button
                type="button"
                onClick={() => setActionType("LULUS")}
                className={`p-3 rounded-xl border font-semibold text-xs flex flex-col items-center gap-2 transition-all ${
                  actionType === "LULUS"
                    ? "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <GraduationCap size={18} /> Lulus
              </button>
            </div>
          </div>

          {actionType === "NAIK_KELAS" && (
            <div className="space-y-1 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-gray-500 uppercase">
                Kelas Tujuan
              </label>
              <select
                value={classTujuan}
                onChange={(e) => setClassTujuan(e.target.value)}
                className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Pilih Kelas Tujuan</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <hr className="border-gray-100" />

          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={handleOpenConfirmModal}
            className={`w-full rounded-xl py-3 text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${
              actionType === "NAIK_KELAS"
                ? "bg-teal-600 hover:bg-teal-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {actionType === "NAIK_KELAS"
              ? "Proses Kenaikan Kelas"
              : "Proses Kelulusan Siswa"}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              Langkah 2: Pilih Siswa ({selectedIds.length} Terpilih)
            </h3>

            <div className="relative w-full sm:max-w-xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Cari nama atau NISN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={availableStudents.length === 0}
                className="block w-full rounded-xl border-gray-200 bg-white py-1.5 pl-9 pr-3 text-xs placeholder-gray-400 focus:border-teal-500 focus:ring-teal-500 disabled:opacity-50"
              />
            </div>
          </div>

          {!classAsal ? (
            <div className="p-20 text-center flex flex-col items-center justify-center text-gray-400 gap-3">
              <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center">
                <AlertTriangle size={28} className="text-gray-300" />
              </div>
              <div>
                <p className="font-bold text-gray-700 text-sm">
                  Pilih Kelas Asal
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Silakan pilih kelas di panel kiri untuk menampilkan data
                  siswa.
                </p>
              </div>
            </div>
          ) : availableStudents.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center justify-center text-gray-400 gap-3">
              <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center">
                <Users size={28} className="text-gray-300" />
              </div>
              <div>
                <p className="font-bold text-gray-700 text-sm">Kelas Kosong</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tidak ada siswa aktif yang terdaftar di kelas ini.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-120 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-500 uppercase font-bold sticky top-0 z-10 shadow-[0_1px_0_0_#e5e7eb]">
                  <tr>
                    <th className="p-4 w-12 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-teal-600 hover:scale-105 transition-transform"
                      >
                        {selectedIds.length === filteredStudents.length &&
                        filteredStudents.length > 0 ? (
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </th>
                    <th className="p-4">NISN</th>
                    <th className="p-4">Nama Lengkap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((student) => {
                    const isChecked = selectedIds.includes(student.id);
                    return (
                      <tr
                        key={student.id}
                        onClick={() => handleSelectStudent(student.id)}
                        className={`cursor-pointer transition-colors ${isChecked ? "bg-teal-50/40 hover:bg-teal-50/70" : "hover:bg-gray-50"}`}
                      >
                        <td
                          className="p-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectStudent(student.id)}
                            className="text-teal-600"
                          >
                            {isChecked ? (
                              <CheckSquare size={18} />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>
                        <td className="p-4 font-mono font-medium text-gray-600">
                          {student.nisn}
                        </td>
                        <td className="p-4 font-bold text-gray-900">
                          {student.name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md animate-in zoom-in-95 duration-200 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
            <div className="mb-4 flex items-start justify-between">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full ${
                  actionType === "NAIK_KELAS"
                    ? "bg-teal-100 text-teal-600"
                    : "bg-rose-100 text-rose-600"
                }`}
              >
                <HelpCircle size={28} />
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="text-xl font-black text-gray-900 mb-2">
              Konfirmasi{" "}
              {actionType === "NAIK_KELAS" ? "Kenaikan Kelas" : "Kelulusan"}
            </h2>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Anda akan memproses{" "}
              <strong className="text-gray-900">
                {selectedIds.length} siswa
              </strong>{" "}
              {actionType === "NAIK_KELAS" ? (
                <>
                  untuk dinaikkan ke{" "}
                  <strong className="text-teal-600">
                    Kelas {targetClassName}
                  </strong>
                  .
                </>
              ) : (
                <>
                  menjadi{" "}
                  <strong className="text-rose-600">Alumni (Lulus)</strong>.
                </>
              )}{" "}
              Pastikan data sudah benar sebelum melanjutkan.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executePromotionAction}
                disabled={isSubmitting}
                className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50 ${
                  actionType === "NAIK_KELAS"
                    ? "bg-teal-600 hover:bg-teal-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Memproses...
                  </>
                ) : (
                  "Ya, Proses Sekarang"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
