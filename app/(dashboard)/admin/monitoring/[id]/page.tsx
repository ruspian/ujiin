import Monitoring from "@/components/layout/Monitoring";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function MonitoringDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const examId = resolvedParams.id;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      subject: true,
      classes: {
        include: {
          students: {
            orderBy: { name: "asc" },
          },
        },
      },
      attempts: true,
    },
  });

  if (!exam) return notFound();

  const allStudents = exam.classes.flatMap((c) =>
    c.students.map((student) => {
      // cek siswa udah mulai ujian atau belum
      const attempt = exam.attempts.find((a) => a.studentId === student.id);

      return {
        id: student.id,
        nisn: student.nisn,
        name: student.name,
        className: c.name,
        hasStarted: !!attempt,
        status: attempt?.status || "BELUM",
        score: attempt?.score || null,
        startTime: attempt?.startTime || null,
      };
    }),
  );

  return (
    <Monitoring
      examId={exam.id}
      examTitle={exam.title}
      subjectName={exam.subject.name}
      studentsData={allStudents}
    />
  );
}
