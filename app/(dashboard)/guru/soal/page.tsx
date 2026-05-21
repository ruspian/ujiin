import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import SubjectCard from "@/components/layout/SubjectCard";

export default async function TeacherBankSoalPage() {
  const session = await auth();

  if (!session || session.user.role !== "GURU") {
    redirect("/login");
  }

  const guruId = session.user.id;

  const rawSubjects = await prisma.subject.findMany({
    where: {
      assignments: {
        some: { teacherId: guruId },
      },
    },
    include: {
      assignments: {
        where: { teacherId: guruId },
        include: {
          class: true,
        },
      },
      _count: {
        select: {
          questions: {
            where: { authorId: guruId },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const examTypes = await prisma.examType.findMany({
    orderBy: { name: "asc" },
  });

  const subjects = rawSubjects.map((subject) => {
    const classes = subject.assignments
      .map((a) => a.class)
      .sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
      });

    return {
      id: subject.id,
      name: subject.name,
      _count: subject._count,
      classes: classes,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soal Saya</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Kelola kumpulan pertanyaan untuk ujian berdasarkan mata pelajaran
            yang Anda ampu.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.length > 0 ? (
          subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subjectId={subject.id}
              subjectName={subject.name}
              questionCount={subject._count.questions}
              examTypes={examTypes}
              classes={subject.classes}
            />
          ))
        ) : (
          <div className="col-span-full bg-white p-10 rounded-2xl border border-gray-200 text-center flex flex-col items-center justify-center">
            <BookOpen size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-900">
              Belum Ada Mata Pelajaran
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Anda belum ditugaskan ke mata pelajaran apapun. Silakan hubungi
              Administrator untuk mengatur jadwal mengajar Anda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
