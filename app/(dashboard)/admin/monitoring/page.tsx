import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import MonitoringList from "@/components/layout/MonitoringList";

export default async function MonitoringIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;

  const search = params.search || "";
  const limit = 10;
  const page = Math.max(1, Number(params?.page) || 1);

  const whereCondition: Prisma.ExamWhereInput = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { subject: { name: { contains: search, mode: "insensitive" } } },
        ],
      }
    : {};

  const [exams, totalCount] = await Promise.all([
    prisma.exam.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startTime: "desc" },
      include: {
        subject: true,
        examType: true,
        classes: true,
        _count: {
          select: { attempts: true },
        },
      },
    }),
    prisma.exam.count({ where: whereCondition }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const mappedExams = exams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    subjectName: exam.subject.name,
    examTypeCode: exam.examType.code,
    startTime: exam.startTime,
    endTime: exam.endTime,
    status: exam.status,
    classesCount: exam.classes.length,
    attemptsCount: exam._count.attempts,
  }));

  return (
    <MonitoringList
      exams={mappedExams}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}
