// src/app/(dashboard)/admin/master/kelas/page.tsx
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
// Nanti kita bikin komponen Client-nya
import Kelas from "@/components/layout/Kelas";

export default async function DataKelasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;

  const search = params.search || "";
  const limit = 10;
  const page = Math.max(1, Number(params?.page) || 1);

  const whereCondition: Prisma.ClassWhereInput = search
    ? {
        name: { contains: search, mode: "insensitive" },
      }
    : {};

  const [classes, totalCount] = await Promise.all([
    prisma.class.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ level: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { students: true },
        },
      },
    }),
    prisma.class.count({ where: whereCondition }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const formattedClasses = classes.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    studentCount: c._count.students,
  }));

  return (
    <Kelas
      classes={formattedClasses}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}
