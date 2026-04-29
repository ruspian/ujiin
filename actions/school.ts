"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { schoolProfileSchema } from "@/schemas/schoolProfileSchema";
import { auth } from "@/lib/auth";

export async function getSchoolProfile() {
  try {
    const profile = await prisma.schoolProfile.findFirst();
    return {
      data: profile,
      message: "Profil sekolah berhasil diambil!",
      success: true,
    };
  } catch (error) {
    console.error("GET_SCHOOL_PROFILE_ERROR:", error);
    return {
      data: null,
      message: "Kesalahan pada server!",
      success: false,
    };
  }
}

export async function updateSchoolProfile(formData: FormData) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return { success: false, message: "Akses ditolak!" };
  }

  const rawData = Object.fromEntries(formData.entries());

  const dataValidation = schoolProfileSchema.safeParse(rawData);

  if (!dataValidation.success) {
    return {
      success: false,
      message: dataValidation.error.issues[0].message,
    };
  }

  const { name, npsn, address, phone } = dataValidation.data;

  try {
    const data = {
      name,
      npsn: npsn || null,
      address: address || null,
      phone: phone || null,
    };

    await prisma.schoolProfile.upsert({
      where: { id: "1" },
      update: data,
      create: { id: "1", ...data },
    });

    revalidatePath("/admin/pengaturan");
    return { success: true, message: "Profil Sekolah berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_SCHOOL_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server!",
    };
  }
}
