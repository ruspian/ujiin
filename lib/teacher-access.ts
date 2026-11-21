import { prisma } from "@/lib/prisma";

/**
 * Guru boleh melihat/menilai pengerjaan siswa bila ia pembuat jadwal, pengawas,
 * atau pengampu mapel ujian tersebut (kelas mana pun). Daftar ujian di
 * Penilaian juga memakai aturan ini, jadi ujian yang tampil bisa dikoreksi seluruh pesertanya,
 * termasuk siswa dari kelas lain yang ikut ujian yang sama. Dipakai di halaman penilaian
 * (baca) dan aksi simpan koreksi (tulis) agar aturannya sama di keduanya.
 */
export async function canTeacherAccessAttempt(
  userId: string,
  exam: { authorId: string; supervisorId: string | null; subjectId: string },
  _studentClassId?: string,
): Promise<boolean> {
  if (exam.authorId === userId || exam.supervisorId === userId) return true;

  const assignment = await prisma.subjectAssignment.findFirst({
    where: {
      subjectId: exam.subjectId,
      teacherId: userId,
    },
    select: { id: true },
  });
  return !!assignment;
}
