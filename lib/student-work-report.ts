import type { DocBlock } from "@/lib/report-doc";
import { htmlToText } from "@/lib/report-text";
import {
  gradeQuestion,
  clampEssayScore,
  parseKeyList,
  type AnswerValue,
  type GradableQuestion,
} from "@/lib/grading";

export interface WorkQuestion extends GradableQuestion {
  text: string;
  options: unknown;
}

export interface StudentWorkInput {
  studentName: string;
  nisn: string;
  className: string;
  examTitle: string;
  subjectName: string;
  status: string;
  score: number | null;
  answers: Record<string, AnswerValue>;
  essayScores?: Record<string, number> | null;
  questions: WorkQuestion[];
}

const TYPE_LABEL: Record<WorkQuestion["type"], string> = {
  MULTIPLE_CHOICE: "Pilihan Ganda",
  MULTIPLE_CHOICE_COMPLEX: "Pilihan Ganda Kompleks",
  MATCHING: "Menjodohkan",
  TRUE_FALSE: "Benar / Salah",
  ESSAY: "Esai / Uraian",
};

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Selesai",
  CHEATED: "Dikeluarkan (pelanggaran)",
  ONGOING: "Sedang mengerjakan",
};

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

const isEmpty = (a: AnswerValue | undefined | null) =>
  a === undefined ||
  a === null ||
  a === "" ||
  (Array.isArray(a) && a.length === 0) ||
  (typeof a === "object" && !Array.isArray(a) && Object.keys(a).length === 0);

function parseOptions(raw: unknown): { id: string; text: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((o): o is { id: unknown; text: unknown } => !!o && typeof o === "object")
    .map((o) => ({ id: String(o.id ?? ""), text: htmlToText(String(o.text ?? "")) }));
}

function parsePairs(raw: string | null): { left: string; right: string }[] {
  try {
    const p = JSON.parse(raw ?? "[]");
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

/** Menyusun dokumen "hasil pekerjaan siswa" (soal, jawaban siswa, kunci, poin). */
export function buildStudentWorkBlocks(input: StudentWorkInput): DocBlock[] {
  const blocks: DocBlock[] = [
    { kind: "title", text: "HASIL PEKERJAAN SISWA" },
    {
      kind: "subtitle",
      text: `${input.examTitle} - ${input.subjectName}`.toUpperCase(),
    },
    {
      kind: "kv",
      rows: [
        ["Nama", input.studentName],
        ["NISN", input.nisn],
        ["Kelas", input.className],
        ["Status", STATUS_LABEL[input.status] ?? input.status],
        [
          "Nilai",
          input.score !== null ? fmt(input.score) : "Belum dinilai",
        ],
      ],
    },
  ];

  input.questions.forEach((q, i) => {
    const answer = input.answers[q.id];
    const answered = !isEmpty(answer);
    const max = Number(q.score) || 0;
    const earned =
      q.type === "ESSAY"
        ? clampEssayScore(input.essayScores?.[q.id] ?? 0, max)
        : gradeQuestion(q, answer);

    blocks.push({
      kind: "heading",
      text: `No. ${i + 1}  (${TYPE_LABEL[q.type]})  -  Poin ${fmt(earned)} / ${fmt(max)}`,
    });
    blocks.push({ kind: "paragraph", text: htmlToText(q.text) || "-" });

    if (q.type === "MULTIPLE_CHOICE" || q.type === "MULTIPLE_CHOICE_COMPLEX") {
      const keys =
        q.type === "MULTIPLE_CHOICE_COMPLEX"
          ? parseKeyList(q.correctAnswer)
          : [String(q.correctAnswer ?? "").trim().toUpperCase()];
      const chosen = new Set(
        (Array.isArray(answer) ? answer : answer ? [String(answer)] : []).map(
          (x) => String(x).trim().toUpperCase(),
        ),
      );
      for (const opt of parseOptions(q.options)) {
        const id = opt.id.toUpperCase();
        const picked = chosen.has(id);
        const isKey = keys.includes(id);
        const tags = [picked ? "dipilih siswa" : "", isKey ? "kunci" : ""]
          .filter(Boolean)
          .join(", ");
        blocks.push({
          kind: "paragraph",
          indent: true,
          text: `${picked ? "[x]" : "[ ]"} ${opt.id}. ${opt.text}${tags ? `  (${tags})` : ""}`,
          bold: picked,
          color: picked ? (isKey ? "green" : "red") : isKey ? "blue" : undefined,
        });
      }
    } else if (q.type === "TRUE_FALSE") {
      const key = String(q.correctAnswer ?? "").trim().toUpperCase();
      blocks.push({
        kind: "paragraph",
        indent: true,
        text: `Jawaban siswa: ${answered ? String(answer) : "-"}    Kunci: ${key || "-"}`,
        color: answered ? (earned > 0 ? "green" : "red") : undefined,
      });
    } else if (q.type === "MATCHING") {
      const given =
        answer && typeof answer === "object" && !Array.isArray(answer)
          ? (answer as Record<string, string>)
          : {};
      blocks.push({
        kind: "table",
        header: ["Sisi Kiri", "Jawaban Siswa", "Kunci"],
        widths: [36, 32, 32],
        rows: parsePairs(q.correctAnswer).map((p) => [
          htmlToText(p.left),
          given[p.left] ? htmlToText(given[p.left]) : "(tidak dijawab)",
          htmlToText(p.right),
        ]),
      });
    } else {
      blocks.push({
        kind: "paragraph",
        bold: true,
        text: "Jawaban siswa:",
      });
      blocks.push({
        kind: "paragraph",
        indent: true,
        text: answered ? String(answer) : "(tidak dijawab)",
        italic: !answered,
      });
      blocks.push({
        kind: "paragraph",
        color: "blue",
        text: `Kunci / rubrik: ${htmlToText(q.correctAnswer) || "-"}`,
      });
    }

    if (!answered && q.type !== "ESSAY") {
      blocks.push({
        kind: "paragraph",
        italic: true,
        color: "red",
        text: "Siswa tidak menjawab soal ini.",
      });
    }
  });

  return blocks;
}
