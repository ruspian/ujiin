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

    // Hanya siswa AKTIF yang diproses: siswa yang sudah lulus/keluar tidak ikut
    // berubah (mis. tombol ditekan dua kali, atau daftar di layar sudah usang).
    const activeOnly = { id: { in: studentIds }, status: "ACTIVE" as const };

    let processed = 0;
    if (action === "LULUS") {
      // Data siswa & riwayat ujiannya tetap tersimpan; hanya statusnya berubah
      // sehingga tidak bisa login lagi dan tidak muncul di daftar kelas aktif.
      const res = await prisma.student.updateMany({
        where: activeOnly,
        data: { status: "GRADUATED" },
      });
      processed = res.count;
    } else if (targetClassId) {
      const res = await prisma.student.updateMany({
        where: activeOnly,
        data: { classId: targetClassId },
      });
      processed = res.count;
    }

    revalidatePath("/admin/kenaikan-kelas");
    revalidatePath("/admin/master/siswa");
    revalidatePath("/admin/master/kelas");

    if (processed === 0) {
      return {
        success: false,
        message: "Tidak ada siswa aktif yang diproses (mungkin sudah lulus/dipindah).",
      };
    }
    const skipped = studentIds.length - processed;
    const verb = action === "LULUS" ? "diluluskan" : "dinaikkan kelasnya";
    return {
      success: true,
      message:
        `${processed} siswa berhasil ${verb}.` +
        (skipped > 0 ? ` ${skipped} dilewati karena sudah tidak aktif.` : ""),
    };
  } catch (error) {
    console.error("ERROR_KENAIKAN_KELAS:", error);
    return { success: false, message: "Gagal memproses aksi." };
  }
}
