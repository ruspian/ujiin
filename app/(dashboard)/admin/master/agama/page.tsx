import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Agama from "@/components/layout/Agama";

export default async function AgamaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;

  const search = params.search || "";
  const limit = 10;
  const page = Math.max(1, Number(params?.page) || 1);

  const whereCondition: Prisma.ReligionWhereInput = search
    ? {
        name: { contains: search, mode: "insensitive" },
      }
    : {};

  const [religions, totalCount] = await Promise.all([
    prisma.religion.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.religion.count({ where: whereCondition }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <Agama
      religions={religions}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}
