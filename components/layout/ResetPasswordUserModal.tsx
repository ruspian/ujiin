"use client";

import { resetPassword } from "@/actions/user";
import { ResetPasswordModalProps } from "@/types/user.admin";
import { X, Key } from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordUserModal({
  user,
  setIsModalResetOpen,
  isSubmitting,
  setIsSubmitting,
}: ResetPasswordModalProps) {
  const handleReset = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await resetPassword(formData);

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success(result.message);
      setIsModalResetOpen(false);
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
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Key size={20} className="text-amber-500" />
            Reset Password
          </h2>
          <button
            onClick={() => setIsModalResetOpen(false)}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
          Atur ulang password untuk akun:{" "}
          <span className="font-bold text-gray-900">{user.name}</span>
        </div>

        <form action={handleReset} className="space-y-4">
          <input type="hidden" name="id" value={user.id} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password Baru <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="newPassword"
              required
              minLength={6}
              className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500"
              placeholder="Minimal 6 karakter..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalResetOpen(false)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
