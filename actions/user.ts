"use server";

import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { revalidatePath } from "next/cache";
import { UserSchema } from "@/schemas/userSchema";
import { Prisma } from "@prisma/client";

export async function createUser(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const createUserValidation = UserSchema.safeParse(rawData);

  if (!createUserValidation.success) {
    return {
      success: false,
      message: createUserValidation.error.issues[0].message,
    };
  }

  const { name, username, password, role } = createUserValidation.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return { success: false, message: "Username/NIP sudah terdaftar!" };
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role,
      },
    });

    revalidatePath("/admin/pengguna");

    return { success: true, message: "Pengguna berhasil ditambahkan!" };
  } catch (error) {
    console.error("CREATE_USER_ERROR:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { success: false, message: "Username sudah terdaftar!" };
      }
    }
    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}
