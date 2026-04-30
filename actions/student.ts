"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { classSchema, updateClassSchema } from "@/schemas/studentSchema";
import bcryptjs from "bcryptjs";
import { generateRandomPassword } from "@/lib/generateRandomPassword";

export async function createStudent(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const studentValidation = classSchema.safeParse(rawData);

  if (!studentValidation.success) {
    return {
      success: false,
      message: studentValidation.error.issues[0].message,
    };
  }

  const { nisn, name, classId, religionId } = studentValidation.data;

  try {
    const existingStudent = await prisma.student.findUnique({
      where: { nisn },
    });

    if (existingStudent) {
      return { success: false, message: "NISN sudah terdaftar!" };
    }

    await prisma.student.create({
      data: { nisn, name, classId, religionId },
    });

    revalidatePath("/admin/master/siswa");
    revalidatePath("/admin/master/kelas");

    return { success: true, message: "Data siswa berhasil ditambahkan!" };
  } catch (error) {
    console.error("CREATE_STUDENT_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}

export async function updateStudent(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const studentValidation = updateClassSchema.safeParse(rawData);
  if (!studentValidation.success) {
    return {
      success: false,
      message: studentValidation.error.issues[0].message,
    };
  }

  const { id, nisn, name, classId, religionId } = studentValidation.data;

  try {
    const existingStudent = await prisma.student.findUnique({
      where: { nisn },
    });

    if (existingStudent && existingStudent.id !== id) {
      return {
        success: false,
        message: "Siswa dengan NISN tersebut sudah ada!",
      };
    }

    await prisma.student.update({
      where: { id },
      data: { nisn, name, classId, religionId },
    });

    revalidatePath("/admin/master/siswa");
    revalidatePath("/admin/master/kelas");
    return { success: true, message: "Data siswa berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_STUDENT_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan pada server!" };
  }
}

export async function deleteStudent(id: string) {
  if (!id) return { success: false, message: "ID siswa tidak valid!" };

  try {
    // Cek apakah siswa udah pernah ngerjain ujian
    const attemptsCount = await prisma.attempt.count({
      where: { studentId: id },
    });

    if (attemptsCount > 0) {
      return {
        success: false,
        message: "Gagal! Siswa ini sudah memiliki riwayat ujian.",
      };
    }

    await prisma.student.delete({ where: { id } });

    revalidatePath("/admin/master/siswa");
    revalidatePath("/admin/master/kelas");
    return { success: true, message: "Data siswa berhasil dihapus!" };
  } catch (error) {
    console.error("DELETE_STUDENT_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat menghapus siswa!",
    };
  }
}

export async function importStudents(
  studentsData: { nisn: string; name: string; className: string }[],
) {
  if (!studentsData || studentsData.length === 0) {
    return { success: false, message: "File Excel kosong atau format salah!" };
  }

  try {
    const getClasses = await prisma.class.findMany({
      select: { id: true, name: true },
    });

    const classMap = new Map(
      getClasses.map((c) => [c.name.trim().toLowerCase(), c.id]),
    );

    const existingStudents = await prisma.student.findMany({
      select: { nisn: true },
    });

    const existingNisnSet = new Set(existingStudents.map((s) => s.nisn));

    const validStudents = [];
    const errors = [];

    // Proses data baris per baris ke excel
    for (const [index, row] of studentsData.entries()) {
      const rowNumber = index + 2; // +2 karena index 0 itu baris ke-2 di Excel

      if (!row.nisn || !row.name || !row.className) {
        errors.push(`Baris ${rowNumber}: Data tidak lengkap`);
        continue;
      }

      const nisnStr = String(row.nisn).trim();

      if (existingNisnSet.has(nisnStr)) {
        errors.push(`Baris ${rowNumber}: NISN ${nisnStr} sudah terdaftar`);
        continue;
      }

      const classId = classMap.get(String(row.className).trim().toLowerCase());

      if (!classId) {
        errors.push(
          `Baris ${rowNumber}: Kelas '${row.className}' tidak ditemukan`,
        );
        continue;
      }

      validStudents.push({
        nisn: nisnStr,
        name: String(row.name).trim(),
        classId: classId,
      });

      // Tambahkan ke Set untuk mencegah duplikat dalam file yang sama
      existingNisnSet.add(nisnStr);
    }

    // masukkan ke database sekaligus
    if (validStudents.length > 0) {
      await prisma.student.createMany({
        data: validStudents,
        skipDuplicates: true, // skip jika ada duplikat
      });
    }

    revalidatePath("/admin/master/siswa");
    revalidatePath("/admin/master/kelas");

    return {
      success: true,
      message: `Berhasil import ${validStudents.length} siswa. ${
        errors.length > 0 ? `Gagal memproses ${errors.length} baris.` : ""
      }`,
      errors,
    };
  } catch (error) {
    console.error("IMPORT_STUDENT_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan pada server saat import!",
    };
  }
}

export async function randomizeSessions(formData: FormData) {
  const classId = formData.get("classId") as string;
  const totalSessions = parseInt(formData.get("totalSessions") as string);
  const room = (formData.get("room") as string) || null;

  if (!classId || !totalSessions || totalSessions < 1) {
    return {
      success: false,
      message: "Pilih kelas dan jumlah sesi dengan benar!",
    };
  }

  try {
    const students = await prisma.student.findMany({
      where: { classId },
      select: { id: true },
    });

    if (students.length === 0) {
      return { success: false, message: "Tidak ada siswa di kelas ini!" };
    }

    // Acak urutan siswa
    const shuffledStudents = [...students].sort(() => 0.5 - Math.random());

    // update setiap siswa dengan sesi dan ruang yang sudah ditentukan
    const updates = shuffledStudents.map((student, index) => {
      const sessionNumber = (index % totalSessions) + 1;
      return prisma.student.update({
        where: { id: student.id },
        data: {
          session: `Sesi ${sessionNumber}`,
          room: room,
        },
      });
    });

    // Eksekusi
    await prisma.$transaction(updates);

    revalidatePath("/admin/master/siswa");
    return {
      success: true,
      message: `Berhasil mengacak dan membagi ${students.length} siswa ke dalam ${totalSessions} sesi!`,
    };
  } catch (error) {
    console.error("RANDOMIZE_SESSION_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan saat mengacak sesi!" };
  }
}

export async function resetSessions(formData: FormData) {
  const classId = formData.get("classId") as string;

  if (!classId) {
    return { success: false, message: "Pilih kelas terlebih dahulu!" };
  }

  try {
    await prisma.student.updateMany({
      where: { classId },
      data: {
        session: null,
        room: null,
      },
    });

    revalidatePath("/admin/master/siswa");
    return {
      success: true,
      message:
        "Berhasil mereset! Semua siswa di kelas ini tidak memiliki sesi ujian.",
    };
  } catch (error) {
    console.error("RESET_SESSION_ERROR:", error);
    return { success: false, message: "Terjadi kesalahan saat mereset sesi!" };
  }
}

export async function prepareExamCards(classId: string) {
  try {
    const students = await prisma.student.findMany({
      where: { classId },
      include: { class: true },
      orderBy: { name: "asc" },
    });

    if (students.length === 0)
      return { success: false, message: "Tidak ada siswa!" };

    const studentsWithRawPassword = [];

    for (const student of students) {
      let rawPassword = "";

      if (!student.password) {
        // Generate password baru jika belum punya
        rawPassword = generateRandomPassword(6);
        const hashedPassword = await bcryptjs.hash(rawPassword, 10);

        await prisma.student.update({
          where: { id: student.id },
          data: { password: hashedPassword },
        });
      } else {
        rawPassword = "******";
      }

      studentsWithRawPassword.push({
        name: student.name,
        nisn: student.nisn,
        className: student.class.name,
        password: rawPassword,
        session: student.session || "-",
        room: student.room || "-",
      });
    }

    return {
      success: true,
      data: studentsWithRawPassword,
      message: "Kartu ujian berhasil disiapkan!",
    };
  } catch (error) {
    console.error("PREPARE_EXAM_CARDS_ERROR:", error);
    return { success: false, message: "Kesalahan pada server!" };
  }
}

export async function resetStudentPassword(formData: FormData) {
  const id = formData.get("id") as string;

  if (!id) return { success: false, message: "ID Siswa tidak valid!" };

  try {
    const rawPassword = generateRandomPassword(6);
    const hashedPassword = await bcryptjs.hash(rawPassword, 10);

    await prisma.student.update({
      where: { id },
      data: { password: hashedPassword },
    });

    revalidatePath("/admin/master/siswa");

    return {
      success: true,
      message: `Berhasil direset!`,
      newPassword: rawPassword,
    };
  } catch (error) {
    console.error("RESET_PASSWORD_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server!",
    };
  }
}
