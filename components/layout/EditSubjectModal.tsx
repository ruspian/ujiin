"use client";

import { useState } from "react";
import { updateSubject } from "@/actions/subject";
import { EditSubjectModalProps } from "@/types/data.master";
import { X, Users, School, BookHeart, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ExtendProps extends Omit<EditSubjectModalProps, "subjectData"> {
  subjectData: EditSubjectModalProps["subjectData"] & {
    religion?: { id: string; name: string } | null;
    assignments?: { classId: string; teacherId: string }[];
  };
  religions: { id: string; name: string }[];
}

interface AssignmentItem {
  id: string;
  classId: string;
  teacherId: string;
}

export default function EditSubjectModal({
  subjectData,
  teachers,
  classes,
  setIsModalEditOpen,
  religions,
  isSubmitting,
  setIsSubmitting,
}: ExtendProps) {
  const [assignments, setAssignments] = useState<AssignmentItem[]>(() => {
    if (subjectData.assignments && subjectData.assignments.length > 0) {
      return subjectData.assignments.map(
        (a: { classId: string; teacherId: string }, index: number) => ({
          id: `initial-${index}`,
          classId: a.classId,
          teacherId: a.teacherId,
        }),
      );
    }
    return [{ id: "initial-0", classId: "", teacherId: "" }];
  });

  const handleAddAssignment = () => {
    setAssignments([
      ...assignments,
      { id: `new-${Date.now()}`, classId: "", teacherId: "" },
    ]);
  };

  const handleRemoveAssignment = (idToRemove: string) => {
    if (assignments.length > 1) {
      setAssignments(
        assignments.filter((a: AssignmentItem) => a.id !== idToRemove),
      );
    } else {
      toast.error("Minimal harus ada satu pengampu mata pelajaran!");
    }
  };

  const handleChangeAssignment = (
    id: string,
    field: "classId" | "teacherId",
    value: string,
  ) => {
    setAssignments(
      assignments.map((a: AssignmentItem) =>
        a.id === id ? { ...a, [field]: value } : a,
      ),
    );
  };

  const handleEditSubject = async (formData: FormData) => {
    try {
      setIsSubmitting(true);

      const hasEmpty = assignments.some(
        (a: AssignmentItem) => !a.classId || !a.teacherId,
      );
      if (hasEmpty) {
        throw new Error(
          "Pilih kelas dan guru untuk semua baris yang ditambahkan!",
        );
      }

      const classIds = assignments.map((a: AssignmentItem) => a.classId);
      const uniqueClassIds = new Set(classIds);
      if (classIds.length !== uniqueClassIds.size) {
        throw new Error(
          "Satu kelas hanya boleh memiliki satu guru untuk mapel ini. Ada kelas yang duplikat!",
        );
      }

      const cleanAssignments = assignments.map(({ classId, teacherId }) => ({
        classId,
        teacherId,
      }));
      formData.set("assignments", JSON.stringify(cleanAssignments));

      const result = await updateSubject(formData);

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success(result.message);
      setIsModalEditOpen(false);
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
      <div className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Edit Mata Pelajaran
          </h2>
          <button
            onClick={() => setIsModalEditOpen(false)}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form action={handleEditSubject} className="space-y-6">
          <input type="hidden" name="id" value={subjectData.id} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Nama Mapel <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                defaultValue={subjectData.name}
                className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <BookHeart size={16} className="text-orange-500" />
                Kategori Agama{" "}
                <span className="text-xs text-gray-400 font-normal">
                  (Opsional)
                </span>
              </label>
              <select
                name="religionId"
                defaultValue={subjectData.religion?.id || ""}
                className="block w-full rounded-xl border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500 appearance-none"
              >
                <option value="">Umum</option>
                {religions && religions.length > 0 ? (
                  religions.map((religion) => (
                    <option key={religion.id} value={religion.id}>
                      {religion.name}
                    </option>
                  ))
                ) : (
                  <option disabled>Data agama kosong</option>
                )}
              </select>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-900">
                Plot Guru & Kelas
              </label>
              <button
                type="button"
                onClick={handleAddAssignment}
                className="flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
              >
                <Plus size={14} /> Tambah Baris
              </button>
            </div>

            <div className="max-h-55 space-y-3 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
              {assignments.map((assignment: AssignmentItem) => (
                <div
                  key={assignment.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:gap-3 sm:p-2"
                >
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                      <School size={14} className="text-indigo-500" />
                    </div>
                    <select
                      required
                      value={assignment.classId}
                      onChange={(e) =>
                        handleChangeAssignment(
                          assignment.id,
                          "classId",
                          e.target.value,
                        )
                      }
                      className="block w-full appearance-none rounded-lg border-gray-200 bg-gray-50 py-2 pl-8 pr-8 text-xs text-gray-700 transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="" disabled>
                        Pilih Kelas...
                      </option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                      <Users size={14} className="text-teal-500" />
                    </div>
                    <select
                      required
                      value={assignment.teacherId}
                      onChange={(e) =>
                        handleChangeAssignment(
                          assignment.id,
                          "teacherId",
                          e.target.value,
                        )
                      }
                      className="block w-full appearance-none rounded-lg border-gray-200 bg-gray-50 py-2 pl-8 pr-8 text-xs text-gray-700 transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="" disabled>
                        Pilih Guru...
                      </option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveAssignment(assignment.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 transition-colors hover:bg-red-100 sm:shrink-0"
                    title="Hapus baris"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalEditOpen(false)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
