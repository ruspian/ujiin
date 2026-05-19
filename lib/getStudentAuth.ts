import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getStudentAuth() {
  const cookieStore = await cookies();

  const studentId = cookieStore.get("student_id")?.value;

  if (!studentId) return null;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true, religion: true },
  });

  return student;
}
