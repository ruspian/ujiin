import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Calculator, FileSpreadsheet, Filter } from "lucide-react";
import FilterRekap from "@/components/layout/FilterRekap";
import { PageProps } from "@/types/rekap-nilai";
import ExportNilaiExcel from "@/components/layout/ExportNilaiExcel";

export default async function RekapNilaiPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { yearId, subjectId, classId } = await searchParams;

  const [academicYears, subjects] = await Promise.all([
    prisma.academicYear.findMany({ orderBy: { year: "desc" } }),
    prisma.subject.findMany({
      where: {
        assignments: {
          some: { teacherId: session.user.id },
        },
      },
      include: {
        assignments: {
          where: { teacherId: session.user.id },
          include: { class: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const safeAcademicYears = academicYears.map((ay) => ({
    id: ay.id,
    year: ay.year,
    semester: ay.semester,
    active: ay.active,
  }));

  const safeSubjects = subjects.map((sub) => {
    const uniqueClasses = Array.from(
      new Map(sub.assignments.map((a) => [a.class.id, a.class])).values(),
    );

    return {
      id: sub.id,
      name: sub.name,
      classes: uniqueClasses.map((c) => ({ id: c.id, name: c.name })),
    };
  });

  let students: { id: string; name: string; nisn: string }[] = [];
  let exams: { id: string; title: string; examType: { name: string } }[] = [];
  const attemptsMap: Record<string, number | null> = {};

  if (yearId && subjectId && classId) {
    [students, exams] = await Promise.all([
      prisma.student.findMany({
        where: { classId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, nisn: true },
      }),
      prisma.exam.findMany({
        where: {
          academicYearId: yearId,
          subjectId,
          classes: { some: { id: classId } },
          status: "COMPLETED",
          authorId: session.user.id,
        },
        include: { examType: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (exams.length > 0 && students.length > 0) {
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
  }

  const selectedSubject = safeSubjects.find((s) => s.id === subjectId);
  const availableClasses = selectedSubject?.classes || [];
  const selectedClassName =
    availableClasses.find((c) => c.id === classId)?.name || "Kelas";
  const selectedYearObj = academicYears.find((y) => y.id === yearId);
  const academicYearLabel = selectedYearObj
    ? `${selectedYearObj.year} - ${selectedYearObj.semester}`
    : "Tahun Ajaran";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Rekapitulasi Nilai
        </h1>
        <p className="text-gray-500 text-sm font-medium">
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
            <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-emerald-600" /> Tabel
              Nilai
            </h2>
            <ExportNilaiExcel
              students={students}
              exams={exams}
              attemptsMap={attemptsMap}
              subjectName={selectedSubject?.name || "Mapel"}
              className={selectedClassName}
              academicYear={academicYearLabel}
            />
          </div>

          {exams.length === 0 ? (
            <div className="p-16 text-center">
              <Calculator size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-bold">
                Belum ada data ujian untuk filter ini.
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Pastikan ada ujian dengan status &quot;COMPLETED&quot;.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-4 text-xs font-black text-gray-500 uppercase tracking-widest sticky left-0 bg-gray-50 z-10 border-r w-12 text-center shadow-[1px_0_0_0_#e5e7eb]">
                      No
                    </th>
                    <th className="px-4 py-4 text-xs font-black text-gray-500 uppercase tracking-widest sticky left-12 bg-gray-50 z-10 border-r min-w-50 shadow-[1px_0_0_0_#e5e7eb]">
                      Nama Siswa
                    </th>
                    {exams.map((exam) => (
                      <th
                        key={exam.id}
                        className="px-4 py-3 text-xs font-bold text-center border-r min-w-32 bg-white"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-black uppercase text-blue-600 tracking-wider">
                            {exam.examType.name}
                          </span>
                          <span className="truncate text-gray-700">
                            {exam.title}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-4 text-xs font-black text-emerald-700 uppercase tracking-widest text-center bg-emerald-50 border-l border-emerald-100">
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
                        className="group hover:bg-blue-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-gray-400 text-center border-r sticky left-0 bg-white group-hover:bg-blue-50 transition-colors shadow-[1px_0_0_0_#e5e7eb]">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 border-r sticky left-12 bg-white group-hover:bg-blue-50 transition-colors shadow-[1px_0_0_0_#e5e7eb]">
                          <p className="font-bold text-sm text-gray-900">
                            {student.name}
                          </p>
                          <p className="text-[10px] font-medium text-gray-400">
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
                              className={`px-4 py-3 text-sm font-black text-center border-r ${score != null && score < 75 ? "text-red-500 bg-red-50/30" : "text-gray-700"}`}
                            >
                              {score ?? (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-sm font-black text-center bg-emerald-50/30 group-hover:bg-emerald-100/50 text-emerald-700 border-l border-emerald-100 transition-colors">
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
        <div className="p-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center text-center">
          <Filter size={48} className="text-gray-300 mb-4" />
          <h3 className="font-black text-gray-700 text-lg">
            Filter Belum Lengkap
          </h3>
          <p className="text-sm font-medium text-gray-500 mt-1 max-w-sm">
            Silakan pilih Tahun Ajaran, Mata Pelajaran, dan Kelas untuk
            menampilkan rekapitulasi nilai.
          </p>
        </div>
      )}
    </div>
  );
}
