"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

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
