import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { StaffUser } from "@/lib/api-v1";

/** Data Beranda aplikasi desktop: kabar hari ini (siswa, guru, sistem), progres, dan ujian yang diawasi. */

export type Kabar = {
  id: string;
  scope: "siswa" | "guru" | "sistem";
  tone: "good" | "info" | "warn";
  title: string;
  text: string;
  /** Tab tujuan saat kartu diklik (opsional). */
  tab?: string;
  sel?: string;
};

const DAY = 86_400_000;
const OFFLINE_AFTER_MS = 45_000;

// ── helper murni (dites) ──

export function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/** Selisih rata-rata dibanding ujian sebelumnya sebagai kalimat; null bila tak ada pembanding. */
export function trendText(now: number | null, prev: number | null): string | null {
  if (now === null || prev === null) return null;
  const d = Math.round((now - prev) * 10) / 10;
  if (d === 0) return "sama dengan ujian sebelumnya";
  return d > 0
    ? `naik ${d} poin dibanding ujian sebelumnya`
    : `turun ${Math.abs(d)} poin dibanding ujian sebelumnya`;
}

type AnswersMap = Record<string, unknown>;

/** Jumlah jawaban esai (tidak kosong) yang belum diberi nilai. */
export function countEssayPending(
  attempts: { answers: unknown; essayScores: unknown }[],
  essayIds: Set<string>,
): { total: number; pending: number } {
  let total = 0;
  let pending = 0;
  for (const a of attempts) {
    const answers = (a.answers && typeof a.answers === "object" ? a.answers : {}) as AnswersMap;
    const scores = (a.essayScores && typeof a.essayScores === "object" ? a.essayScores : {}) as AnswersMap;
    for (const [qid, v] of Object.entries(answers)) {
      if (!essayIds.has(qid)) continue;
      if (typeof v !== "string" || v.trim() === "") continue;
      total++;
      if (scores[qid] === undefined || scores[qid] === null) pending++;
    }
  }
  return { total, pending };
}

export type LiveCounts = { peserta: number; mengerjakan: number; selesai: number; melanggar: number; terputus: number };

export function liveCounts(
  attempts: { status: string; violationCount: number; lastSeenAt: Date | null }[],
  peserta: number,
  nowMs: number,
): LiveCounts {
  let mengerjakan = 0;
  let selesai = 0;
  let melanggar = 0;
  let terputus = 0;
  for (const a of attempts) {
    if (a.status === "ONGOING") {
      mengerjakan++;
      const last = a.lastSeenAt?.getTime() ?? null;
      if (last === null || nowMs - last > OFFLINE_AFTER_MS) terputus++;
    } else selesai++;
    if (a.violationCount > 0) melanggar++;
  }
  return { peserta, mengerjakan, selesai, melanggar, terputus };
}

// ── pengambilan data ──

