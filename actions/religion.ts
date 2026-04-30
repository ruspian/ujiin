"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { religionSchema } from "@/schemas/religionSchema";
import { revalidatePath } from "next/cache";

export async function createReligion(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return { success: false, message: "Akses ditolak!" };

  const validation = religionSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!validation.success)
    return { success: false, message: validation.error.issues[0].message };

  const { name } = validation.data;

  try {
    const existing = await prisma.religion.findUnique({ where: { name } });
    if (existing)
      return { success: false, message: "Agama ini sudah terdaftar!" };

    await prisma.religion.create({ data: { name } });

    revalidatePath("/admin/master/agama");
    return { success: true, message: "Data Agama berhasil ditambahkan!" };
  } catch (error) {
    console.error("CREATE_RELIGION_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan server!" };
  }
}

export async function updateReligion(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return { success: false, message: "Akses ditolak!" };

  const id = formData.get("id")?.toString();
  if (!id) return { success: false, message: "ID tidak valid!" };

  const validation = religionSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!validation.success)
    return { success: false, message: validation.error.issues[0].message };

  const { name } = validation.data;

  try {
    const existing = await prisma.religion.findFirst({ where: { name } });
    if (existing && existing.id !== id)
      return { success: false, message: "Nama Agama ini sudah ada!" };

    await prisma.religion.update({
      where: { id },
      data: { name },
    });

    revalidatePath("/admin/master/agama");
    return { success: true, message: "Data Agama berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_RELIGION_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan server!" };
  }
}

export async function deleteReligion(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return { success: false, message: "Akses ditolak!" };

  const id = formData.get("id")?.toString();
  if (!id) return { success: false, message: "ID tidak valid!" };

  try {
    const linkedStudents = await prisma.student.count({
      where: { religionId: id },
    });
    if (linkedStudents > 0) {
      return {
        success: false,
        message: `Gagal! Agama ini sedang digunakan oleh ${linkedStudents} siswa.`,
      };
    }

    await prisma.religion.delete({ where: { id } });

    revalidatePath("/admin/master/agama");
    return { success: true, message: "Data Agama berhasil dihapus!" };
  } catch (error) {
    console.error("DELETE_RELIGION_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan server!" };
  }
}
