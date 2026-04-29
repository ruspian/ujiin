"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  AcademicYearSchema,
  UpdateAcademicYearSchema,
} from "@/schemas/academicSchema";

export async function createAcademicYear(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const academicValidation = AcademicYearSchema.safeParse(rawData);

  if (!academicValidation.success) {
    return {
      success: false,
      message: academicValidation.error.issues[0].message,
    };
  }

  const { year, semester } = academicValidation.data;

  try {
    const existing = await prisma.academicYear.findFirst({
      where: { year, semester },
    });

    if (existing) {
      return {
        success: false,
        message: "Tahun Ajaran ini sudah ada di sistem!",
      };
    }

    await prisma.academicYear.create({
      data: { year, semester, active: false },
    });

    revalidatePath("/admin/master/tahun-ajaran");
    return { success: true, message: "Tahun Ajaran berhasil ditambahkan!" };
  } catch (error) {
    console.error("CREATE_ACADEMIC_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}

export async function updateAcademicYear(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const academicValidation = UpdateAcademicYearSchema.safeParse(rawData);

  if (!academicValidation.success) {
    return {
      success: false,
      message: academicValidation.error.issues[0].message,
    };
  }

  const { id, year, semester } = academicValidation.data;

  try {
    const existing = await prisma.academicYear.findFirst({
      where: { year, semester },
    });

    if (existing && existing.id !== id) {
      return { success: false, message: "Tahun Ajaran ini sudah ada!" };
    }

    await prisma.academicYear.update({
      where: { id },
      data: { year, semester },
    });

    revalidatePath("/admin/master/tahun-ajaran");
    return { success: true, message: "Tahun Ajaran berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_ACADEMIC_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}

export async function deleteAcademicYear(formData: FormData) {
  const id = formData.get("id") as string;

  if (!id) return { success: false, message: "ID tidak valid!" };

  try {
    const target = await prisma.academicYear.findUnique({ where: { id } });

    if (target?.active) {
      return {
        success: false,
        message: "Tidak bisa menghapus Tahun Ajaran yang sedang Aktif!",
      };
    }

    const linkedExams = await prisma.exam.count({
      where: { academicYearId: id },
    });
    if (linkedExams > 0) {
      return {
        success: false,
        message: `Gagal! Tahun ajaran ini dipakai di ${linkedExams} jadwal ujian.`,
      };
    }

    await prisma.academicYear.delete({ where: { id } });

    revalidatePath("/admin/master/tahun-ajaran");
    return { success: true, message: "Tahun Ajaran berhasil dihapus!" };
  } catch (error) {
    console.error("DELETE_ACADEMIC_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan saat menghapus!" };
  }
}

export async function setActiveAcademicYear(formData: FormData) {
  const id = formData.get("id") as string;

  if (!id) return { success: false, message: "ID tidak valid!" };

  try {
    await prisma.academicYear.updateMany({
      where: { active: true },
      data: { active: false },
    });

    await prisma.academicYear.update({
      where: { id },
      data: { active: true },
    });

    revalidatePath("/admin/master/tahun-ajaran");
    return { success: true, message: "Tahun Ajaran Aktif berhasil diubah!" };
  } catch (error) {
    console.error("SET_ACTIVE_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan sistem!" };
  }
}
