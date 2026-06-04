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
      },
    });

    // Refresh halaman secara real-time
    revalidatePath(`/guru/monitoring/${examId}`);
  } catch (error) {
    console.error("Error resetting session:", error);
  }
}
