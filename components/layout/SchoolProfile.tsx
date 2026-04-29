"use client";

import { updateSchoolProfile } from "@/actions/school";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useState } from "react";

type SchoolProfileProps = {
  id: string;
  name: string | null;
  npsn?: string | null;
  address?: string | null;
  phone?: string | null;
};

export default function SchoolProfileForm({
  initialData,
}: {
  initialData: SchoolProfileProps | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function clientAction(formData: FormData) {
    setIsSubmitting(true);
    try {
      const result = await updateSchoolProfile(formData);

      if (result.success) {
        toast.success(result.message);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan!",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={clientAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wider">
            Informasi Lembaga
          </h3>
          <div>
            <label className="text-sm font-medium text-gray-700">
              Nama Sekolah
            </label>
            <input
              name="name"
              defaultValue={initialData?.name || ""}
              className="mt-1 block w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:ring-teal-500"
              placeholder="SMK Negeri 1 Gorontalo"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">NPSN</label>
            <input
              name="npsn"
              defaultValue={initialData?.npsn || ""}
              className="mt-1 block w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:ring-teal-500"
              placeholder="10293847"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">
              Alamat Sekolah
            </label>
            <textarea
              name="address"
              defaultValue={initialData?.address || ""}
              rows={3}
              className="mt-1 block w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:ring-teal-500"
              placeholder="Jl. Pendidikan No. 1..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Nomor Telepon
            </label>
            <input
              name="phone"
              defaultValue={initialData?.phone || ""}
              className="mt-1 block w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:ring-teal-500"
              placeholder="628123456789"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <Save size={18} />
          {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}
