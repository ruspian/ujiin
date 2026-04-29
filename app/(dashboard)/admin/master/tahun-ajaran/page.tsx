// src/app/(dashboard)/admin/master/tahun-ajaran/page.tsx
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import TahunAjaran from "@/components/layout/TahunAjaran";

export default async function TahunAjaranPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;

  const search = params.search || "";
  const limit = 10;
  const page = Math.max(1, Number(params?.page) || 1);

  const whereCondition: Prisma.AcademicYearWhereInput = search
    ? {
        year: { contains: search, mode: "insensitive" },
      }
    : {};

  const [academicYears, totalCount] = await Promise.all([
    prisma.academicYear.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ year: "desc" }, { semester: "desc" }],
    }),
    prisma.academicYear.count({ where: whereCondition }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <TahunAjaran
      academicYears={academicYears}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}
