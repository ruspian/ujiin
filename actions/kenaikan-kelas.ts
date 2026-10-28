"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function prosesKenaikanKelas(
  studentIds: string[],
  action: "NAIK_KELAS" | "LULUS",
  targetClassId?: string,
) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return { success: false, message: "Akses ditolak!" };
  }

  if (
    !Array.isArray(studentIds) ||
    studentIds.length === 0 ||
    studentIds.length > 2000
  ) {
    return { success: false, message: "Pilih siswa terlebih dahulu!" };
  }

  try {
    if (action === "NAIK_KELAS") {
      // Dulu tanpa kelas tujuan, aksi tidak berbuat apa-apa tapi dilaporkan berhasil.
      if (!targetClassId) {
        return { success: false, message: "Pilih kelas tujuan!" };
      }
      const target = await prisma.class.findUnique({
        where: { id: targetClassId },
        select: { id: true },
      });
      if (!target) {
        return { success: false, message: "Kelas tujuan tidak ditemukan!" };
      }
    } else if (action !== "LULUS") {
      return { success: false, message: "Aksi tidak dikenal!" };
    }

    if (action === "LULUS") {
      await prisma.student.updateMany({
        where: { id: { in: studentIds } },
        data: {
          status: "GRADUATED",
        },
      });
    } else if (action === "NAIK_KELAS" && targetClassId) {
      await prisma.student.updateMany({
        where: { id: { in: studentIds } },
        data: {
          classId: targetClassId,
        },
      });
    }

    revalidatePath("/admin/master/siswa");
    return { success: true, message: "Proses berhasil dieksekusi!" };
  } catch (error) {
    console.error("ERROR_KENAIKAN_KELAS:", error);
    return { success: false, message: "Gagal memproses aksi." };
  }
}
