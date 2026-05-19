import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MonitoringList from "@/components/layout/MonitoringList";

export default async function DaftarMonitoringPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "GURU") redirect("/login");

  const supervisedExams = await prisma.exam.findMany({
    where: {
      supervisorId: session.user.id,
      status: { not: "COMPLETED" },
    },
    include: {
      subject: true,
      classes: true,
      examType: true,
      supervisor: { select: { name: true } },
      academicYear: { select: { year: true, semester: true } },
      _count: {
        select: { attempts: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Jadwal Pengawasan</h1>
        <p className="text-gray-500 text-sm">
          Daftar kelas yang harus Anda awasi. Generate token dan mulai
          monitoring saat Anda masuk kelas.
        </p>
      </div>

      <MonitoringList exams={supervisedExams} />
    </div>
  );
}
