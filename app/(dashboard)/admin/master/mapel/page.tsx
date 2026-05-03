import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import MataPelajaran from "@/components/layout/MataPelajaran";

export default async function DataMapelPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;

  const search = params.search || "";
  const limit = 10;
  const page = Math.max(1, Number(params?.page) || 1);

  const whereCondition: Prisma.SubjectWhereInput = search
    ? { name: { contains: search, mode: "insensitive" } }
    : {};

  const [subjects, totalCount, teachers, allClasses] = await Promise.all([
    prisma.subject.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        teachers: { select: { id: true, name: true } },
        classes: { select: { id: true, name: true } },
      },
    }),
    prisma.subject.count({ where: whereCondition }),
    prisma.user.findMany({
      where: { role: "GURU" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: [{ level: "asc" }, { name: "asc" }],
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const formattedSubjects = subjects.map((sub) => ({
    id: sub.id,
    name: sub.name,
    teachers: sub.teachers,
    classes: sub.classes,
  }));

  return (
    <MataPelajaran
      subjects={formattedSubjects}
      teachers={teachers}
      classes={allClasses}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}
