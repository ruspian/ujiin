import { prisma } from "@/lib/prisma";
import { canTeacherAccessAttempt } from "@/lib/teacher-access";
import { fail, json, type StaffUser } from "@/lib/api-v1";

/** Data pendukung untuk form di aplikasi desktop (pilihan dropdown, data yang diedit). */

/** Pilihan umum: mapel, jenis ujian, tahun ajaran, kelas, agama (+ guru untuk admin). */
export async function optionsList(user: StaffUser) {
  const [subjects, examTypes, academicYears, classes, religions, teachers] =
    await Promise.all([
      prisma.subject.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.examType.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      prisma.academicYear.findMany({
        orderBy: [{ active: "desc" }, { year: "desc" }],
        select: { id: true, year: true, semester: true, active: true },
      }),
      prisma.class.findMany({
        orderBy: [{ level: "asc" }, { name: "asc" }],
        select: { id: true, name: true, level: true },
      }),
      prisma.religion.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      user.role === "ADMIN"
        ? prisma.user.findMany({
            where: { role: "GURU" },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);
  return json({ subjects, examTypes, academicYears, classes, religions, teachers });
}

/** Form buat soal: kelas yang diampu guru pada mapel ini + jenis ujian. */
export async function soalForm(user: StaffUser, subjectId: string) {
  if (user.role !== "GURU") return fail("Hanya guru yang dapat membuat soal.", 403);
  const [subject, assignments, examTypes] = await Promise.all([
    prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, name: true } }),
    prisma.subjectAssignment.findMany({
      where: { teacherId: user.id, subjectId },
      select: { class: { select: { id: true, name: true } } },
    }),
    prisma.examType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);
  if (!subject) return fail("Mapel tidak ditemukan.", 404);
  return json({
    subject,
    classes: assignments.map((a) => a.class),
    examTypes,
  });
}

/** Satu soal milik guru yang login (untuk diubah). */
export async function soalItem(user: StaffUser, id: string) {
  if (user.role !== "GURU") return fail("Hanya guru yang dapat mengubah soal.", 403);
  const q = await prisma.question.findUnique({
    where: { id },
    include: { classes: { select: { classId: true } } },
  });
  if (!q || q.authorId !== user.id) return fail("Soal tidak ditemukan.", 404);
  return json({
    id: q.id,
    subjectId: q.subjectId,
    typeId: q.examTypeId,
    type: q.type,
    text: q.text,
    score: q.score,
    options: q.options,
    correctAnswer: q.correctAnswer,
    classIds: q.classes.map((c) => c.classId),
  });
}

/** Satu jadwal (admin) untuk form ubah. */
export async function jadwalItem(id: string) {
  const e = await prisma.exam.findUnique({
    where: { id },
    include: { classes: { select: { id: true } } },
  });
  if (!e) return fail("Jadwal tidak ditemukan.", 404);
  return json({
    id: e.id,
    title: e.title,
    subjectId: e.subjectId,
    examTypeId: e.examTypeId,
    academicYearId: e.academicYearId,
    startTime: e.startTime,
    endTime: e.endTime,
    duration: e.duration,
    randomizeQuestions: e.randomizeQuestions,
    shuffleOptions: e.shuffleOptions,
    showResult: e.showResult,
    status: e.status,
    supervisorId: e.supervisorId,
    classIds: e.classes.map((c) => c.id),
  });
}

/** Jawaban satu siswa + soal-soalnya, untuk koreksi esai (guru terkait saja). */
export async function attemptDetail(user: StaffUser, attemptId: string) {
  if (user.role !== "GURU") return fail("Koreksi hanya untuk guru.", 403);
  const a = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      student: {
        select: { name: true, nisn: true, classId: true, class: { select: { name: true } } },
      },
      exam: {
        include: {
          questions: {
            select: { id: true, text: true, type: true, score: true, options: true, correctAnswer: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!a) return fail("Pengerjaan tidak ditemukan.", 404);
  if (!(await canTeacherAccessAttempt(user.id, a.exam, a.student.classId))) {
    return fail("Akses ditolak!", 403);
  }
  return json({
    id: a.id,
    status: a.status,
    score: a.score,
    answers: a.answers,
    essayScores: a.essayScores,
    student: { name: a.student.name, nisn: a.student.nisn, className: a.student.class.name },
    exam: { id: a.exam.id, title: a.exam.title, subjectId: a.exam.subjectId },
    questions: a.exam.questions,
  });
}

/** Siswa aktif + kelas untuk layar kenaikan kelas. */
export async function kenaikanData() {
  const [classes, students] = await Promise.all([
    prisma.class.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
      select: { id: true, name: true, level: true },
    }),
    prisma.student.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nisn: true, classId: true },
      take: 10000,
    }),
  ]);
  return json({ classes, students });
}
