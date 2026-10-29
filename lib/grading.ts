/**
 * Logika penilaian TERPUSAT.
 *
 * Dipakai oleh: submit siswa, koreksi guru, halaman penilaian, dan auto-finalize.
 * Dengan satu sumber kebenaran, nilai di semua halaman (dan di APK) selalu sama.
 *
 * Aturan:
 *  - `Attempt.score` SELALU skala 0–100 (bukan poin mentah).
 *  - Rumus: (total poin diperoleh / total bobot SEMUA soal) * 100.
 *  - Esai dinilai manual guru; sebelum dikoreksi dihitung 0.
 */

export type AnswerValue = string | string[] | Record<string, string>;
export type AnswersMap = Record<string, AnswerValue>;
export type EssayScores = Record<string, number>;

export interface GradableQuestion {
  id: string;
  type:
    | "MULTIPLE_CHOICE"
    | "MULTIPLE_CHOICE_COMPLEX"
    | "MATCHING"
    | "ESSAY"
    | "TRUE_FALSE";
  score: number;
  correctAnswer: string | null;
}

interface MatchingPair {
  left: string;
  right: string;
  point?: number;
}

const norm = (v: unknown): string => String(v ?? "").trim().toUpperCase();

/** Kunci PG kompleks bisa "A,C" atau '["A","C"]'. */
export function parseKeyList(raw: string | null | undefined): string[] {
  const text = (raw ?? "").trim();
  if (!text) return [];
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(norm).filter(Boolean);
    } catch {
      // jatuh ke parsing koma
    }
  }
  return text.split(",").map(norm).filter(Boolean);
}

function parseMatchingKey(raw: string | null | undefined): MatchingPair[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? (parsed as MatchingPair[]) : [];
  } catch {
    return [];
  }
}

const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((v) => b.has(v));

/**
 * Poin otomatis satu soal. ESSAY selalu 0 (dinilai manual).
 * Hasil tidak pernah melebihi bobot soal.
 */
export function gradeQuestion(
  q: GradableQuestion,
  answer: AnswerValue | undefined | null,
): number {
  const max = Number(q.score) || 0;
  if (answer === undefined || answer === null) return 0;

  switch (q.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE": {
      if (typeof answer !== "string") return 0;
      return norm(answer) !== "" && norm(answer) === norm(q.correctAnswer)
        ? max
        : 0;
    }

    case "MULTIPLE_CHOICE_COMPLEX": {
      if (!Array.isArray(answer)) return 0;
      const key = new Set(parseKeyList(q.correctAnswer));
      // Set -> jawaban ganda ["A","A"] tidak bisa "menipu" panjang array
      const given = new Set(answer.map(norm).filter(Boolean));
      return key.size > 0 && sameSet(key, given) ? max : 0;
    }

    case "MATCHING": {
      if (typeof answer !== "object" || Array.isArray(answer)) return 0;
      const pairs = parseMatchingKey(q.correctAnswer);
      if (pairs.length === 0) return 0;
      const given = answer as Record<string, string>;
      let total = 0;
      for (const p of pairs) {
        const picked = given[p.left];
        if (
          typeof picked === "string" &&
          picked.trim().toLowerCase() === String(p.right).trim().toLowerCase()
        ) {
          const pt = Number(p.point);
          total += pt > 0 ? pt : max / pairs.length;
        }
      }
      return Math.min(total, max);
    }

    case "ESSAY":
    default:
      return 0;
  }
}

export interface GradeResult {
  autoPoints: number;
  essayPoints: number;
  totalPoints: number;
  maxPoints: number;
  /** 0–100, dibulatkan 2 desimal */
  percent: number;
}

export function toPercent(points: number, maxPoints: number): number {
  if (!(maxPoints > 0)) return 0;
  const pct = (points / maxPoints) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)) * 100) / 100;
}

/** Nilai esai dari guru dibatasi 0..bobot soal. */
export function clampEssayScore(value: unknown, maxScore: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(Math.max(0, n), maxScore) * 100) / 100;
}

export function gradeAttempt(
  questions: GradableQuestion[],
  answers: AnswersMap | null | undefined,
  essayScores?: EssayScores | null,
): GradeResult {
  const ans = answers ?? {};
  let autoPoints = 0;
  let essayPoints = 0;
  let maxPoints = 0;

  for (const q of questions) {
    maxPoints += Number(q.score) || 0;
    if (q.type === "ESSAY") {
      essayPoints += clampEssayScore(essayScores?.[q.id] ?? 0, q.score);
    } else {
      autoPoints += gradeQuestion(q, ans[q.id]);
    }
  }

  const totalPoints = autoPoints + essayPoints;
  return {
    autoPoints,
    essayPoints,
    totalPoints,
    maxPoints,
    percent: toPercent(totalPoints, maxPoints),
  };
}
