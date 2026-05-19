import JadwalForm from "@/components/layout/JadwalForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function BuatJadwalAdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [subjects, classes, examTypes, academicYears, teachers] =
    await Promise.all([
      prisma.subject.findMany({ orderBy: { name: "asc" } }),
      prisma.class.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }] }),
      prisma.examType.findMany({ orderBy: { name: "asc" } }),
      prisma.academicYear.findMany({ orderBy: { year: "desc" } }),
      await prisma.user.findMany({
        where: { role: "GURU" },
        select: { id: true, name: true },
      }),
    ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Buat Jadwal Ujian Baru
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Atur jadwal ujian, tentukan peserta kelas, dan pilih paket soal yang
          akan diujikan.
        </p>
      </div>

      <JadwalForm
        subjects={subjects}
        classes={classes}
        examTypes={examTypes}
        academicYears={academicYears}
        teachers={teachers}
      />
    </div>
  );
}
