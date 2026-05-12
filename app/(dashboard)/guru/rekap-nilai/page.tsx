import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Sesuaikan path auth lu
import { redirect } from "next/navigation";
import { Calculator, FileSpreadsheet, Filter } from "lucide-react";
import FilterRekap from "@/components/layout/FilterRekap";
import { PageProps } from "@/types/rekap-nilai";
import ExportNilaiExcel from "@/components/layout/ExportNilaiExcel";

export default async function RekapNilaiPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { yearId, subjectId, classId } = await searchParams;

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { year: "desc" },
  });
  const subjects = await prisma.subject.findMany({
    where: { teachers: { some: { id: session.user.id } } },
    include: { classes: true },
  });

  const safeAcademicYears = academicYears.map((ay) => ({
    id: ay.id,
    year: ay.year,
    semester: ay.semester,
    active: ay.active,
  }));
  const safeSubjects = subjects.map((sub) => ({
    id: sub.id,
    name: sub.name,
    classes: sub.classes.map((c) => ({ id: c.id, name: c.name })),
  }));

  let students: { id: string; name: string; nisn: string }[] = [];
  let exams: { id: string; title: string; examType: { name: string } }[] = [];
  const attemptsMap: Record<string, number | null> = {};

  if (yearId && subjectId && classId) {
    students = await prisma.student.findMany({
      where: { classId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nisn: true },
    });

    exams = await prisma.exam.findMany({
      where: {
        academicYearId: yearId,
        subjectId,
        classes: { some: { id: classId } },
        status: "COMPLETED",
      },
      include: { examType: true },
      orderBy: { createdAt: "asc" },
    });

    const attempts = await prisma.attempt.findMany({
      where: {
        examId: { in: exams.map((e) => e.id) },
        studentId: { in: students.map((s) => s.id) },
        status: "SUBMITTED",
      },
      select: { studentId: true, examId: true, score: true },
    });

    attempts.forEach((a) => {
      attemptsMap[`${a.studentId}_${a.examId}`] = a.score;
    });
  }

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const availableClasses = selectedSubject?.classes || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rekapitulasi Nilai</h1>
        <p className="text-gray-500 text-sm">
          Matriks nilai siswa berdasarkan filter aktif.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <FilterRekap
          academicYears={safeAcademicYears}
          subjects={safeSubjects}
        />
      </div>

      {yearId && subjectId && classId ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-emerald-600" /> Tabel
              Nilai
            </h2>
            <ExportNilaiExcel
              students={students}
              exams={exams}
              attemptsMap={attemptsMap}
              subjectName={selectedSubject?.name || "Mapel"}
              className={
                availableClasses.find((c) => c.id === classId)?.name || "Kelas"
              }
              academicYear={
                academicYears.find((y) => y.id === yearId)
                  ? `${academicYears.find((y) => y.id === yearId)?.year} - ${
                      academicYears.find((y) => y.id === yearId)?.semester
                    }`
                  : "Tahun Ajaran"
              }
            />
          </div>

          {exams.length === 0 ? (
            <div className="p-12 text-center">
              <Calculator size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                Belum ada data ujian untuk filter ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-xs font-black text-gray-500 sticky left-0 bg-gray-50 z-10 border-r w-10 text-center">
                      No
                    </th>
                    <th className="px-4 py-3 text-xs font-black text-gray-500 sticky left-10 bg-gray-50 z-10 border-r min-w-50">
                      Nama Siswa
                    </th>
                    {exams.map((exam) => (
                      <th
                        key={exam.id}
                        className="px-4 py-3 text-xs font-bold text-center border-r min-w-30"
                      >
                        <div className="flex flex-col uppercase">
                          <span className="text-[9px] text-blue-600">
                            {exam.examType.name}
                          </span>
                          <span className="truncate">{exam.title}</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-black text-emerald-600 text-center bg-emerald-50">
                      Rata-Rata
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student, idx) => {
                    let total = 0,
                      count = 0;
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-blue-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-center border-r sticky left-0 bg-white">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 border-r sticky left-10 bg-white">
                          <p className="font-bold text-sm">{student.name}</p>
                          <p className="text-[10px] text-gray-400">
                            NISN: {student.nisn}
                          </p>
                        </td>
                        {exams.map((exam) => {
                          const score = attemptsMap[`${student.id}_${exam.id}`];
                          if (score != null) {
                            total += score;
                            count++;
                          }
                          return (
                            <td
                              key={exam.id}
                              className={`px-4 py-3 text-sm font-semibold text-center border-r ${score != null && score < 75 ? "text-red-500" : "text-gray-800"}`}
                            >
                              {score ?? "-"}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-sm font-black text-center bg-emerald-50/30 text-emerald-700">
                          {count > 0 ? (total / count).toFixed(1) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 bg-gray-50 rounded-2xl border-2 border-dashed flex flex-col items-center text-center">
          <Filter size={48} className="text-gray-300 mb-4" />
          <h3 className="font-bold text-gray-700">Filter Belum Lengkap</h3>
          <p className="text-sm text-gray-500">
            Silakan pilih Tahun Ajaran, Mapel, dan Kelas.
          </p>
        </div>
      )}
    </div>
  );
}
