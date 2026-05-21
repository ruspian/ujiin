"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface AssignmentPayload {
  classId: string;
  teacherId: string;
}

export async function createSubject(formData: FormData) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const name = formData.get("name") as string;
  const religionId = (formData.get("religionId") as string) || null;
  const assignmentsRaw = formData.get("assignments") as string;

  if (!name || !assignmentsRaw) {
    return {
      success: false,
      message: "Data nama atau plot guru tidak lengkap!",
    };
  }

  try {
    const assignments: AssignmentPayload[] = JSON.parse(assignmentsRaw);

    // Cek apakah Mapel sudah ada
    const existingSubject = await prisma.subject.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });

    let subjectId = existingSubject?.id;

    await prisma.$transaction(async (tx) => {
      if (!existingSubject) {
        const newSubject = await tx.subject.create({
          data: {
            name: name.trim(),
            religionId: religionId,
          },
        });
        subjectId = newSubject.id;
      }

      for (const item of assignments) {
        await tx.subjectAssignment.upsert({
          where: {
            subjectId_classId: {
              subjectId: subjectId as string,
              classId: item.classId,
            },
          },
          update: {
            teacherId: item.teacherId,
          },
          create: {
            subjectId: subjectId as string,
            classId: item.classId,
            teacherId: item.teacherId,
          },
        });
      }
    });

    revalidatePath("/admin/master/mapel");
    return {
      success: true,
      message: "Mata pelajaran & jadwal berhasil disimpan!",
    };
  } catch (error) {
    console.error("CREATE_SUBJECT_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat menyimpan data!",
    };
  }
}

export async function updateSubject(formData: FormData) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const religionId = (formData.get("religionId") as string) || null;
  const assignmentsRaw = formData.get("assignments") as string;

  if (!id || !name || !assignmentsRaw) {
    return { success: false, message: "Data tidak lengkap!" };
  }

  try {
    const assignments: AssignmentPayload[] = JSON.parse(assignmentsRaw);

    const existingSubject = await prisma.subject.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });

    if (existingSubject && existingSubject.id !== id) {
      return { success: false, message: "Nama mata pelajaran sudah dipakai!" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.subject.update({
        where: { id },
        data: {
          name: name.trim(),
          religionId,
        },
      });

      await tx.subjectAssignment.deleteMany({
        where: { subjectId: id },
      });

      if (assignments.length > 0) {
        await tx.subjectAssignment.createMany({
          data: assignments.map((item) => ({
            subjectId: id,
            classId: item.classId,
            teacherId: item.teacherId,
          })),
        });
      }
    });

    revalidatePath("/admin/master/mapel");
    return { success: true, message: "Mata pelajaran berhasil diperbarui!" };
  } catch (error) {
    console.error("UPDATE_SUBJECT_ERROR:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat memperbarui data!",
    };
  }
}

export async function deleteSubject(id: string) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  try {
    await prisma.subject.delete({
      where: { id },
    });

    revalidatePath("/admin/master/mapel");
    return { success: true, message: "Mata pelajaran berhasil dihapus!" };
  } catch (error) {
    console.error("DELETE_SUBJECT_ERROR:", error);
    return { success: false, message: "Gagal menghapus mata pelajaran!" };
  }
}
