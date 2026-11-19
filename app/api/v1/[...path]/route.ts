import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { finalizeExpiredAttempts } from "@/lib/finalize-attempts";
import { fail, json, requireStaff, yearRange, type StaffUser } from "@/lib/api-v1";
import * as forms from "@/lib/api-v1-forms";

export const dynamic = "force-dynamic";

const OFFLINE_AFTER_MS = 45_000;
const PAGE_SIZE = 50;

type Ctx = { user: StaffUser; segs: string[]; q: URLSearchParams };

/** Siapa saja yang boleh memantau/mengelola ujian ini (pembuat/pengawas, atau admin). */
const examScope = (u: StaffUser): Prisma.ExamWhereInput =>
  u.role === "ADMIN" ? {} : { OR: [{ supervisorId: u.id }, { authorId: u.id }] };

/** `yearId` kosong = tahun ajaran aktif, "all" = semua. Mengembalikan data tahunnya (atau null = tanpa filter). */
async function pickYear(q: URLSearchParams) {
  const yid = q.get("yearId");
  if (yid === "all") return null;
  return prisma.academicYear.findFirst({
    where: yid ? { id: yid } : { active: true },
    select: { id: true, year: true, semester: true },
  });
}

async function me({ user }: Ctx) {
  return json(user);
}

async function dashboard({ user }: Ctx) {
  const [siswa, kelas, mapel, ujianAktif, soal, diawasi, guru] =
    await Promise.all([
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.class.count(),
      prisma.subject.count(),
      prisma.exam.count({ where: { status: "PUBLISHED", ...examScope(user) } }),
      prisma.question.count({
        where: user.role === "ADMIN" ? {} : { authorId: user.id },
      }),
      prisma.exam.count({
        where: { supervisorId: user.id, status: { not: "COMPLETED" } },
      }),
      prisma.user.count({ where: { role: "GURU" } }),
    ]);
  return json({
    role: user.role,
    siswaAktif: siswa,
    kelas,
    mapel,
    ujianAktif,
    soalSaya: soal,
    ujianDiawasi: diawasi,
    guru: user.role === "ADMIN" ? guru : null,
  });
}

async function monitoringList({ user }: Ctx) {
  const exams = await prisma.exam.findMany({
    where: {
      status: { not: "COMPLETED" },
      ...(user.role === "ADMIN" ? {} : { supervisorId: user.id }),
    },
    include: {
      subject: { select: { name: true } },
      examType: { select: { name: true } },
      classes: { select: { name: true } },
      supervisor: { select: { name: true } },
      _count: { select: { attempts: true } },
    },
    orderBy: { startTime: "asc" },
    take: 200,
  });
  return json(
    exams.map((e) => ({
      id: e.id,
      title: e.title,
      subject: e.subject.name,
      examType: e.examType.name,
      classes: e.classes.map((c) => c.name),
      supervisor: e.supervisor?.name ?? null,
      startTime: e.startTime,
      endTime: e.endTime,
      duration: e.duration,
      status: e.status,
      token: e.token,
      attempts: e._count.attempts,
    })),
  );
}

async function monitoringDetail({ user, segs }: Ctx) {
  const id = segs[1];
  await finalizeExpiredAttempts({ examIds: [id] });
  const exam = await prisma.exam.findFirst({
    where: {
      id,
      ...(user.role === "ADMIN"
        ? {}
        : { OR: [{ supervisorId: user.id }, { authorId: user.id }] }),
    },
    include: {
      subject: { select: { name: true } },
      attempts: true,
      classes: {
        include: {
          students: {
            where: {
              OR: [{ status: "ACTIVE" }, { attempts: { some: { examId: id } } }],
            },
            orderBy: { name: "asc" },
          },
        },
      },
    },
  });
  if (!exam) return fail("Ujian tidak ditemukan / bukan akses Anda.", 404);

  const now = Date.now();
  const rows = exam.classes
    .flatMap((c) => c.students.map((s) => ({ s, className: c.name })))
    .sort((a, b) => a.s.name.localeCompare(b.s.name))
    .map(({ s, className }) => {
      const a = exam.attempts.find((x) => x.studentId === s.id) ?? null;
      const ongoing = a?.status === "ONGOING";
      const last = a?.lastSeenAt?.getTime() ?? null;
      return {
        studentId: s.id,
        nisn: s.nisn,
        name: s.name,
        className,
        status: a?.status ?? "NOT_STARTED",
        violationCount: a?.violationCount ?? 0,
        score: a?.score ?? null,
        extraSeconds: a?.extraSeconds ?? 0,
        offline: ongoing && (last === null || now - last > OFFLINE_AFTER_MS),
        silentSeconds:
          ongoing && last !== null
            ? Math.max(0, Math.floor((now - last) / 1000))
            : null,
      };
    });

  return json({
    id: exam.id,
    title: exam.title,
    subject: exam.subject.name,
    status: exam.status,
    token: exam.token,
    startTime: exam.startTime,
    endTime: exam.endTime,
    duration: exam.duration,
    announcement: exam.announcement,
    rows,
  });
}

