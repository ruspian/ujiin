"use server";

import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { setupSchema } from "@/schemas/setupSchema";

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
    const { name, username, password } = setupValidation.data;

    const adminExists = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (adminExists) {
      return { success: true, message: "Admin sudah ada!" };
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("SETUP_ACTION_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}
