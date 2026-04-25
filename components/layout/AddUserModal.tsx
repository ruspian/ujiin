import { createUser } from "@/actions/user";
import { AddUserModalProps } from "@/types/user.admin";
import { X } from "lucide-react";
import { toast } from "sonner";

const AddUserModal = ({
  setIsModalOpen,
  setIsSubmitting,
  isSubmitting,
}: AddUserModalProps) => {
  const handleAddUser = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await createUser(formData);

      if (!result.success) {
        throw new Error(result.message);
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Tambah Pengguna</h2>
          <button
            onClick={() => setIsModalOpen(false)}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form action={handleAddUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              name="name"
              required
              className="block w-full rounded-xl border-gray-300 py-2.5 px-3 text-gray-900 bg-gray-50 border ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-teal-600 focus:bg-white sm:text-sm transition-colors"
              placeholder="Contoh: Budi Santoso, S.Pd"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              required
              className="block w-full rounded-xl border-gray-300 py-2.5 px-3 text-gray-900 bg-gray-50 border ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-teal-600 focus:bg-white sm:text-sm transition-colors"
              placeholder="Contoh: 19880101"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Peran Akses
            </label>
            <select
              name="role"
              required
              className="block w-full rounded-xl border-gray-300 py-2.5 px-3 text-gray-900 bg-gray-50 border ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-teal-600 focus:bg-white sm:text-sm transition-colors"
            >
              <option value="GURU">Guru</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              className="block w-full rounded-xl border-gray-300 py-2.5 px-3 text-gray-900 bg-gray-50 border ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-teal-600 focus:bg-white sm:text-sm transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
