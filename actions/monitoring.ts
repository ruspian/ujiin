"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { MAX_EXTRA_MINUTES_TOTAL } from "@/lib/exam-config";

export async function resetSesiSiswa(formData: FormData) {
  const session = await auth();

  // Validasi Role
  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "GURU")
  ) {
    throw new Error("Akses ditolak!");
  }

  // Tarik data dari hidden input
  const examId = formData.get("examId") as string;
  const studentId = formData.get("studentId") as string;

  if (!examId || !studentId) return;

  try {
    // Guru hanya boleh mereset ujian yang dia awasi / dia buat.
    if (session.user.role === "GURU") {
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        select: { supervisorId: true, authorId: true },
      });
      if (
        !exam ||
        (exam.supervisorId !== session.user.id &&
          exam.authorId !== session.user.id)
      ) {
        throw new Error("Akses ditolak!");
      }
    }

    const attempt = await prisma.attempt.findUnique({
      where: { studentId_examId: { studentId, examId } },
      select: { startTime: true, endTime: true },
    });
    if (!attempt) return;

    // Batas waktu sekarang dihitung dari (mulai + durasi). Supaya siswa yang
    // di-reset tidak kehilangan sisa waktunya, geser titik mulai sehingga
    // waktu yang SUDAH terpakai sebelum dikunci tetap sama.
    const elapsedMs =
      attempt.endTime && attempt.endTime > attempt.startTime
        ? attempt.endTime.getTime() - attempt.startTime.getTime()
        : null;

    await prisma.attempt.update({
      where: {
        studentId_examId: {
          studentId,
          examId,
        },
      },
      data: {
        status: "ONGOING",
        violationCount: 0,
        violationLogs: [],
        endTime: null,
        ...(elapsedMs !== null
          ? { startTime: new Date(Date.now() - elapsedMs) }
          : {}),
      },
    });

    // Refresh halaman secara real-time
    revalidatePath(`/guru/monitoring/${examId}`);
  } catch (error) {
    console.error("Error resetting session:", error);
  }
}

/**
 * Pengawas/pembuat ujian (atau admin) boleh mengelola ujian ini.
 * @returns id pengguna bila diizinkan, selain itu null.
 */
async function authorizeExamManager(examId: string) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || (user.role !== "ADMIN" && user.role !== "GURU")) return null;
  if (!examId) return null;

  if (user.role === "GURU") {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { supervisorId: true, authorId: true },
    });
    if (
      !exam ||
      (exam.supervisorId !== user.id && exam.authorId !== user.id)
    ) {
      return null;
    }
  }
  return user.id;
}

/**
 * Tambah waktu untuk satu siswa (studentId) atau SEMUA siswa yang sedang
 * mengerjakan (studentId kosong), mis. saat listrik mati / HP error.
 * Waktu ikut ke perangkat siswa lewat heartbeat (maks. ±15 detik).
 */
export async function tambahWaktuUjian(
  examId: string,
  minutes: number,
  studentId?: string | null,
) {
  if (!(await authorizeExamManager(examId))) {
    return { success: false, message: "Akses ditolak!" };
  }
  const add = Math.floor(Number(minutes));
  if (!Number.isFinite(add) || add < 1 || add > 60) {
    return { success: false, message: "Tambahan waktu 1-60 menit." };
  }

  try {
    const targets = await prisma.attempt.findMany({
      where: {
        examId,
        status: "ONGOING",
        ...(studentId ? { studentId } : {}),
      },
      select: { id: true, extraSeconds: true },
      take: 2000,
    });
    if (targets.length === 0) {
      return {
        success: false,
        message: studentId
          ? "Siswa ini tidak sedang mengerjakan ujian."
          : "Tidak ada siswa yang sedang mengerjakan.",
      };
    }

    const maxSeconds = MAX_EXTRA_MINUTES_TOTAL * 60;
    let updated = 0;
    for (const t of targets) {
      const next = Math.min(t.extraSeconds + add * 60, maxSeconds);
      if (next === t.extraSeconds) continue;
      const res = await prisma.attempt.updateMany({
        where: { id: t.id, status: "ONGOING" },
        data: { extraSeconds: next },
      });
      updated += res.count;
    }

    revalidatePath(`/guru/monitoring/${examId}`);
    if (updated === 0) {
      return {
        success: false,
        message: `Batas tambahan waktu (${MAX_EXTRA_MINUTES_TOTAL} menit) sudah tercapai.`,
      };
    }
    return {
      success: true,
      message: `+${add} menit untuk ${updated} siswa. Terkirim ke layar siswa dalam beberapa detik.`,
    };
  } catch (error) {
    console.error("ERROR_TAMBAH_WAKTU:", error);
    return { success: false, message: "Gagal menambah waktu." };
  }
}

/** Kirim pengumuman ke layar semua siswa yang sedang mengerjakan ujian ini. */
export async function kirimPengumumanUjian(examId: string, text: string) {
  if (!(await authorizeExamManager(examId))) {
    return { success: false, message: "Akses ditolak!" };
  }
  const message = String(text ?? "").replace(/\s+/g, " ").trim();
  if (message.length < 1 || message.length > 300) {
    return { success: false, message: "Pengumuman 1-300 karakter." };
  }

  try {
    await prisma.exam.update({
      where: { id: examId },
      data: { announcement: message, announcedAt: new Date() },
    });
    return {
      success: true,
      message: "Pengumuman terkirim. Muncul di layar siswa dalam ±15 detik.",
    };
  } catch (error) {
    console.error("ERROR_PENGUMUMAN:", error);
    return { success: false, message: "Gagal mengirim pengumuman." };
  }
}
