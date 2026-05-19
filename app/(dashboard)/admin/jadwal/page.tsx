import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import JadwalUjian from "@/components/layout/JadwalUjian";

export default async function JadwalUjianPage({
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

  const [exams, totalCount, subjects, examTypes, classes, academicYears] =
    await Promise.all([
      prisma.exam.findMany({
        where: whereCondition,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subject: true,
          examType: true,
          academicYear: true,
          classes: true,
          supervisor: true,
          _count: {
            select: { questions: true, attempts: true },
          },
        },
      }),
      prisma.exam.count({ where: whereCondition }),

      prisma.subject.findMany({ orderBy: { name: "asc" } }),
      prisma.examType.findMany({ orderBy: { name: "asc" } }),
      prisma.class.findMany({ orderBy: { name: "asc" } }),
      prisma.academicYear.findMany({ orderBy: { year: "desc" } }),
    ]);

  const totalPages = Math.ceil(totalCount / limit);

  const mappedExams = exams.map((exam) => ({
    ...exam,

    academicYear: {
      id: exam.academicYear.id,
      name: `${exam.academicYear.year} - ${exam.academicYear.semester}`,
    },
    classes: exam.classes.map((c) => ({ id: c.id, name: c.name })),
  }));

  const mappedAcademicYears = academicYears.map((ay) => ({
    id: ay.id,
    name: `${ay.year} - ${ay.semester}`,
  }));

  return (
    <JadwalUjian
      exams={mappedExams}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={page}
      subjects={subjects}
      examTypes={examTypes}
      classes={classes}
      academicYears={mappedAcademicYears}
    />
  );
}
