"use server";

import { generateRandomPassword } from "@/lib/generateRandomPassword";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getStudentAuth } from "@/lib/getStudentAuth";
import { VerifikasiTokenResult } from "@/types/ruang-ujian";
import { AttemptStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  TOKEN_MAX_FAILURES,
  TOKEN_WINDOW_MS,
  isRateLimited,
  recordFailure,
  resetRateLimit,
} from "@/lib/rate-limit";

/**
 * Ambil pengerjaan siswa, atau buat bila belum ada. Aman terhadap klik ganda /
 * request ulang karena jaringan lambat: bila dua request membuat bersamaan,
 * yang kalah (error unik P2002) cukup membaca yang sudah dibuat pemenang.
 */
async function getOrCreateAttempt(studentId: string, examId: string) {
  const existing = await prisma.attempt.findFirst({
    where: { studentId, examId },
  });
  if (existing) return existing;

  try {
    return await prisma.attempt.create({
      data: { studentId, examId, status: AttemptStatus.ONGOING },
    });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      const winner = await prisma.attempt.findFirst({
        where: { studentId, examId },
      });
      if (winner) return winner;
    }
    throw error;
  }
}

export async function verifikasiTokenUjian(
  examId: string,
  studentId: string,
  tokenInput: string,
): Promise<VerifikasiTokenResult> {
  try {
    // Identitas siswa diambil dari sesi login, BUKAN dari parameter client.
    // Sebelumnya studentId dipercaya apa adanya sehingga siswa bisa membuka
    // sesi atas nama siswa lain.
    const loggedIn = await getStudentAuth();
    if (!loggedIn || loggedIn.id !== studentId) {
      return { success: false, message: "Sesi login tidak valid. Silakan login ulang." };
    }

    // Cari Ujia yang statusnya PUBLISHED
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { classes: true },
    });

    if (exam && !exam.classes.some((c) => c.id === loggedIn.classId)) {
      return { success: false, message: "Ujian ini bukan untuk kelas Anda!" };
    }

    if (!exam || exam.status !== "PUBLISHED") {
      return {
        success: false,
        message: "Ujian tidak aktif atau tidak ditemukan!",
      };
    }

    // Siswa yang SUDAH punya sesi berjalan (mis. HP mati / sinyal putus lalu
    // masuk lagi) tidak perlu token ulang: token sudah pernah dibuktikan, dan
    // guru bisa saja mengganti token di tengah ujian. Tanpa ini siswa yang
    // terputus malah tidak bisa kembali mengerjakan.
    const existingAttempt = await prisma.attempt.findFirst({
      where: { studentId: loggedIn.id, examId },
      select: { status: true },
    });
    const isResuming = existingAttempt?.status === AttemptStatus.ONGOING;

    if (!isResuming) {
      // Cocokkan token (dibatasi agar tidak bisa ditebak berulang-ulang)
      const tokenKey = `token-ujian:${loggedIn.id}`;
      if (await isRateLimited(tokenKey, TOKEN_MAX_FAILURES)) {
        return {
          success: false,
          message: "Terlalu banyak token salah. Tunggu 5 menit lalu coba lagi.",
        };
      }
      const tokenClean = String(tokenInput ?? "").toUpperCase().trim();
      if (!exam.token || exam.token !== tokenClean) {
        await recordFailure(tokenKey, TOKEN_WINDOW_MS);
        return {
          success: false,
          message: "Token salah!",
        };
      }
      await resetRateLimit(tokenKey);
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

    // Ambil / buat pengerjaan
    const attempt = await getOrCreateAttempt(loggedIn.id, examId);

    if (attempt.status === AttemptStatus.SUBMITTED) {
      return { success: false, message: "Anda sudah menyelesaikan ujian ini!" };
    }

    if (attempt.status === AttemptStatus.CHEATED) {
      return {
        success: false,
        message: "Akses diblokir karena indikasi kecurangan!",
      };
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
  // Sebelumnya tanpa pengecekan login: siapa pun bisa me-reset token ujian.
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "GURU")
  ) {
    return { success: false, message: "Akses ditolak!" };
  }

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
