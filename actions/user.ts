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

const MAX_IMPORT_ROWS = 500;

/** Username selalu disimpan huruf kecil tanpa spasi di tepi. */
const normalizeUsername = (u: string) => u.trim().toLowerCase();

const findByUsername = (username: string) =>
  prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });

/**
 * Admin terakhir tidak boleh dihapus atau diturunkan rolenya, kalau tidak
 * tidak ada lagi yang bisa mengelola sistem.
 */
async function adminGuard(id: string) {
  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!target) return { exists: false, isLastAdmin: false };
  if (target.role !== "ADMIN") return { exists: true, isLastAdmin: false };
  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  return { exists: true, isLastAdmin: admins <= 1 };
}

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

  const { name, password, role } = createUserValidation.data;
  const username = normalizeUsername(createUserValidation.data.username);

  try {
    const existingUser = await findByUsername(username);

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

  const { id, name, password, role } = updateUserValidation.data;
  const username = normalizeUsername(updateUserValidation.data.username);

  try {
    const guard = await adminGuard(id);
    if (!guard.exists) {
      return { success: false, message: "Pengguna tidak ditemukan!" };
    }
    if (guard.isLastAdmin && role !== "ADMIN") {
      return {
        success: false,
        message: "Tidak bisa menurunkan role admin terakhir!",
      };
    }

    const existingUser = await findByUsername(username);
    if (existingUser && existingUser.id !== id) {
      return {
        success: false,
        message: "Username sudah dipakai pengguna lain!",
      };
    }

    const dataToUpdate: Prisma.UserUpdateInput = {
      name,
      username,
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
  if (id === session.user.id) {
    return {
      success: false,
      message: "Tidak bisa menghapus akun yang sedang Anda pakai!",
    };
  }

  try {
    const guard = await adminGuard(id);
    if (!guard.exists) {
      return { success: false, message: "Pengguna tidak ditemukan!" };
    }
    if (guard.isLastAdmin) {
      return { success: false, message: "Tidak bisa menghapus admin terakhir!" };
    }

    await prisma.user.delete({
      where: { id },
    });

    revalidatePath("/admin/pengguna");
    return { success: true, message: "Pengguna berhasil dihapus!" };
  } catch (error) {
    console.error("DELETE_USER_ERROR:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        message:
          "Gagal! Pengguna ini masih dipakai data lain (soal, jadwal, atau penugasan mapel).",
      };
    }
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

  if (!Array.isArray(data) || data.length === 0) {
    return { success: false, message: "Data import kosong!" };
  }
  if (data.length > MAX_IMPORT_ROWS) {
    return {
      success: false,
      message: `Maksimal ${MAX_IMPORT_ROWS} baris per import. Bagi file menjadi beberapa bagian.`,
    };
  }

  try {
    let successCount = 0;
    let failedCount = 0;

    // Looping biasa karena password di-hash satu per satu
    for (const row of data) {
      try {
        const username = normalizeUsername(String(row?.username ?? ""));
        const password = String(row?.password ?? "");

        // aturan sama dengan form tambah pengguna
        if (username.length < 5 || password.length < 6) {
          failedCount++;
          continue;
        }

        if (await findByUsername(username)) {
          failedCount++;
          continue;
        }

        await prisma.user.create({
          data: {
            name: String(row?.name ?? "").trim() || username,
            username,
            password: await bcryptjs.hash(password, 10),
            role: row?.role === "ADMIN" ? "ADMIN" : "GURU", // default GURU
          },
        });
        successCount++;
      } catch (rowError) {
        console.error("IMPORT_USER_ROW_ERROR:", rowError);
        failedCount++;
      }
    }

    revalidatePath("/admin/pengguna");
    return {
      success: true,
      message: `Import selesai! ${successCount} berhasil, ${failedCount} dilewati (username duplikat/pendek, password kurang dari 6 karakter, atau data tidak lengkap).`,
    };
  } catch (error) {
    console.error("IMPORT_USERS_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat memproses data!",
    };
  }
}
