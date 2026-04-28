"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createSubject(formData: FormData) {
  const name = formData.get("name") as string;
  const teacherIds = formData.getAll("teacherIds") as string[];

  if (!name || name.trim() === "") {
    return { success: false, message: "Nama mata pelajaran wajib diisi!" };
  }

  try {
    const existingSubject = await prisma.subject.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });

    if (existingSubject) {
      return { success: false, message: "Mata pelajaran sudah ada!" };
    }

    await prisma.subject.create({
      data: {
        name: name.trim(),
        // hubungkan dengan guru
        teachers: {
          connect: teacherIds.map((id) => ({ id })),
        },
      },
    });

    revalidatePath("/admin/master/mapel");
    return { success: true, message: "Mata pelajaran berhasil ditambahkan!" };
  } catch (error) {
    console.error("CREATE_SUBJECT_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}

export async function updateSubject(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const teacherIds = formData.getAll("teacherIds") as string[];

  if (!id || !name || name.trim() === "") {
    return { success: false, message: "Nama mata pelajaran wajib diisi!" };
  }

  try {
    const existingSubject = await prisma.subject.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });

    if (existingSubject && existingSubject.id !== id) {
      return { success: false, message: "Mata pelajaran sudah dipakai!" };
    }

    await prisma.subject.update({
      where: { id },
      data: {
        name: name.trim(),
        // hapus relasi lama dan ganti dengan yang baru
        teachers: {
          set: teacherIds.map((id) => ({ id })),
        },
      },
    });

    revalidatePath("/admin/master/mapel");
    return { success: true, message: "Mata pelajaran berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_SUBJECT_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}

export async function deleteSubject(formData: FormData) {
  const id = formData.get("id") as string;

  if (!id) return { success: false, message: "ID mapel tidak valid!" };

  try {
    const [linkedQuestions, linkedExams] = await Promise.all([
      prisma.question.count({ where: { subjectId: id } }),
      prisma.exam.count({ where: { subjectId: id } }),
    ]);

    if (linkedQuestions > 0 || linkedExams > 0) {
      return {
        success: false,
        message: `Gagal! Mapel ini sedang digunakan pada ${linkedQuestions} soal dan ${linkedExams} jadwal ujian.`,
      };
    }

    await prisma.subject.delete({ where: { id } });

    revalidatePath("/admin/master/mapel");
    return { success: true, message: "Mata pelajaran berhasil dihapus!" };
  } catch (error) {
    console.error("DELETE_SUBJECT_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat menghapus mapel!",
    };
  }
}
