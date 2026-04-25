import Pengguna from "@/components/layout/Pengguna";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export default async function DataPenggunaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;

  const search = params.search || "";
  const limit = 10;
  const page = Math.max(1, Number(params?.page) || 1);

  const whereCondition: Prisma.UserWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          {
            username: { contains: search, mode: "insensitive" },
          },
        ],
      }
    : {};

  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
      },
    }),
    prisma.user.count({ where: whereCondition }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  return (
    <Pengguna
      users={users}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}
