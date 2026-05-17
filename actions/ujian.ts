"use server";

import { generateRandomPassword } from "@/lib/generateRandomPassword";
import { prisma } from "@/lib/prisma";
import { VerifikasiTokenResult } from "@/types/ruang-ujian";
import { AttemptStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

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

export async function verifikasiTokenUjian(
  examId: string,
  studentId: string,
  tokenInput: string,
): Promise<VerifikasiTokenResult> {
  try {
    // Cari Ujia yang statusnya PUBLISHED
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { classes: true },
    });

    if (!exam || exam.status !== "PUBLISHED") {
      return {
        success: false,
        message: "Ujian tidak aktif atau tidak ditemukan!",
      };
    }

    // Cocokkan token
    if (!exam.token || exam.token !== tokenInput.toUpperCase().trim()) {
      return {
        success: false,
        message: "Token salah!",
      };
    }

    // Validasi Waktu
    const now = new Date();
    if (now < exam.startTime) {
      return { success: false, message: "Waktu ujian belum dimulai!" };
    }
    if (now > exam.endTime) {
      return {
        success: false,
        message: "Waktu pengerjaan ujian sudah berakhir!",
      };
    }

    //  Buat Pengerjaan
    let attempt = await prisma.attempt.findFirst({
      where: { studentId, examId },
    });

    if (attempt?.status === AttemptStatus.SUBMITTED) {
      return { success: false, message: "Anda sudah menyelesaikan ujian ini!" };
    }

    if (attempt?.status === AttemptStatus.CHEATED) {
      return {
        success: false,
        message: "Akses diblokir karena indikasi kecurangan!",
      };
    }

    // Kalau belum ada pengerjaan sama sekali, buat baru
    if (!attempt) {
      attempt = await prisma.attempt.create({
        data: {
          studentId,
          examId,
          status: AttemptStatus.ONGOING,
        },
      });
    }

    return {
      success: true,
      message: "Token valid! Membuka ruang ujian...",
      attemptId: attempt.id,
    };
  } catch (error) {
    console.error("Error verifikasi token:", error);
    return { success: false, message: "Terjadi kesalahan pada server." };
  }
}

export async function generateExamToken(examId: string) {
  try {
    const newToken = generateRandomPassword();

    // Update token di database
    await prisma.exam.update({
      where: { id: examId },
      data: { token: newToken },
    });

    revalidatePath("/admin/jadwal");

    return {
      success: true,
      message: "Token ujian berhasil di-generate!",
      token: newToken,
    };
  } catch (error) {
    console.error("Gagal generate token:", error);
    return { success: false, message: "Terjadi kesalahan saat membuat token." };
  }
}
