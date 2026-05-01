import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Monitoring from "@/components/layout/Monitoring";
import { ViolationLog } from "@/types/monitoring";

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
      const attempt = exam.attempts.find((a) => a.studentId === student.id);

      let parsedLogs: ViolationLog[] = [];

      if (attempt?.violationLogs) {
        parsedLogs = Array.isArray(attempt.violationLogs)
          ? (attempt.violationLogs as unknown as ViolationLog[])
          : [];
      }

      return {
        id: student.id,
        nisn: student.nisn,
        name: student.name,
        className: c.name,
        hasStarted: !!attempt,
        status: attempt?.status || "BELUM",
        score: attempt?.score || null,
        startTime: attempt?.startTime || null,
        violationCount: attempt?.violationCount || 0,
        violationLogs: parsedLogs,
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
