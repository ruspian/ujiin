import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BookOpen, CalendarX, User } from "lucide-react";
import { AttemptStatus } from "@prisma/client";
import { getStudentAuth } from "@/lib/getStudentAuth";
import ClientFormToken from "@/components/layout/ClientFormToken";

export default async function StudentPortal() {
  const student = await getStudentAuth();

  if (!student) {
    redirect("/login-siswa");
  }

  const now = new Date();

  console.log("=== DEBUGGING UJIAN ===");
  console.log("Waktu Server (now):", now);
  console.log("ID Kelas Siswa:", student.classId);
  console.log("ID Agama Siswa:", student.religionId);
  // Tarik ujian tanpa filter status dan waktu buat ngecek wujud aslinya
  const checkExam = await prisma.exam.findFirst({
    where: { classes: { some: { id: student.classId } } },
    include: { subject: true },
  });
  console.log("Waktu Mulai di DB:", checkExam?.startTime);
  console.log("Waktu Berakhir di DB:", checkExam?.endTime);
  console.log("Status Ujian di DB:", checkExam?.status);
  console.log("Agama Mapel di DB:", checkExam?.subject?.religionId);
  console.log("=======================");

  const activeExam = await prisma.exam.findFirst({
    where: {
      status: "PUBLISHED",
      classes: { some: { id: student.classId } },
      startTime: { lte: now },
      endTime: { gte: now },

      OR: [
        { subject: { religionId: null } },
        { subject: { religionId: student.religionId } },
      ],
    },
    include: {
      subject: true,
      examType: true,
    },
    orderBy: { startTime: "asc" },
  });

  if (!activeExam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="flex flex-col items-center text-center p-8 bg-white rounded-3xl shadow-xl ring-1 ring-gray-100 max-w-md">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 ring-8 ring-gray-50">
            <CalendarX size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Belum Ada Ujian
          </h2>
          <p className="text-sm text-gray-500">
            Saat ini tidak ada jadwal ujian yang aktif untuk kelas{" "}
            <span className="font-bold text-gray-700">
              {student.class.name}
            </span>
            .
          </p>
        </div>
      </div>
    );
  }

  const attempt = await prisma.attempt.findUnique({
    where: {
      studentId_examId: {
        studentId: student.id,
        examId: activeExam.id,
      },
    },
  });

  if (attempt?.status === AttemptStatus.SUBMITTED) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="flex flex-col items-center text-center p-8 bg-white rounded-3xl shadow-xl ring-1 ring-gray-100 max-w-md">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
            <BookOpen size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ujian Selesai!
          </h2>
          <p className="text-sm text-gray-500">
            Anda telah menyelesaikan ujian{" "}
            <span className="font-bold text-gray-700">
              {activeExam.subject.name}
            </span>
            . Silakan istirahat atau tunggu arahan pengawas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
          <BookOpen size={24} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Uji<span className="text-teal-600">in</span>
        </h1>
      </div>

      <div className="w-full max-w-md mb-4 flex items-center gap-3 rounded-2xl bg-white p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
          <User size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-800">{student.name}</h4>
          <p className="text-xs font-semibold text-gray-500">
            {student.class.name} • {student.nisn}
          </p>
        </div>
      </div>

      <ClientFormToken
        examId={activeExam.id}
        studentId={student.id}
        subjectName={activeExam.subject.name}
        examTypeName={activeExam.examType.name}
      />
    </div>
  );
}
