"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { classSchema, updateClassSchema } from "@/schemas/studentSchema";

export async function createStudent(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const studentValidation = classSchema.safeParse(rawData);

  if (!studentValidation.success) {
    return {
      success: false,
      message: studentValidation.error.issues[0].message,
    };
  }

  const { nisn, name, classId } = studentValidation.data;

  try {
    const existingStudent = await prisma.student.findUnique({
      where: { nisn },
    });

    if (existingStudent) {
      return { success: false, message: "NISN sudah terdaftar!" };
    }

    await prisma.student.create({
      data: { nisn, name, classId },
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

  const { id, nisn, name, classId } = studentValidation.data;

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
      data: { nisn, name, classId },
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
