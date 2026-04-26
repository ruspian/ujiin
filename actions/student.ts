"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { classSchema, updateClassSchema } from "@/schemas/studentSchema";

export async function createStudent(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const studentValidation = classSchema.safeParse(rawData);

  if (!studentValidation.success) {
    return {
      success: false,
      message: studentValidation.error.issues[0].message,
    };
  }

  const { nisn, name, classId } = studentValidation.data;

  try {
    const existingStudent = await prisma.student.findUnique({
      where: { nisn },
    });

    if (existingStudent) {
      return { success: false, message: "NISN sudah terdaftar!" };
    }

    await prisma.student.create({
      data: { nisn, name, classId },
    });

    revalidatePath("/admin/master/siswa");
    revalidatePath("/admin/master/kelas");

    return { success: true, message: "Data siswa berhasil ditambahkan!" };
  } catch (error) {
    console.error("CREATE_STUDENT_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}

export async function updateStudent(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const studentValidation = updateClassSchema.safeParse(rawData);
  if (!studentValidation.success) {
    return {
      success: false,
      message: studentValidation.error.issues[0].message,
    };
  }

  const { id, nisn, name, classId } = studentValidation.data;

  try {
    const existingStudent = await prisma.student.findUnique({
      where: { nisn },
    });

    if (existingStudent && existingStudent.id !== id) {
      return {
        success: false,
        message: "Siswa dengan NISN tersebut sudah ada!",
      };
    }

    await prisma.student.update({
      where: { id },
      data: { nisn, name, classId },
    });

    revalidatePath("/admin/master/siswa");
    revalidatePath("/admin/master/kelas");
    return { success: true, message: "Data siswa berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_STUDENT_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}

export async function deleteStudent(id: string) {
  if (!id) return { success: false, message: "ID siswa tidak valid!" };

  try {
    // Cek apakah siswa udah pernah ngerjain ujian
    const attemptsCount = await prisma.attempt.count({
      where: { studentId: id },
    });

    if (attemptsCount > 0) {
      return {
        success: false,
        message: "Gagal! Siswa ini sudah memiliki riwayat ujian.",
      };
    }

    await prisma.student.delete({ where: { id } });

    revalidatePath("/admin/master/siswa");
    revalidatePath("/admin/master/kelas");
    return { success: true, message: "Data siswa berhasil dihapus!" };
  } catch (error) {
    console.error("DELETE_STUDENT_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat menghapus siswa!",
    };
  }
}
