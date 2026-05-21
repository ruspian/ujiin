"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcryptjs from "bcryptjs";

export async function loginSiswaAction(nisn: string, passwordInput: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { nisn },
    });

    if (!student) {
      return { success: false, message: "NISN tidak terdaftar!" };
    }

    if (student.status !== "ACTIVE") {
      return {
        success: false,
        message: "Akun Anda sudah tidak aktif atau Anda telah lulus.",
      };
    }

    if (!student.password) {
      return { success: false, message: "Akun belum aktif. Hubungi Admin!" };
    }

    const isPasswordMatch = await bcryptjs.compare(
      passwordInput,
      student.password,
    );

    if (!isPasswordMatch) {
      return { success: false, message: "NISN atau Password salah!" };
    }

    const cookieStore = await cookies();
    cookieStore.set("student_id", student.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return { success: true, message: "Login berhasil! Mengalihkan..." };
  } catch (error) {
    console.error("Error login siswa:", error);
    return { success: false, message: "Terjadi kesalahan pada server." };
  }
}

export async function logoutSiswaAction() {
  const cookieStore = await cookies();
  cookieStore.delete("student_id");
  return { success: true, message: "Berhasil keluar" };
}
