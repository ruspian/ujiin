"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { ExamSchema, examSchema } from "@/schemas/examSchema";

export async function getQuestionsForExam(
  subjectId: string,
  examTypeId: string,
) {
  try {
    const questions = await prisma.question.findMany({
      where: {
        subjectId: subjectId,
        examTypeId: examTypeId,
      },
      include: {
        author: {
          select: { name: true },
        },
        class: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: questions };
  } catch (error) {
    console.error("Gagal menarik soal:", error);
    return { success: false, data: [] };
  }
}

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
    supervisorId, // 🔥 Tarik supervisorId dari data validasi
  } = validation.data;

  try {
    const autoQuestions = await prisma.question.findMany({
      where: {
        subjectId: subjectId,
        examTypeId: examTypeId,
        classId: { in: classes },
      },
      select: { id: true },
    });

    if (autoQuestions.length === 0) {
      return {
        success: false,
        message:
          "Gagal! Tidak ada soal di Bank Soal yang cocok dengan Mapel, Tipe Ujian, dan Kelas ini.",
      };
    }

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
        status: status || "PUBLISHED",
        authorId: session.user.id,
        supervisorId: supervisorId || null,
        classes: {
          connect: classes.map((id) => ({ id })),
        },
        questions: {
          connect: autoQuestions.map((q: { id: string }) => ({ id: q.id })),
        },
      },
    });

    revalidatePath("/admin/jadwal");
    return {
      success: true,
      message: `Jadwal Ujian dibuat! Berhasil memasukkan ${autoQuestions.length} soal.`,
    };
  } catch (error) {
    console.error("CREATE_EXAM_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan server!" };
  }
}

export async function updateExam(data: ExamSchema & { id: string }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
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
    supervisorId, // 🔥 Tarik supervisorId dari data validasi
  } = validation.data;

  try {
    await prisma.exam.update({
      where: { id: data.id },
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
        supervisorId: supervisorId || null,
        classes: {
          set: [],
          connect: classes.map((id: string) => ({ id })),
        },
      },
    });

    revalidatePath("/admin/jadwal");
    return { success: true, message: "Jadwal Ujian berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_EXAM_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan server saat update!" };
  }
}

export async function deleteExam(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return { success: false, message: "Akses ditolak!" };

  const id = formData.get("id")?.toString();
  if (!id) return { success: false, message: "ID tidak valid!" };

  try {
    const linkedAttempts = await prisma.attempt.count({
      where: { examId: id },
    });
    if (linkedAttempts > 0) {
      return {
        success: false,
        message: "Gagal! Ujian ini sudah dikerjakan oleh siswa.",
      };
    }

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