export async function beranda(user: StaffUser) {
  const nowMs = Date.now();
  const now = new Date(nowMs);
  const weekAgo = new Date(nowMs - 7 * DAY);
  const isAdmin = user.role === "ADMIN";
  const scope: Prisma.ExamWhereInput = isAdmin
    ? {}
    : { OR: [{ supervisorId: user.id }, { authorId: user.id }] };

  const [activeYear, awasi, selesaiExams, soalSaya, soalBaru, subjectsTanpaGuru, tanpaPengawas, guruTotal, guruAktif] =
    await Promise.all([
      prisma.academicYear.findFirst({ where: { active: true }, select: { year: true, semester: true } }),
      prisma.exam.findMany({
        where: {
          status: { not: "COMPLETED" },
          endTime: { gte: new Date(nowMs - 2 * 3600_000) },
          ...(isAdmin ? {} : { supervisorId: user.id }),
        },
        orderBy: { startTime: "asc" },
        take: 12,
        select: {
          id: true,
          title: true,
          status: true,
          startTime: true,
          endTime: true,
          token: true,
          supervisor: { select: { name: true } },
          subject: { select: { name: true } },
          classes: { select: { name: true, _count: { select: { students: true } } } },
          attempts: { select: { status: true, violationCount: true, lastSeenAt: true } },
        },
      }),
      prisma.exam.findMany({
        where: { ...scope, endTime: { lt: now }, attempts: { some: { score: { not: null } } } },
        orderBy: { endTime: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          subjectId: true,
          subject: { select: { name: true } },
          classes: { select: { name: true } },
          attempts: {
            where: { score: { not: null } },
            select: { score: true, violationCount: true, answers: true, essayScores: true, student: { select: { name: true } } },
          },
        },
      }),
      prisma.question.count({ where: isAdmin ? {} : { authorId: user.id } }),
      prisma.question.count({
        where: { ...(isAdmin ? {} : { authorId: user.id }), createdAt: { gte: weekAgo } },
      }),
      prisma.subject.count({ where: { assignments: { none: {} } } }),
      prisma.exam.count({
        where: {
          supervisorId: null,
          status: { not: "COMPLETED" },
          startTime: { gte: now, lt: new Date(nowMs + 7 * DAY) },
        },
      }),
      prisma.user.count({ where: { role: "GURU" } }),
      prisma.question.groupBy({ by: ["authorId"], where: { createdAt: { gte: weekAgo } } }),
    ]);

  // ── ujian yang diawasi / berlangsung ──
  const diawasi = awasi.map((e) => {
    const peserta = e.classes.reduce((n, c) => n + c._count.students, 0);
    const c = liveCounts(e.attempts, peserta, nowMs);
    const live = e.startTime.getTime() <= nowMs && e.endTime.getTime() >= nowMs;
    return {
      id: e.id,
      title: e.title,
      subject: e.subject.name,
      classes: e.classes.map((x) => x.name),
      supervisor: e.supervisor?.name ?? null,
      status: e.status,
      token: e.token,
      startTime: e.startTime,
      endTime: e.endTime,
      live,
      ...c,
    };
  });
  diawasi.sort((a, b) => Number(b.live) - Number(a.live) || +a.startTime - +b.startTime);

  // ── esai belum dikoreksi (guru) ──
  const finished = selesaiExams.flatMap((e) => e.attempts);
  const answerKeys = new Set<string>();
  for (const a of finished) {
    if (a.answers && typeof a.answers === "object") Object.keys(a.answers).forEach((k) => answerKeys.add(k));
  }
  const essayRows = answerKeys.size
    ? await prisma.question.findMany({
        where: { id: { in: [...answerKeys] }, type: "ESSAY", ...(isAdmin ? {} : { authorId: user.id }) },
        select: { id: true },
      })
    : [];
  const essay = countEssayPending(finished, new Set(essayRows.map((q) => q.id)));

  // ── kabar ──
  const kabar: Kabar[] = [];
  const liveNow = diawasi.filter((d) => d.live);
  if (liveNow.length) {
    const d = liveNow[0];
    kabar.push({
      id: "live",
      scope: "guru",
      tone: "info",
      title: `${liveNow.length} ujian sedang berlangsung`,
      text: `${d.title}: ${d.mengerjakan} mengerjakan, ${d.selesai} selesai${d.melanggar ? `, ${d.melanggar} melanggar` : ""}.`,
      tab: "Monitoring",
      sel: d.id,
    });
  }
  const terakhir = selesaiExams[0];
  if (terakhir) {
    const scores = terakhir.attempts.map((a) => a.score as number);
    const rata = avg(scores);
    const prev = selesaiExams.find((e) => e.id !== terakhir.id && e.subjectId === terakhir.subjectId);
    const prevAvg = prev ? avg(prev.attempts.map((a) => a.score as number)) : null;
    const tren = trendText(rata, prevAvg);
    if (rata !== null) {
      kabar.push({
        id: "rata",
        scope: "siswa",
        tone: tren?.startsWith("turun") ? "warn" : "good",
        title: `Rata-rata ${terakhir.subject.name}: ${rata}`,
        text: `${terakhir.title}${tren ? ` — ${tren}` : ""}. ${scores.length} siswa mengerjakan.`,
        tab: "Penilaian",
        sel: terakhir.id,
      });
    }
    const top = [...terakhir.attempts].sort((a, b) => (b.score as number) - (a.score as number))[0];
    if (top) {
      kabar.push({
        id: "terbaik",
        scope: "siswa",
        tone: "good",
        title: `Nilai tertinggi: ${top.student.name}`,
        text: `Meraih ${top.score} pada ${terakhir.title}.`,
        tab: "Penilaian",
        sel: terakhir.id,
      });
    }
    const melanggar = terakhir.attempts.filter((a) => a.violationCount > 0).length;
    kabar.push({
      id: "pelanggaran",
      scope: "siswa",
      tone: melanggar === 0 ? "good" : "warn",
      title: melanggar === 0 ? "Ujian terakhir bersih dari pelanggaran" : `${melanggar} siswa tercatat melanggar`,
      text: melanggar === 0 ? `Tidak ada pelanggaran pada ${terakhir.title}.` : `Pada ${terakhir.title}. Cek rinciannya di Penilaian.`,
      tab: "Penilaian",
      sel: terakhir.id,
    });
  }
  // kabar tentang guru
  if (!isAdmin) {
    kabar.push({
      id: "soal",
      scope: "guru",
      tone: soalBaru > 0 ? "good" : "info",
      title: soalBaru > 0 ? `${soalBaru} soal baru minggu ini` : `${soalSaya} soal di bank soal Anda`,
      text: soalBaru > 0 ? `Total bank soal Anda sekarang ${soalSaya}. Terima kasih sudah menyusunnya.` : "Belum ada soal baru minggu ini.",
      tab: "BankSoal",
    });
    if (essay.total > 0) {
      kabar.push({
        id: "esai",
        scope: "guru",
        tone: essay.pending === 0 ? "good" : "warn",
        title: essay.pending === 0 ? "Semua esai sudah dikoreksi" : `${essay.pending} jawaban esai menunggu dinilai`,
        text: essay.pending === 0 ? `${essay.total} jawaban esai terakhir sudah selesai dinilai.` : `Dari ${essay.total} jawaban esai pada ujian terakhir Anda.`,
        tab: "Penilaian",
      });
    }
    const minggu = diawasi.filter((d) => +d.startTime < nowMs + 7 * DAY).length;
    kabar.push({
      id: "awas",
      scope: "guru",
      tone: "info",
      title: minggu ? `Jadwal mengawas: ${minggu} ujian` : "Belum ada jadwal mengawas",
      text: minggu ? `Berikutnya: ${diawasi.find((d) => !d.live)?.title ?? diawasi[0].title}.` : "Begitu admin menunjuk Anda sebagai pengawas, jadwalnya muncul di sini.",
      tab: "Monitoring",
    });
  } else {
    kabar.push({
      id: "guru-aktif",
      scope: "guru",
      tone: "info",
      title: `${guruAktif.length} dari ${guruTotal} guru menambah soal minggu ini`,
      text: `${soalBaru} soal baru dibuat dalam 7 hari terakhir.`,
    });
    if (tanpaPengawas > 0) {
      kabar.push({
        id: "tanpa-pengawas",
        scope: "sistem",
        tone: "warn",
        title: `${tanpaPengawas} ujian minggu ini belum punya pengawas`,
        text: "Tunjuk pengawas dari menu Jadwal Ujian.",
        tab: "Jadwal",
      });
    }
    if (subjectsTanpaGuru > 0) {
      kabar.push({
        id: "mapel-tanpa-guru",
        scope: "sistem",
        tone: "warn",
        title: `${subjectsTanpaGuru} mapel belum punya pengampu`,
        text: "Atur pengampu di menu Mata Pelajaran.",
        tab: "Mapel",
      });
    }
    if (!activeYear) {
      kabar.push({
        id: "tahun",
        scope: "sistem",
        tone: "warn",
        title: "Belum ada tahun ajaran aktif",
        text: "Aktifkan satu tahun ajaran agar filter dan penilaian tepat.",
        tab: "Tahun",
      });
    }
  }

  return {
    now: now.toISOString(),
    role: user.role,
    name: user.name,
    tahunAjaran: activeYear ? `${activeYear.year} ${activeYear.semester === "GANJIL" ? "Ganjil" : "Genap"}` : null,
    progress: {
      esaiTotal: essay.total,
      esaiSelesai: essay.total - essay.pending,
      ujianLive: liveNow.length,
      ujianDiawasi: diawasi.length,
      soalSaya,
      soalBaru,
    },
    diawasi,
    kabar,
  };
}

