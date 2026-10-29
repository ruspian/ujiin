import { prisma } from "@/lib/prisma";

/**
 * Guru boleh melihat/menilai pengerjaan siswa bila ia pembuat jadwal, pengawas,
 * atau pengampu mapel tersebut di kelas siswa. Dipakai di halaman penilaian
 * (baca) dan aksi simpan koreksi (tulis) agar aturannya sama di keduanya.
 */
export async function canTeacherAccessAttempt(
  userId: string,
  exam: { authorId: string; supervisorId: string | null; subjectId: string },
  studentClassId: string,
): Promise<boolean> {
  if (exam.authorId === userId || exam.supervisorId === userId) return true;

  const assignment = await prisma.subjectAssignment.findFirst({
    where: {
      subjectId: exam.subjectId,
      classId: studentClassId,
      teacherId: userId,
    },
    select: { id: true },
  });
  return !!assignment;
}
