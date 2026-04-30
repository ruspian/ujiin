import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import JenisUjian from "@/components/layout/JenisUjian";

export default async function JenisUjianPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;

  const search = params.search || "";
  const limit = 10;
  const page = Math.max(1, Number(params?.page) || 1);

  const whereCondition: Prisma.ExamTypeWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [examTypes, totalCount] = await Promise.all([
    prisma.examType.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.examType.count({ where: whereCondition }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <JenisUjian
      examTypes={examTypes}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}
