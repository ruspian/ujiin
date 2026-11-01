import type { DocBlock } from "@/lib/report-doc";

export interface RekapReportInput {
  subjectName: string;
  className: string;
  academicYear: string;
  teacherName: string;
  students: { id: string; name: string; nisn: string }[];
  exams: { id: string; title: string; examType: { name: string } }[];
  attemptsMap: Record<string, number | null>;
  /** kota/tempat untuk tanda tangan, opsional */
  place?: string;
  /** nilai di bawah ini ditandai di ringkasan (KKM) */
  kkm?: number;
  dateLabel: string;
}

/** Dokumen rekap nilai satu kelas. Rata-rata dibulatkan sama seperti tabel di layar. */
export function buildRekapBlocks(input: RekapReportInput): DocBlock[] {
  const { students, exams, attemptsMap } = input;

  const rows: string[][] = students.map((s, idx) => {
    let total = 0;
    let count = 0;
    const scores = exams.map((e) => {
      const v = attemptsMap[`${s.id}_${e.id}`];
      if (v === null || v === undefined) return "-";
      total += v;
      count++;
      return String(v);
    });
    return [
      String(idx + 1),
      s.name,
      s.nisn,
      ...scores,
      count > 0 ? String(Math.round(total / count)) : "-",
    ];
  });

  // rata-rata kelas per ujian
  const classAvg = exams.map((e) => {
    const vals = students
      .map((s) => attemptsMap[`${s.id}_${e.id}`])
      .filter((v): v is number => v !== null && v !== undefined);
    return vals.length ? String(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)) : "-";
  });
  const overall = rows
    .map((r) => Number(r[r.length - 1]))
    .filter((n) => Number.isFinite(n));
  const overallAvg = overall.length
    ? String(Math.round(overall.reduce((a, b) => a + b, 0) / overall.length))
    : "-";

  const header = [
    "No",
    "Nama Siswa",
    "NISN",
    ...exams.map((e) => `${e.examType.name}\n${e.title}`),
    "Rata-Rata",
  ];

  const blocks: DocBlock[] = [
    { kind: "title", text: "REKAPITULASI NILAI" },
    { kind: "subtitle", text: input.subjectName.toUpperCase() },
    {
      kind: "kv",
      rows: [
        ["Kelas", input.className],
        ["Tahun Ajaran", input.academicYear],
        ["Guru Pengampu", input.teacherName],
        ["Jumlah Siswa", String(students.length)],
      ],
    },
    {
      kind: "table",
      header,
      rows: [...rows, ["", "Rata-rata kelas", "", ...classAvg, overallAvg]],
      center: header.map((_, i) => i !== 1),
      widths: (() => {
        const fixed = [5, 29, 13, 10]; // No, Nama, NISN, Rata-rata
        const rest = (100 - fixed.reduce((a, b) => a + b, 0)) / Math.max(exams.length, 1);
        return [fixed[0], fixed[1], fixed[2], ...exams.map(() => rest), fixed[3]];
      })(),
    },
    {
      kind: "paragraph",
      italic: true,
      color: "gray",
      text: "Tanda \"-\" berarti siswa belum mengerjakan ujian tersebut. Nilai berskala 0-100.",
    },
    {
      kind: "signature",
      place: `${input.place ?? ""}${input.place ? ", " : ""}${input.dateLabel}`,
      role: "Guru Mata Pelajaran",
      name: input.teacherName,
    },
  ];
  return blocks;
}
