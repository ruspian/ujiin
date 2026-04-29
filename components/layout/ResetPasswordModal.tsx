"use client";

import { useState } from "react";
import { resetStudentPassword } from "@/actions/student";
import { Key, X, CheckCircle, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ResetPasswordModalProps {
  studentData: { id: string; name: string };
  setIsModalResetOpen: (val: boolean) => void;
}

export default function ResetPasswordModal({
  studentData,
  setIsModalResetOpen,
}: ResetPasswordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const handleReset = async () => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("id", studentData.id);

    try {
      const result = await resetStudentPassword(formData);
      if (result.success && result.newPassword) {
        setNewPassword(result.newPassword);
        toast.success("Password berhasil direset!");
      } else {
        throw new Error(result.message || "Gagal mereset password!");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan!",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      toast.success("Password berhasil disalin ke clipboard!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setIsModalResetOpen(false)}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {newPassword ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle size={32} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Reset Berhasil!
            </h2>
            <p className="mb-6 text-sm text-gray-500">
              Password baru untuk{" "}
              <span className="font-semibold text-gray-900">
                {studentData.name}
              </span>
              :
            </p>

            <div className="mb-6 flex items-center justify-between rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50 p-4">
              <span className="text-2xl font-black tracking-widest text-emerald-700">
                {newPassword}
              </span>
              <button
                onClick={copyToClipboard}
                className="rounded-lg bg-white p-2 text-emerald-600 shadow-sm transition-colors hover:bg-emerald-100"
                title="Salin Password"
              >
                <Copy size={20} />
              </button>
            </div>

            <button
              onClick={() => setIsModalResetOpen(false)}
              className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800"
            >
              Tutup & Selesai
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <AlertTriangle size={32} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Reset Password?
            </h2>
            <p className="mb-6 text-sm text-gray-500 leading-relaxed">
              Anda yakin ingin mereset password untuk{" "}
              <span className="font-semibold text-gray-900">
                {studentData.name}
              </span>
              ? <br />
              Password lama tidak akan bisa digunakan lagi.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsModalResetOpen(false)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleReset}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 disabled:opacity-50"
              >
                <Key size={18} />
                {isSubmitting ? "Mereset..." : "Reset"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