export type Kejadian = {
  at: string;
  kind: "mulai" | "selesai" | "pelanggaran";
  studentId: string;
  name: string;
  detail: string;
  tertunda?: boolean;
};

/** Aliran kejadian satu ujian (terbaru dulu): siswa mulai, selesai, dan pelanggaran. */
export function buildEvents(
  items: {
    studentId: string;
    name: string;
    startTime: Date | null;
    endTime: Date | null;
    status: string;
    violationLogs: unknown;
  }[],
  limit = 40,
): Kejadian[] {
  const out: Kejadian[] = [];
  for (const it of items) {
    if (it.startTime) {
      out.push({ at: it.startTime.toISOString(), kind: "mulai", studentId: it.studentId, name: it.name, detail: "mulai mengerjakan" });
    }
    if (it.endTime && it.status !== "ONGOING") {
      out.push({
        at: it.endTime.toISOString(),
        kind: "selesai",
        studentId: it.studentId,
        name: it.name,
        detail: it.status === "CHEATED" ? "dikeluarkan (pelanggaran maksimum)" : "mengumpulkan jawaban",
      });
    }
    const logs = Array.isArray(it.violationLogs) ? (it.violationLogs as { waktu?: string; jenis?: string; tertunda?: boolean }[]) : [];
    for (const l of logs) {
      if (!l?.waktu || Number.isNaN(Date.parse(l.waktu))) continue;
      out.push({
        at: new Date(l.waktu).toISOString(),
        kind: "pelanggaran",
        studentId: it.studentId,
        name: it.name,
        detail: l.jenis ?? "pelanggaran",
        ...(l.tertunda ? { tertunda: true } : {}),
      });
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
