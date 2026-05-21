"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subjectSchema, updateSubjectSchema } from "@/schemas/subjectSchema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSubject(formData: FormData) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const rawData = {
    name: formData.get("name"),
    religionId: formData.get("religionId"),
    teacherIds: formData.getAll("teacherIds"),
    classIds: formData.getAll("classIds"),
  };

  const subjectValidation = subjectSchema.safeParse(rawData);
  if (!subjectValidation.success) {
    return {
      success: false,
      message: subjectValidation.error.issues[0].message,
    };
  }

  const { name, religionId, teacherIds, classIds } = subjectValidation.data;

  try {
    const existingSubject = await prisma.subject.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });

    if (existingSubject) {
      await prisma.subject.update({
        where: { id: existingSubject.id },
        data: {
          religionId: religionId || existingSubject.religionId,
          teachers: {
            connect: teacherIds.map((id) => ({ id })),
          },
          classes: {
            connect: classIds.map((id) => ({ id })),
          },
        },
      });

      revalidatePath("/admin/master/mapel");
      return {
        success: true,
        message:
          "Mata pelajaran diperbarui, guru/kelas baru berhasil ditambahkan!",
      };
    }

    await prisma.subject.create({
      data: {
        name: name.trim(),
        religionId,
        teachers: {
          connect: teacherIds.map((id) => ({ id })),
        },
        classes: {
          connect: classIds.map((id) => ({ id })),
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
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const rawData = {
    id: formData.get("id"),
    name: formData.get("name"),
    religionId: formData.get("religionId"),
    teacherIds: formData.getAll("teacherIds"),
    classIds: formData.getAll("classIds"),
  };

  const subjectValidation = updateSubjectSchema.safeParse(rawData);
  if (!subjectValidation.success) {
    return {
      success: false,
      message: subjectValidation.error.issues[0].message,
    };
  }

  const { id, name, religionId, teacherIds, classIds } = subjectValidation.data;

  try {
    const existingSubject = await prisma.subject.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });

    if (existingSubject && existingSubject.id !== id) {
      return { success: false, message: "Mata pelajaran sudah dipakai!" };
    }

    const currentSubject = await prisma.subject.findUnique({
      where: { id },
      include: { teachers: true, classes: true },
    });

    if (!currentSubject) {
      return { success: false, message: "Mata pelajaran tidak ditemukan!" };
    }

    const oldTeacherIds = currentSubject.teachers.map((t) => t.id);
    const oldClassIds = currentSubject.classes.map((c) => c.id);

    const mergedTeacherIds = Array.from(
      new Set([...oldTeacherIds, ...teacherIds]),
    );
    const mergedClassIds = Array.from(new Set([...oldClassIds, ...classIds]));

    await prisma.subject.update({
      where: { id },
      data: {
        name: name.trim(),
        religionId,
        teachers: {
          set: mergedTeacherIds.map((id) => ({ id })),
        },
        // hapus relasi lama dan ganti dengan yang baru
        classes: {
          set: mergedClassIds.map((id) => ({ id })),
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
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }
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