async function soalSubjects({ user, q }: Ctx) {
  const ay = await pickYear(q);
  const range = ay ? yearRange(ay.year) : null;
  const subjects = await prisma.subject.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : { assignments: { some: { teacherId: user.id } } },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          questions: range ? { where: { createdAt: range } } : true,
        },
      },
      assignments: {
        where: user.role === "ADMIN" ? {} : { teacherId: user.id },
        select: { class: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
  return json(
    subjects.map((s) => ({
      id: s.id,
      name: s.name,
      questionCount: s._count.questions,
      classes: s.assignments.map((a) => a.class),
    })),
  );
}

async function soalList({ user, segs, q }: Ctx) {
  const subjectId = segs[1];
  if (user.role === "GURU") {
    const ok = await prisma.subjectAssignment.findFirst({
      where: { subjectId, teacherId: user.id },
      select: { id: true },
    });
    if (!ok) return fail("Bukan mapel Anda.", 403);
  }
  const page = Math.max(1, Number(q.get("page")) || 1);
  const search = (q.get("q") ?? "").trim();
  const ay = await pickYear(q);
  const range = ay ? yearRange(ay.year) : null;
  const qType = q.get("type");
  const examTypeId = q.get("examTypeId");
  const classId = q.get("classId");
  const where: Prisma.QuestionWhereInput = {
    subjectId,
    ...(search ? { text: { contains: search, mode: "insensitive" } } : {}),
    ...(range ? { createdAt: range } : {}),
    ...(qType ? { type: qType as Prisma.QuestionWhereInput["type"] } : {}),
    ...(examTypeId ? { examTypeId } : {}),
    ...(classId ? { classes: { some: { classId } } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      select: {
        id: true,
        text: true,
        type: true,
        score: true,
        options: true,
        correctAnswer: true,
        examType: { select: { name: true } },
        author: { select: { name: true } },
        createdAt: true,
        classes: { select: { class: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return json({
    total,
    page,
    pageSize: PAGE_SIZE,
    year: ay?.year ?? null,
    items: items.map((i) => ({
      id: i.id,
      text: i.text,
      type: i.type,
      score: i.score,
      options: i.options,
      correctAnswer: i.correctAnswer,
      examType: i.examType?.name ?? null,
      author: i.author.name,
      createdAt: i.createdAt,
      classes: i.classes.map((c) => c.class.name),
    })),
  });
}

/** Ujian pada tahun ajaran aktif untuk dinilai/direkap. */
async function penilaianExams({ user, q }: Ctx) {
  const ay = await pickYear(q);
  const exams = await prisma.exam.findMany({
    where: {
      status: { in: ["PUBLISHED", "COMPLETED"] },
      ...(ay ? { academicYearId: ay.id } : {}),
      ...(user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { supervisorId: user.id },
              { authorId: user.id },
              {
                subject: { assignments: { some: { teacherId: user.id } } },
              },
            ],
          }),
    },
    select: {
      id: true,
      title: true,
      status: true,
      startTime: true,
      subject: { select: { name: true } },
      examType: { select: { name: true } },
      classes: { select: { name: true } },
      academicYear: { select: { year: true, semester: true } },
      _count: { select: { attempts: true } },
    },
    orderBy: { startTime: "desc" },
    take: 200,
  });
  return json(
    exams.map((e) => ({
      id: e.id,
      title: e.title,
      status: e.status,
      startTime: e.startTime,
      subject: e.subject.name,
      examType: e.examType.name,
      classes: e.classes.map((c) => c.name),
      attempts: e._count.attempts,
      year: `${e.academicYear.year} ${e.academicYear.semester}`,
    })),
  );
}

async function penilaianDetail({ user, segs }: Ctx) {
  const id = segs[1];
  const exam = await prisma.exam.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      authorId: true,
      supervisorId: true,
      subjectId: true,
      subject: { select: { name: true } },
      classes: { select: { id: true, name: true } },
    },
  });
  if (!exam) return fail("Ujian tidak ditemukan.", 404);
  if (user.role === "GURU") {
    const ok =
      exam.authorId === user.id ||
      exam.supervisorId === user.id ||
      !!(await prisma.subjectAssignment.findFirst({
        where: { subjectId: exam.subjectId, teacherId: user.id },
        select: { id: true },
      }));
    if (!ok) return fail("Akses ditolak.", 403);
  }
  const attempts = await prisma.attempt.findMany({
    where: { examId: id },
    select: {
      id: true,
      status: true,
      score: true,
      violationCount: true,
      startTime: true,
      endTime: true,
      student: {
        select: { nisn: true, name: true, class: { select: { name: true } } },
      },
    },
  });
  const rows = attempts
    .map((a) => ({
      attemptId: a.id,
      nisn: a.student.nisn,
      name: a.student.name,
      className: a.student.class?.name ?? "",
      status: a.status,
      score: a.score,
      violationCount: a.violationCount,
      startTime: a.startTime,
      endTime: a.endTime,
    }))
    .sort(
      (a, b) =>
        a.className.localeCompare(b.className) || a.name.localeCompare(b.name),
    );
  return json({
    id: exam.id,
    title: exam.title,
    subject: exam.subject.name,
    classes: exam.classes.map((c) => c.name),
    rows,
  });
}

async function adminList({ segs }: Ctx) {
  switch (segs[1]) {
    case "siswa": {
      const items = await prisma.student.findMany({
        orderBy: [{ status: "asc" }, { name: "asc" }],
        select: {
          id: true,
          nisn: true,
          name: true,
          status: true,
          session: true,
          room: true,
          classId: true,
          religionId: true,
          class: { select: { id: true, name: true } },
          religion: { select: { name: true } },
        },
        take: 5000,
      });
      return json(items);
    }
    case "kelas":
      return json(
        (
          await prisma.class.findMany({
            orderBy: [{ level: "asc" }, { name: "asc" }],
            include: { _count: { select: { students: true } } },
          })
        ).map((c) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          students: c._count.students,
        })),
      );
    case "mapel":
      return json(
        (
          await prisma.subject.findMany({
            orderBy: { name: "asc" },
            include: {
              religion: { select: { name: true } },
              assignments: {
                select: {
                  classId: true,
                  teacherId: true,
                  class: { select: { name: true } },
                  teacher: { select: { name: true } },
                },
              },
            },
          })
        ).map((s) => ({
          id: s.id,
          name: s.name,
          religion: s.religion?.name ?? null,
          religionId: s.religionId,
          plot: s.assignments.map((a) => ({ classId: a.classId, teacherId: a.teacherId })),
          assignments: s.assignments.map((a) => ({
            class: a.class.name,
            teacher: a.teacher.name,
          })),
        })),
      );
    case "jenis-ujian":
      return json(await prisma.examType.findMany({ orderBy: { name: "asc" } }));
    case "agama":
      return json(await prisma.religion.findMany({ orderBy: { name: "asc" } }));
    case "tahun-ajaran":
      return json(
        await prisma.academicYear.findMany({
          orderBy: [{ active: "desc" }, { year: "desc" }],
        }),
      );
    case "pengguna":
      return json(
        await prisma.user.findMany({
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: { id: true, name: true, username: true, role: true },
        }),
      );
    case "jadwal":
      return json(
        (
          await prisma.exam.findMany({
            orderBy: { startTime: "desc" },
            take: 300,
            include: {
              subject: { select: { name: true } },
              examType: { select: { name: true } },
              classes: { select: { name: true } },
              supervisor: { select: { name: true } },
              academicYear: { select: { year: true, semester: true, active: true } },
            },
          })
        ).map((e) => ({
          id: e.id,
          title: e.title,
          subject: e.subject.name,
          examType: e.examType.name,
          classes: e.classes.map((c) => c.name),
          supervisor: e.supervisor?.name ?? null,
          year: `${e.academicYear.year} ${e.academicYear.semester}`,
          yearId: e.academicYearId,
          yearActive: e.academicYear.active,
          startTime: e.startTime,
          endTime: e.endTime,
          duration: e.duration,
          status: e.status,
          token: e.token,
        })),
      );
    case "sekolah":
      return json(await prisma.schoolProfile.findFirst());
    case "kenaikan":
      return forms.kenaikanData();
    case "jadwal-item":
      return segs[2] ? forms.jadwalItem(segs[2]) : fail("id wajib.", 400);
    default:
      return fail("Sumber data tidak dikenal.", 404);
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segs } = await params;
  const q = new URL(req.url).searchParams;
  const head = segs[0];

  const adminOnly = head === "admin";
  const user = await requireStaff(...(adminOnly ? (["ADMIN"] as const) : []));
  if (!user) return fail("Belum login / akses ditolak.", 401);
  const ctx: Ctx = { user, segs, q };

  try {
    if (head === "me") return await me(ctx);
    if (head === "dashboard") return await dashboard(ctx);
    if (head === "monitoring") {
      return segs[1] ? await monitoringDetail(ctx) : await monitoringList(ctx);
    }
    if (head === "soal") {
      return segs[1] ? await soalList(ctx) : await soalSubjects(ctx);
    }
    if (head === "options") return await forms.optionsList(user);
    if (head === "soal-form" && segs[1]) return await forms.soalForm(user, segs[1]);
    if (head === "soal-item" && segs[1]) return await forms.soalItem(user, segs[1]);
    if (head === "penilaian" && segs[1] === "attempt" && segs[2]) {
      return await forms.attemptDetail(user, segs[2]);
    }
    if (head === "penilaian") {
      return segs[1] ? await penilaianDetail(ctx) : await penilaianExams(ctx);
    }
    if (head === "admin") return await adminList(ctx);
    return fail("Endpoint tidak dikenal.", 404);
  } catch (error) {
    console.error("API_V1_ERROR:", head, error);
    return fail("Terjadi kesalahan pada server.", 500);
  }
}
