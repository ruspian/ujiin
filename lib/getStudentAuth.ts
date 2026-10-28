import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { STUDENT_COOKIE, verifyStudentSession } from "@/lib/student-session";

/**
 * Siswa yang sedang login, atau null. Cookie harus bertanda tangan sah, dan
 * akun harus masih ACTIVE (siswa yang dinonaktifkan/lulus langsung kehilangan
 * akses, tidak menunggu cookie 12 jam habis).
 */
export async function getStudentAuth() {
  const cookieStore = await cookies();

  const studentId = await verifyStudentSession(
    cookieStore.get(STUDENT_COOKIE)?.value,
  );
  if (!studentId) return null;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true, religion: true },
  });

  if (!student || student.status !== "ACTIVE") return null;
  return student;
}

/**
 * Versi ringan: hanya memverifikasi tanda tangan cookie, TANPA query database.
 * Dipakai endpoint yang dipanggil sangat sering selama ujian (heartbeat,
 * simpan jawaban) supaya beban database tidak berlipat saat banyak siswa.
 * Pemeriksaan status akun dilakukan saat halaman ujian dibuka.
 */
export async function getStudentIdFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifyStudentSession(cookieStore.get(STUDENT_COOKIE)?.value);
}
