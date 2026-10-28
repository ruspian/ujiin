"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/require-role";
import { ExamSchema, examSchema } from "@/schemas/examSchema";

export async function getQuestionsForExam(
  subjectId: string,
  examTypeId: string,
) {
  // Hasil berisi kunci jawaban: hanya staf yang boleh melihat.
  if (!(await requireRole("ADMIN", "GURU"))) {
    return { success: false, data: [] };
  }

  try {
    const questions = await prisma.question.findMany({
      where: {
        subjectId: subjectId,
        examTypeId: examTypeId,
      },
      include: {
        author: {
          select: { name: true },
        },
        classes: {
          include: {
            class: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: questions };
  } catch (error) {
    console.error("Gagal menarik soal:", error);
    return { success: false, data: [] };
  }
}

/** Soal yang otomatis masuk ke jadwal: cocok mapel, jenis ujian, dan salah satu kelas. */
async function findQuestionsForExam(
  subjectId: string,
  examTypeId: string,
  classes: string[],
) {
  return prisma.question.findMany({
    where: {
      subjectId,
      examTypeId,
      classes: { some: { classId: { in: classes } } },
    },
    select: { id: true },
  });
}

export async function createExam(data: ExamSchema) {
  const session = await auth();
  // Jadwal ujian hanya dibuat admin (sama seperti ubah/hapus). Sebelumnya semua
  // akun yang login bisa memanggil action ini langsung.
  if (!session || !session.user.id || session.user.role !== "ADMIN")
    return { success: false, message: "Akses ditolak!" };

  const validation = examSchema.safeParse(data);
  if (!validation.success)
    return { success: false, message: validation.error.issues[0].message };

  const {
    title,
    subjectId,
    examTypeId,
    academicYearId,
    startTime,
    endTime,
    duration,
    randomizeQuestions,
    showResult,
    status,
    classes,
    supervisorId,
  } = validation.data;

  if (!(new Date(endTime) > new Date(startTime))) {
    return {
      success: false,
      message: "Waktu selesai harus setelah waktu mulai!",
    };
  }

  try {
    const autoQuestions = await findQuestionsForExam(
      subjectId,
      examTypeId,
      classes,
    );

    if (autoQuestions.length === 0) {
      return {
        success: false,
        message:
          "Gagal! Tidak ada soal di Bank Soal yang cocok dengan Mapel, Tipe Ujian, dan Kelas ini.",
      };
    }

    await prisma.exam.create({
      data: {
        title,
        subjectId,
        examTypeId,
        academicYearId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration,
        randomizeQuestions,
        showResult,
        status: status || "PUBLISHED",
        authorId: session.user.id,
        supervisorId: supervisorId || null,
        classes: {
          connect: classes.map((id) => ({ id })),
        },
        questions: {
          connect: autoQuestions.map((q: { id: string }) => ({ id: q.id })),
        },
      },
    });

    revalidatePath("/admin/jadwal");
    return {
      success: true,
      message: `Jadwal Ujian dibuat! Berhasil memasukkan ${autoQuestions.length} soal.`,
    };
  } catch (error) {
    console.error("CREATE_EXAM_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan server!" };
  }
}

export async function updateExam(data: ExamSchema & { id: string }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return { success: false, message: "Akses ditolak!" };

  const validation = examSchema.safeParse(data);
  if (!validation.success)
    return { success: false, message: validation.error.issues[0].message };

  const {
    title,
    subjectId,
    examTypeId,
    academicYearId,
    startTime,
    endTime,
    duration,
    randomizeQuestions,
    showResult,
    status,
    classes,
    supervisorId, // 🔥 Tarik supervisorId dari data validasi
  } = validation.data;

  if (!(new Date(endTime) > new Date(startTime))) {
    return {
      success: false,
      message: "Waktu selesai harus setelah waktu mulai!",
    };
  }

  try {
    const existing = await prisma.exam.findUnique({
      where: { id: data.id },
      select: {
        subjectId: true,
        examTypeId: true,
        _count: { select: { attempts: true } },
      },
    });
    if (!existing) return { success: false, message: "Jadwal tidak ditemukan!" };

    // Paket soal ikut disesuaikan saat mapel/jenis ujian/kelas diubah (dulu
    // paket soal tetap yang lama, jadi siswa bisa mendapat soal mapel lain).
    // Kalau sudah ada siswa yang mengerjakan, paket soal dikunci supaya nilai
    // yang sudah ada tetap sah.
    let questionsData = {};
    if (existing._count.attempts > 0) {
      if (
        existing.subjectId !== subjectId ||
        existing.examTypeId !== examTypeId
      ) {
        return {
          success: false,
          message:
            "Gagal! Ujian ini sudah dikerjakan siswa, mapel dan jenis ujian tidak bisa diubah.",
        };
      }
    } else {
      const autoQuestions = await findQuestionsForExam(
        subjectId,
        examTypeId,
        classes,
      );
      if (autoQuestions.length === 0) {
        return {
          success: false,
          message:
            "Gagal! Tidak ada soal di Bank Soal yang cocok dengan Mapel, Tipe Ujian, dan Kelas ini.",
        };
      }
      questionsData = {
        questions: { set: autoQuestions.map((q) => ({ id: q.id })) },
      };
    }

    await prisma.exam.update({
      where: { id: data.id },
      data: {
        title,
        subjectId,
        examTypeId,
        academicYearId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration,
        randomizeQuestions,
        showResult,
        status,
        supervisorId: supervisorId || null,
        classes: {
          set: [],
          connect: classes.map((id: string) => ({ id })),
        },
        ...questionsData,
      },
    });

    revalidatePath("/admin/jadwal");
    return { success: true, message: "Jadwal Ujian berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_EXAM_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan server saat update!" };
  }
}

export async function deleteExam(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return { success: false, message: "Akses ditolak!" };

  const id = formData.get("id")?.toString();
  if (!id) return { success: false, message: "ID tidak valid!" };

  try {
    const linkedAttempts = await prisma.attempt.count({
      where: { examId: id },
    });
    if (linkedAttempts > 0) {
      return {
        success: false,
        message: "Gagal! Ujian ini sudah dikerjakan oleh siswa.",
      };
    }

    await prisma.exam.delete({ where: { id } });

    revalidatePath("/admin/jadwal");
    return { success: true, message: "Jadwal Ujian berhasil dihapus!" };
  } catch (error) {
    console.error("DELETE_EXAM_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan saat menghapus!" };
  }
}
