"use server";

import { prisma } from "@/lib/prisma";

export async function masukUjian(nisn: string, token: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { nisn },
      include: { class: true },
    });

    if (!student) {
      return { success: false, message: "NISN tidak terdaftar di sistem!" };
    }

    const exam = await prisma.exam.findFirst({
      where: {
        token: token.toUpperCase(),
        status: "PUBLISHED",
      },
      include: { classes: true },
    });

    if (!exam) {
      return {
        success: false,
        message: "Token tidak valid atau ujian belum diaktifkan!",
      };
    }

    const isClassAllowed = exam.classes.some((c) => c.id === student.classId);
    if (!isClassAllowed) {
      return { success: false, message: "Ujian ini bukan untuk kelas Anda!" };
    }

    const now = new Date();
    if (exam.startTime && now < exam.startTime)
      return { success: false, message: "Ujian belum dimulai!" };
    if (exam.endTime && now > exam.endTime)
      return { success: false, message: "Waktu ujian sudah berakhir!" };

    let attempt = await prisma.attempt.findFirst({
      where: {
        studentId: student.id,
        examId: exam.id,
      },
    });

    if (attempt?.status === "SUBMITTED") {
      return { success: false, message: "Anda sudah menyelesaikan ujian ini!" };
    }

    if (!attempt) {
      attempt = await prisma.attempt.create({
        data: {
          studentId: student.id,
          examId: exam.id,
          status: "ONGOING",
        },
      });
    }

    return {
      success: true,
      message: "Berhasil masuk! Mengalihkan ke ruang ujian...",
      attemptId: attempt.id,
    };
  } catch (error) {
    console.error("Error validasi ujian:", error);
    return { success: false, message: "Terjadi kesalahan pada server." };
  }
}
