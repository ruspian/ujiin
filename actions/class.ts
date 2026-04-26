"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { classSchema, updateClassSchema } from "@/schemas/classSchema";

export async function createClass(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const classValidation = classSchema.safeParse(rawData);

  try {
    if (!classValidation.success) {
      return {
        success: false,
        message: classValidation.error.issues[0].message,
      };
    }

    const { name, level } = classValidation.data;

    // Pastikan tidak ada kelas dengan nama yang persis sama
    const existingClass = await prisma.class.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existingClass) {
      return { success: false, message: "Nama kelas sudah ada!" };
    }

    const createdClass = {
      name,
      level: Number(level),
    };

    await prisma.class.create({
      data: createdClass,
    });

    revalidatePath("/admin/master/kelas");
    return { success: true, message: "Data kelas berhasil ditambahkan!" };
  } catch (error) {
    console.error("CREATE_CLASS_ERROR:", error);

    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}

export async function updateClass(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const classValidation = updateClassSchema.safeParse(rawData);

  if (!classValidation.success) {
    return {
      success: false,
      message: classValidation.error.issues[0].message,
    };
  }

  const { id, name, level } = classValidation.data;

  try {
    const existingClass = await prisma.class.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existingClass && existingClass.id !== id) {
      return { success: false, message: "Nama kelas sudah dipakai!" };
    }

    const updatedClass = {
      name,
      level: Number(level),
    };

    await prisma.class.update({
      where: { id },
      data: updatedClass,
    });

    revalidatePath("/admin/master/kelas");
    return { success: true, message: "Data kelas berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_CLASS_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}

export async function deleteClass(id: string) {
  if (!id) return { success: false, message: "ID kelas tidak valid!" };

  try {
    // Jangan hapus kelas kalau masih ada siswanya
    const studentsInClass = await prisma.student.count({
      where: { classId: id },
    });

    if (studentsInClass > 0) {
      return {
        success: false,
        message: `Gagal! Masih ada ${studentsInClass} siswa di kelas ini.`,
      };
    }

    await prisma.class.delete({ where: { id } });

    revalidatePath("/admin/master/kelas");
    return { success: true, message: "Kelas berhasil dihapus!" };
  } catch (error) {
    console.error("DELETE_CLASS_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat menghapus kelas!",
    };
  }
}
