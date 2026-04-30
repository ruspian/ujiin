"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { examTypeSchema } from "@/schemas/examTypeSchema";

export async function createExamType(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return { success: false, message: "Akses ditolak!" };

  const validation = examTypeSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!validation.success)
    return { success: false, message: validation.error.issues[0].message };

  const { name, code } = validation.data;
  const uppercaseCode = code.toUpperCase();
  try {
    const existingCode = await prisma.examType.findUnique({
      where: { code: uppercaseCode },
    });

    if (existingCode)
      return { success: false, message: "Kode ujian ini sudah terdaftar!" };

    await prisma.examType.create({ data: { name, code: uppercaseCode } });

    revalidatePath("/admin/master/jenis-ujian");

    return { success: true, message: "Jenis Ujian berhasil ditambahkan!" };
  } catch (error) {
    console.error("CREATE_EXAM_TYPE_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan server!" };
  }
}

export async function updateExamType(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return { success: false, message: "Akses ditolak!" };

  const id = formData.get("id")?.toString();
  if (!id) return { success: false, message: "ID tidak valid!" };

  const validation = examTypeSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!validation.success)
    return { success: false, message: validation.error.issues[0].message };

  const { name, code } = validation.data;
  const uppercaseCode = code.toUpperCase();

  try {
    const existingCode = await prisma.examType.findFirst({
      where: { code: uppercaseCode },
    });
    if (existingCode && existingCode.id !== id)
      return { success: false, message: "Kode ujian ini sudah dipakai!" };

    await prisma.examType.update({
      where: { id },
      data: { name, code: uppercaseCode },
    });

    revalidatePath("/admin/master/jenis-ujian");
    return { success: true, message: "Jenis Ujian berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_EXAM_TYPE_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan server!" };
  }
}

export async function deleteExamType(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return { success: false, message: "Akses ditolak!" };

  const id = formData.get("id")?.toString();
  if (!id) return { success: false, message: "ID tidak valid!" };

  try {
    const linkedExams = await prisma.exam.count({ where: { examTypeId: id } });
    if (linkedExams > 0) {
      return {
        success: false,
        message: `Gagal! Jenis ujian ini sedang dipakai di ${linkedExams} jadwal ujian.`,
      };
    }

    await prisma.examType.delete({ where: { id } });

    revalidatePath("/admin/master/jenis-ujian");
    return { success: true, message: "Jenis Ujian berhasil dihapus!" };
  } catch (error) {
    console.error("DELETE_EXAM_TYPE_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan saat menghapus!" };
  }
}
