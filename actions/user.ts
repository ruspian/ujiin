"use server";

import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { revalidatePath } from "next/cache";
import {
  ResetPasswordSchema,
  UpdateUserSchema,
  UserSchema,
} from "@/schemas/userSchema";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ImportUserData } from "@/types/user.admin";

export async function createUser(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, message: "Akses ditolak!" };
  }

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
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, message: "Akses ditolak!" };
  }

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
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, message: "Akses ditolak!" };
  }

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

export async function resetPassword(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, message: "Akses ditolak!" };
  }

  const validation = ResetPasswordSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!validation.success)
    return { success: false, message: validation.error.issues[0].message };

  const { id, newPassword } = validation.data;

  try {
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    revalidatePath("/admin/pengguna");
    return { success: true, message: "Password berhasil direset!" };
  } catch (error) {
    console.error("RESET_PASSWORD_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat mereset password!",
    };
  }
}

export async function importUsersBulk(data: ImportUserData[]) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, message: "Akses ditolak!" };
  }

  try {
    let successCount = 0;
    let failedCount = 0;

    // Kita pakai looping biasa karena mau nge-hash password satu-satu
    for (const row of data) {
      const { name, username, password, role } = row;

      // Cek apakah username udah dipakai
      const existing = await prisma.user.findUnique({ where: { username } });

      if (!existing && username && password) {
        const hashedPassword = await bcryptjs.hash(password.toString(), 10);

        await prisma.user.create({
          data: {
            name: name || username,
            username: username.toString(),
            password: hashedPassword,
            role: role === "ADMIN" ? "ADMIN" : "GURU", // Default GURU
          },
        });
        successCount++;
      } else {
        failedCount++;
      }
    }

    revalidatePath("/admin/pengguna"); // Sesuaikan route lu
    return {
      success: true,
      message: `Import selesai! ${successCount} berhasil, ${failedCount} dilewati (username duplikat/data tidak lengkap).`,
    };
  } catch (error) {
    console.error("IMPORT_USERS_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat memproses data!",
    };
  }
}
