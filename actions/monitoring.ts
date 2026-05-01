"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function resetSesiSiswa(examId: string, studentId: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, message: "Akses ditolak!" };
  }

  try {
    // hapus data attempt berdasarkan studentId dan examId
    await prisma.attempt.delete({
      where: {
        studentId_examId: {
          studentId,
          examId,
        },
      },
    });

    // Refresh halaman secara real-time
    revalidatePath(`/admin/monitoring/${examId}`);
    return { success: true, message: "Sesi ujian berhasil direset!" };
  } catch (error) {
    console.error("Error resetting session:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server!",
    };
  }
}
