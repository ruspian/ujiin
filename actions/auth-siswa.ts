"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { cookies, headers } from "next/headers";
import bcryptjs from "bcryptjs";
import {
  STUDENT_COOKIE,
  STUDENT_SESSION_MAX_AGE,
  signStudentSession,
} from "@/lib/student-session";
import {
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  clientIpFromHeaders,
  isRateLimited,
  recordFailure,
  resetRateLimit,
} from "@/lib/rate-limit";

// Hash palsu: NISN yang tidak terdaftar tetap menjalani bcrypt.compare sehingga
// waktu respons sama dan keberadaan NISN tidak bisa ditebak dari kecepatannya.
let dummyHash: string | null = null;
function getDummyHash(): string {
  if (dummyHash === null) {
    try {
      dummyHash = bcryptjs.hashSync(randomUUID(), 10);
    } catch {
      dummyHash = "invalid";
    }
  }
  return dummyHash;
}

const GENERIC_FAIL = "NISN atau Password salah!";
const IP_MAX_FAILURES = 100; // jaringan sekolah berbagi satu IP, jadi longgar

async function getClientIp(): Promise<string> {
  try {
    return clientIpFromHeaders(await headers());
  } catch {
    return "unknown";
  }
}

export async function loginSiswaAction(nisn: string, passwordInput: string) {
  try {
    if (
      typeof nisn !== "string" ||
      typeof passwordInput !== "string" ||
      nisn.length === 0 ||
      nisn.length > 50 ||
      passwordInput.length > 200
    ) {
      return { success: false, message: GENERIC_FAIL };
    }

    const nisnKey = `login-siswa:${nisn}`;
    const ipKey = `login-siswa-ip:${await getClientIp()}`;

    if (
      (await isRateLimited(nisnKey, LOGIN_MAX_FAILURES)) ||
      (await isRateLimited(ipKey, IP_MAX_FAILURES))
    ) {
      return {
        success: false,
        message:
          "Terlalu banyak percobaan yang gagal. Tunggu 10 menit lalu coba lagi.",
      };
    }

    const student = await prisma.student.findUnique({
      where: { nisn },
    });

    const isPasswordMatch = await bcryptjs.compare(
      passwordInput,
      student?.password ?? getDummyHash(),
    );

    if (!student || !student.password || !isPasswordMatch) {
      await recordFailure(nisnKey, LOGIN_WINDOW_MS);
      await recordFailure(ipKey, LOGIN_WINDOW_MS);
      if (student && !student.password) {
        return { success: false, message: "Akun belum aktif. Hubungi Admin!" };
      }
      return { success: false, message: GENERIC_FAIL };
    }

    // Status dicek SETELAH password benar: status akun tidak bocor ke orang lain.
    if (student.status !== "ACTIVE") {
      return {
        success: false,
        message: "Akun Anda sudah tidak aktif atau Anda telah lulus.",
      };
    }

    await resetRateLimit(nisnKey);

    const cookieStore = await cookies();
    cookieStore.set(STUDENT_COOKIE, await signStudentSession(student.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: STUDENT_SESSION_MAX_AGE,
    });

    return { success: true, message: "Login berhasil! Mengalihkan..." };
  } catch (error) {
    console.error("Error login siswa:", error);
    return { success: false, message: "Terjadi kesalahan pada server." };
  }
}

export async function logoutSiswaAction() {
  const cookieStore = await cookies();
  cookieStore.delete(STUDENT_COOKIE);
  return { success: true, message: "Berhasil keluar" };
}
