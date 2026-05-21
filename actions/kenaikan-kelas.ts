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

  try {
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
