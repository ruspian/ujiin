import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

function csvResponse(body: string, fileName: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

function slug(text: string) {
  return text.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "arsip";
}

/**
 * Arsip khusus ADMIN.
 *  ?type=siswa                  -> daftar semua siswa (aktif & lulus)
 *  ?type=nilai&yearId=<id>      -> semua nilai ujian pada satu tahun ajaran
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new Response("Akses ditolak", { status: 403 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (type === "siswa") {
    const students = await prisma.student.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        nisn: true,
        name: true,
        status: true,
        class: { select: { name: true, level: true } },
      },
    });
    const rows: unknown[][] = [
      ["NISN", "Nama", "Kelas", "Tingkat", "Status"],
      ...students.map((s) => [
        s.nisn,
        s.name,
        s.class?.name ?? "",
        s.class?.level ?? "",
        s.status,
      ]),
    ];
    return csvResponse(buildCsv(rows), "Arsip_Daftar_Siswa.csv");
  }

  if (type === "nilai") {
    const yearId = url.searchParams.get("yearId");
    if (!yearId) return new Response("yearId wajib", { status: 400 });

    const year = await prisma.academicYear.findUnique({
      where: { id: yearId },
      select: { year: true, semester: true },
    });
    if (!year) return new Response("Tahun ajaran tidak ditemukan", { status: 404 });

    const attempts = await prisma.attempt.findMany({
      where: { exam: { academicYearId: yearId } },
      orderBy: [{ exam: { title: "asc" } }, { student: { name: "asc" } }],
      select: {
        score: true,
        status: true,
        violationCount: true,
        startTime: true,
        endTime: true,
        student: {
          select: { nisn: true, name: true, class: { select: { name: true } } },
        },
        exam: {
          select: {
            title: true,
            subject: { select: { name: true } },
            examType: { select: { name: true } },
          },
        },
      },
    });

    const rows: unknown[][] = [
      [
        "Tahun Ajaran",
        "Semester",
        "Mata Pelajaran",
        "Jenis Ujian",
        "Judul Ujian",
        "Kelas",
        "NISN",
        "Nama",
        "Nilai",
        "Status",
        "Pelanggaran",
        "Mulai",
        "Selesai",
      ],
      ...attempts.map((a) => [
        year.year,
        year.semester,
        a.exam.subject.name,
        a.exam.examType.name,
        a.exam.title,
        a.student.class?.name ?? "",
        a.student.nisn,
        a.student.name,
        a.score ?? "",
        a.status,
        a.violationCount,
        a.startTime.toISOString(),
        a.endTime?.toISOString() ?? "",
      ]),
    ];
    return csvResponse(
      buildCsv(rows),
      `Arsip_Nilai_${slug(year.year)}_${slug(String(year.semester))}.csv`,
    );
  }

  return new Response("type tidak valid", { status: 400 });
}
