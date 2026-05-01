"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { ExamSchema, examSchema } from "@/schemas/examSchema";

export async function createExam(data: ExamSchema) {
  const session = await auth();
  if (!session || !session.user.id)
    return { success: false, message: "Akses ditolak!" };

  const validation = examSchema.safeParse(data);
  if (!validation.success)
    return { success: false, message: validation.error.issues[0].message };

  const {
    title,
    subjectId,
    examTypeId,
    academicYearId,
    startTime,
    endTime,
    duration,
    randomizeQuestions,
    showResult,
    status,
    classes,
  } = validation.data;

  try {
    await prisma.exam.create({
      data: {
        title,
        subjectId,
        examTypeId,
        academicYearId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration,
        randomizeQuestions,
        showResult,
        status,
        authorId: session.user.id,
        classes: {
          connect: classes.map((id) => ({ id })),
        },
      },
    });

    revalidatePath("/admin/jadwal");
    return { success: true, message: "Jadwal Ujian berhasil dibuat!" };
  } catch (error) {
    console.error("CREATE_EXAM_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan server!" };
  }
}

export async function updateExam(data: ExamSchema & { id: string }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return { success: false, message: "Akses ditolak!" };

  try {
    await prisma.exam.update({
      where: { id: data.id },
      data: {
        title: data.title,
        subjectId: data.subjectId,
        examTypeId: data.examTypeId,
        academicYearId: data.academicYearId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        duration: data.duration,
        randomizeQuestions: data.randomizeQuestions,
        showResult: data.showResult,
        status: data.status,
        classes: {
          set: [], // Hapus relasi lama
          connect: data.classes.map((id: string) => ({ id })),
        },
      },
    });

    revalidatePath("/admin/jadwal");
    return { success: true, message: "Jadwal Ujian berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_EXAM_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan server!" };
  }
}

export async function deleteExam(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return { success: false, message: "Akses ditolak!" };

  const id = formData.get("id")?.toString();
  if (!id) return { success: false, message: "ID tidak valid!" };

  try {
    // Cek apakah udah ada siswa yang ngerjain
    const linkedAttempts = await prisma.attempt.count({
      where: { examId: id },
    });
    if (linkedAttempts > 0) {
      return {
        success: false,
        message: "Gagal! Ujian ini sudah dikerjakan oleh siswa.",
      };
    }

    // Kalau aman, hapus jadwal ujiannya
    await prisma.exam.delete({ where: { id } });

    revalidatePath("/admin/jadwal");
    return { success: true, message: "Jadwal Ujian berhasil dihapus!" };
  } catch (error) {
    console.error("DELETE_EXAM_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan saat menghapus!" };
  }
}

export async function recordViolation(attemptId: string, logMessage: string) {
  try {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { violationLogs: true, violationCount: true },
    });

    if (!attempt) return { success: false, message: "Sesi tidak ditemukan" };

    const currentLogs = Array.isArray(attempt.violationLogs)
      ? attempt.violationLogs
      : [];
    const newLog = {
      time: new Date().toISOString(),
      action: logMessage,
    };

    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        violationCount: attempt.violationCount + 1,
        violationLogs: [...currentLogs, newLog],
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Gagal mencatat pelanggaran:", error);
    return { success: false, message: "Terjadi kesalahan server!" };
  }
}
