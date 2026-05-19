"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Action untuk Simpan (Create/Update) Jadwal Ujian
 */
export async function simpanJadwalUjian(formData: FormData) {
  try {
    const id = formData.get("id") as string | null;
    const title = formData.get("title") as string;
    const startTime = new Date(formData.get("startTime") as string);
    const endTime = new Date(formData.get("endTime") as string);
    const duration = parseInt(formData.get("duration") as string);
    const supervisorId = formData.get("supervisorId") as string;
    const subjectId = formData.get("subjectId") as string;
    const examTypeId = formData.get("examTypeId") as string;
    const academicYearId = formData.get("academicYearId") as string;
    const authorId = formData.get("authorId") as string;

    const classIds = formData.getAll("classIds") as string[];

    const data = {
      title,
      startTime,
      endTime,
      duration,
      subjectId,
      examTypeId,
      academicYearId,
      authorId,
      supervisorId: supervisorId || null,
      // Relasi many-to-many ke Class
      classes: {
        set: classIds.map((id) => ({ id })),
      },
    };

    if (id) {
      // Logic UPDATE
      await prisma.exam.update({
        where: { id },
        data,
      });
    } else {
      // Logic CREATE
      await prisma.exam.create({
        data,
      });
    }

    revalidatePath("/admin/jadwal");
    return { success: true, message: "Jadwal berhasil disimpan!" };
  } catch (error) {
    console.error("Gagal simpan jadwal:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server saat menyimpan jadwal.",
    };
  }
}

export async function hapusJadwalUjian(id: string) {
  try {
    await prisma.exam.delete({
      where: { id },
    });
    revalidatePath("/admin/jadwal");
    return { success: true };
  } catch (error) {
    console.error("Gagal hapus jadwal:", error);
    return { success: false };
  }
}
