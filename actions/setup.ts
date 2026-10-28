"use server";

import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { setupSchema } from "@/schemas/setupSchema";

// Kunci advisory Postgres: hanya satu permintaan setup yang boleh berjalan.
const SETUP_LOCK_KEY = 727_274;

export async function createFirstAdmin(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const setupValidation = setupSchema.safeParse(rawData);

  if (!setupValidation.success) {
    return {
      success: false,
      message: setupValidation.error.issues[0].message,
    };
  }

  try {
    const { name, password } = setupValidation.data;
    const username = setupValidation.data.username.trim().toLowerCase();

    // Cek cepat dulu supaya tidak meng-hash password bila admin sudah ada
    if (await prisma.user.findFirst({ where: { role: "ADMIN" } })) {
      return { success: true, message: "Admin sudah ada!" };
    }
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Cek-lalu-buat dilakukan di bawah kunci, jadi dua permintaan bersamaan
    // tidak bisa sama-sama membuat admin.
    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SETUP_LOCK_KEY})`;

      const adminExists = await tx.user.findFirst({
        where: { role: "ADMIN" },
      });
      if (adminExists) return false;

      await tx.user.create({
        data: { name, username, password: hashedPassword, role: "ADMIN" },
      });
      return true;
    });

    if (!created) {
      return { success: true, message: "Admin sudah ada!" };
    }

    return { success: true };
  } catch (error) {
    console.error("SETUP_ACTION_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}
