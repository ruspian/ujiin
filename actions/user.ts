"use server";

import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { revalidatePath } from "next/cache";
import { UpdateUserSchema, UserSchema } from "@/schemas/userSchema";
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
        username: username.toLowerCase(),
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

export async function updateUser(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const updateUserValidation = UpdateUserSchema.safeParse(rawData);

  if (!updateUserValidation.success) {
    return {
      success: false,
      message: updateUserValidation.error.issues[0].message,
    };
  }

  const { id, name, username, password, role } = updateUserValidation.data;

  try {
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser && existingUser.id !== id) {
      return {
        success: false,
        message: "Username sudah dipakai pengguna lain!",
      };
    }

    const dataToUpdate: Prisma.UserUpdateInput = {
      name,
      username: username.toLowerCase(),
      role,
    };

    if (password && password.trim() !== "") {
      dataToUpdate.password = await bcryptjs.hash(password, 10);
    }

    await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    revalidatePath("/admin/pengguna");
    return { success: true, message: "Data pengguna berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_USER_ERROR:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { success: false, message: "Username sudah terdaftar!" };
      }
    }

    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}

export async function deleteUser(id: string) {
  if (!id) {
    return { success: false, message: "ID pengguna tidak ditemukan!" };
  }

  try {
    await prisma.user.delete({
      where: { id },
    });

    revalidatePath("/admin/pengguna");
    return { success: true, message: "Pengguna berhasil dihapus!" };
  } catch (error) {
    console.error("DELETE_USER_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat menghapus data!",
    };
  }
}
