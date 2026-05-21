import KenaikanKelasClient from "@/components/layout/KenaikanKelasClient";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function KenaikanKelasPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  // Ambil semua kelas untuk drop-down
  const classes = await prisma.class.findMany({
    orderBy: [{ level: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      level: true,
    },
  });

  const allStudents = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      nisn: true,
      classId: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Kelola Kenaikan Kelas & Kelulusan
        </h1>
        <p className="text-gray-500 text-sm font-medium">
          Proses transisi massal siswa antar tingkat kelas atau kelulusan
          alumni.
        </p>
      </div>

      <KenaikanKelasClient classes={classes} allStudents={allStudents} />
    </div>
  );
}
