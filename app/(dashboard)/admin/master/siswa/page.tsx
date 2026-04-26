import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Siswa from "@/components/layout/Siswa";

export default async function DataSiswaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;

  const search = params.search || "";
  const limit = 10;
  const page = Math.max(1, Number(params?.page) || 1);

  const whereCondition: Prisma.StudentWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { nisn: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [students, totalCount, classes] = await Promise.all([
    prisma.student.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        class: true,
      },
    }),
    prisma.student.count({ where: whereCondition }),
    prisma.class.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
      select: { id: true, name: true, level: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const formattedStudents = students.map((s) => ({
    id: s.id,
    nisn: s.nisn,
    name: s.name,
    className: s.class.name,
    classId: s.class.id,
  }));

  return (
    <Siswa
      students={formattedStudents}
      classes={classes}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}
