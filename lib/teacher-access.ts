import { prisma } from "@/lib/prisma";

/**
 * Guru hanya boleh melihat/menilai pengerjaan siswa bila ia pengampu mapel ujian
 * tersebut (kelas mana pun, agar siswa lintas kelas pada ujian yang sama tetap bisa
 * dikoreksi). Menjadi pengawas atau pembuat jadwal TIDAK cukup untuk menilai mapel
 * orang lain. Daftar Penilaian/Rekap memakai aturan yang sama, dan dipakai di halaman
 * penilaian (baca) serta aksi simpan koreksi (tulis).
 */
export async function canTeacherAccessAttempt(
  userId: string,
  exam: { subjectId: string; [k: string]: unknown },
  _studentClassId?: string,
): Promise<boolean> {
  const assignment = await prisma.subjectAssignment.findFirst({
    where: { subjectId: exam.subjectId, teacherId: userId },
    select: { id: true },
  });
  return !!assignment;
}
