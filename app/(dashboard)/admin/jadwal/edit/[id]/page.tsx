import JadwalForm from "@/components/layout/JadwalForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function EditJadwalAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const resolvedParams = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: resolvedParams.id },
    include: {
      classes: { select: { id: true } },
      questions: { select: { id: true } },
    },
  });

  if (!exam) return <div>Data Jadwal Ujian tidak ditemukan.</div>;

  const [subjects, classes, examTypes, academicYears] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.class.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }] }),
    prisma.examType.findMany({ orderBy: { name: "asc" } }),
    prisma.academicYear.findMany({ orderBy: { year: "desc" } }),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Jadwal Ujian</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ubah informasi, peserta, atau paket soal untuk ujian ini.
        </p>
      </div>

      <JadwalForm
        subjects={subjects}
        classes={classes}
        examTypes={examTypes}
        academicYears={academicYears}
        initialData={exam}
      />
    </div>
  );
}
