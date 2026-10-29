"use server";

import { prisma } from "@/lib/prisma";
import { getStudentIdFromSession } from "@/lib/getStudentAuth";
import { AnswersMap } from "@/types/ruang-ujian";
import { AttemptStatus, QuestionType } from "@prisma/client";
import {
  EssayScores,
  GradableQuestion,
  gradeAttempt,
} from "@/lib/grading";
import {
  MAX_VIOLATIONS,
  SUBMIT_GRACE_SECONDS,
  VIOLATION_DEDUPE_MS,
  getAttemptDeadline,
} from "@/lib/exam-config";

const MAX_ANSWER_PAYLOAD_CHARS = 300_000;

type QuestionRow = {
  id: string;
  type: QuestionType;
  score: number;
  correctAnswer: string;
};

/**
 * Semua action di file ini adalah endpoint publik (Next.js server actions).
 * Karena itu SETIAP action wajib memastikan attempt milik siswa yang login.
 *
 * `questions`:
 *  - "none"    : tanpa soal (heartbeat, cek status) -> query paling ringan
 *  - "ids"     : hanya id soal (simpan jawaban)
 *  - "grading" : id, tipe, bobot, kunci (submit & penilaian)
 * Heartbeat & simpan jawaban dipanggil sangat sering; sebelumnya setiap
 * panggilan menarik SEMUA soal beserta kunci jawabannya.
 */
async function getOwnAttempt(
  attemptId: string,
  questions: "none" | "ids" | "grading" = "none",
) {
  const studentId = await getStudentIdFromSession();
  if (!studentId) return null;

  const examSelect =
    questions === "none"
      ? { endTime: true, duration: true }
      : {
          endTime: true,
          duration: true,
          questions: {
            select:
              questions === "ids"
                ? { id: true }
                : { id: true, type: true, score: true, correctAnswer: true },
          },
        };

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { exam: { select: examSelect } },
  });

  if (!attempt || attempt.studentId !== studentId) return null;

  const exam = attempt.exam as unknown as {
    endTime: Date;
    duration: number;
    questions?: QuestionRow[];
  };
  return { ...attempt, exam: { ...exam, questions: exam.questions ?? [] } };
}

function secondsLeft(
  attempt: { startTime: Date; exam: { endTime: Date; duration: number } },
  now = new Date(),
) {
  const deadline = getAttemptDeadline(
    attempt.startTime,
    attempt.exam.endTime,
    attempt.exam.duration,
  );
  return Math.floor((deadline.getTime() - now.getTime()) / 1000);
}

/** Buang kunci yang bukan soal di ujian ini & batasi ukuran payload. */
function sanitizeAnswers(
  answers: AnswersMap,
  validIds: Set<string>,
): AnswersMap | null {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return null;
  }
  const clean: AnswersMap = {};
  for (const [qid, value] of Object.entries(answers)) {
    if (validIds.has(qid)) clean[qid] = value;
  }
  if (JSON.stringify(clean).length > MAX_ANSWER_PAYLOAD_CHARS) return null;
  return clean;
}

/**
 * Simpan jawaban (dipanggil terus-menerus saat siswa menjawab).
 *
 * `seq` = nomor urut simpan dari perangkat siswa. Dengan jaringan jelek,
 * request lama bisa tiba SETELAH request yang lebih baru; tanpa nomor urut,
 * request lama itu menimpa jawaban terbaru (jawaban hilang). Server hanya
 * menerima `seq` yang lebih besar dari yang sudah tersimpan. Request basi
 * dijawab sukses (`stale: true`) karena data yang lebih baru sudah ada.
 */
export async function autoSaveJawaban(
  attemptId: string,
  answers: AnswersMap,
  seq?: number,
) {
  try {
    const attempt = await getOwnAttempt(attemptId, "ids");
    if (!attempt) return { success: false, message: "Sesi tidak valid." };

    if (attempt.status !== AttemptStatus.ONGOING) {
      return {
        success: false,
        closed: true,
        message: "Sesi ujian sudah ditutup.",
      };
    }
    if (secondsLeft(attempt) < -SUBMIT_GRACE_SECONDS) {
      return {
        success: false,
        closed: true,
        message: "Waktu ujian sudah habis.",
      };
    }

    const clean = sanitizeAnswers(
      answers,
      new Set(attempt.exam.questions.map((q) => q.id)),
    );
    if (!clean) return { success: false, message: "Data jawaban tidak valid." };

    if (typeof seq === "number" && Number.isFinite(seq)) {
      const saveSeq = Math.floor(seq);
      const res = await prisma.attempt.updateMany({
        where: {
          id: attemptId,
          status: AttemptStatus.ONGOING,
          saveSeq: { lt: saveSeq },
        },
        data: { answers: clean as object, saveSeq },
      });
      return { success: true, stale: res.count === 0, saveSeq };
    }

    await prisma.attempt.update({
      where: { id: attemptId },
      data: { answers: clean as object },
    });
    return { success: true };
  } catch (error) {
    console.error("Gagal auto-save:", error);
    return { success: false, message: "Gagal menyimpan jawaban." };
  }
}

export async function submitUjianSiswa(attemptId: string, answers: AnswersMap) {
  try {
    const attempt = await getOwnAttempt(attemptId, "grading");
    if (!attempt) return { success: false, message: "Sesi tidak valid." };

    if (attempt.status === AttemptStatus.SUBMITTED) {
      return { success: true, closed: true, message: "Ujian sudah dikumpulkan." };
    }
    if (attempt.status === AttemptStatus.CHEATED) {
      return {
        success: false,
        closed: true,
        message: "Sesi dikunci karena indikasi kecurangan.",
      };
    }

    const questions: GradableQuestion[] = attempt.exam.questions.map((q) => ({
      id: q.id,
      type: q.type,
      score: q.score,
      correctAnswer: q.correctAnswer,
    }));

    // Jawaban final = jawaban yang sudah tersimpan di server + kiriman terakhir
    // client (kiriman menimpa per soal). Menggabungkan (bukan mengganti)
    // memastikan auto-submit saat waktu habis tidak pernah menghapus jawaban
    // yang sudah ter-autosave. Setelah lewat toleransi waktu, kiriman client
    // diabaikan sama sekali.
    const stored = (attempt.answers as AnswersMap | null) ?? {};
    const isLate = secondsLeft(attempt) < -SUBMIT_GRACE_SECONDS;
    const sent = isLate
      ? {}
      : (sanitizeAnswers(answers, new Set(questions.map((q) => q.id))) ?? {});
    const finalAnswers: AnswersMap = { ...stored, ...sent };

    const result = gradeAttempt(
      questions,
      finalAnswers,
      (attempt.essayScores as EssayScores | null) ?? null,
    );

    // updateMany + guard status: submit ganda / balapan dengan "kick" tidak
    // bisa mengubah sesi yang sudah CHEATED menjadi SUBMITTED.
    const updated = await prisma.attempt.updateMany({
      where: { id: attemptId, status: AttemptStatus.ONGOING },
      data: {
        answers: finalAnswers as object,
        score: result.percent,
        status: AttemptStatus.SUBMITTED,
        endTime: new Date(),
      },
    });
    if (updated.count === 0) {
      return {
        success: false,
        closed: true,
        message: "Sesi ujian sudah ditutup.",
      };
    }

    return { success: true, message: "Ujian berhasil diselesaikan!" };
  } catch (error) {
    console.error("Gagal submit:", error);
    return { success: false, message: "Terjadi kesalahan sistem saat submit." };
  }
}

type ViolationLog = {
  waktu: string;
  jenis: string;
  sumber?: string;
  /** true bila pelanggaran terjadi saat offline lalu baru terkirim belakangan */
  tertunda?: boolean;
};

/**
 * Catat pelanggaran. `occurredAt` (opsional) = kapan kejadian sebenarnya di
 * perangkat siswa. Dengan jaringan jelek, pelanggaran dikirim belakangan dari
 * antrean; waktunya dibatasi antara mulai pengerjaan dan sekarang sehingga
 * tidak bisa dipalsukan ke masa depan / sebelum ujian.
 */
export async function catatPelanggaran(
  attemptId: string,
  jenisPelanggaran: string,
  sumber: "web" | "android" = "web",
  occurredAt?: string,
) {
  try {
    const attempt = await getOwnAttempt(attemptId, "none");
    if (!attempt) return { success: false };

    // Sesi yang sudah selesai/dikunci tidak bisa dipakai menambah pelanggaran.
    if (attempt.status !== AttemptStatus.ONGOING) {
      return {
        success: true,
        closed: true,
        violationCount: attempt.violationCount,
        isKicked: attempt.status === AttemptStatus.CHEATED,
      };
    }

    const jenis = String(jenisPelanggaran ?? "")
      .replace(/[\r\n]+/g, " ")
      .slice(0, 160);
    if (!jenis) return { success: false };

    const nowMs = Date.now();
    let eventMs = nowMs;
    let tertunda = false;
    if (occurredAt) {
      const parsed = new Date(occurredAt).getTime();
      if (Number.isFinite(parsed)) {
        eventMs = Math.min(
          nowMs,
          Math.max(attempt.startTime.getTime(), parsed),
        );
        tertunda = nowMs - eventMs > 30_000;
      }
    }

    const logs: ViolationLog[] = Array.isArray(attempt.violationLogs)
      ? (attempt.violationLogs as unknown as ViolationLog[])
      : [];

    // 1 kejadian fisik sering memicu beberapa event (blur + visibilitychange +
    // pause native). Kejadian identik dalam jendela singkat dihitung sekali.
    const last = logs[logs.length - 1];
    if (
      last &&
      last.jenis === jenis &&
      Math.abs(eventMs - new Date(last.waktu).getTime()) < VIOLATION_DEDUPE_MS
    ) {
      return {
        success: true,
        violationCount: attempt.violationCount,
        isKicked: false,
      };
    }

    const newCount = attempt.violationCount + 1;
    const isCheated = newCount >= MAX_VIOLATIONS;
    const newLog: ViolationLog = {
      waktu: new Date(eventMs).toISOString(),
      jenis,
      sumber,
      ...(tertunda ? { tertunda: true } : {}),
    };

    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        violationCount: newCount,
        violationLogs: [...logs, newLog] as object,
        status: isCheated ? AttemptStatus.CHEATED : undefined,
        endTime: isCheated ? new Date() : undefined,
      },
    });

    return { success: true, violationCount: newCount, isKicked: isCheated };
  } catch (error) {
    console.error("Gagal catat pelanggaran:", error);
    return { success: false };
  }
}

export async function cekStatusAttempt(attemptId: string) {
  try {
    const attempt = await getOwnAttempt(attemptId, "none");
    if (!attempt) return { success: false };
    return { success: true, status: attempt.status };
  } catch (error) {
    console.error("Gagal cek status:", error);
    return { success: false };
  }
}

/**
 * Dipanggil client tiap ~15 detik. Fungsinya:
 *  1. sumber waktu yang BENAR (jam HP siswa tidak dipercaya),
 *  2. mendeteksi sesi yang di-reset/dikunci guru,
 *  3. mencatat jeda "senyap" (aplikasi dibekukan/koneksi putus lama) sebagai
 *     log informasi untuk pengawas.
 */
export async function heartbeatUjian(attemptId: string) {
  try {
    const attempt = await getOwnAttempt(attemptId, "none");
    if (!attempt) return { success: false };

    const now = new Date();
    const remaining = secondsLeft(attempt, now);

    if (attempt.status === AttemptStatus.ONGOING) {
      const gapMs = attempt.lastSeenAt
        ? now.getTime() - attempt.lastSeenAt.getTime()
        : 0;

      if (gapMs > 120_000) {
        const logs: ViolationLog[] = Array.isArray(attempt.violationLogs)
          ? (attempt.violationLogs as unknown as ViolationLog[])
          : [];
        await prisma.attempt.update({
          where: { id: attemptId },
          data: {
            lastSeenAt: now,
            violationLogs: [
              ...logs,
              {
                waktu: now.toISOString(),
                jenis: `INFO: tidak ada sinyal dari perangkat selama ${Math.round(gapMs / 1000)} detik`,
                sumber: "server",
              },
            ] as object,
          },
        });
      } else {
        await prisma.attempt.update({
          where: { id: attemptId },
          data: { lastSeenAt: now },
        });
      }
    }

    return {
      success: true,
      status: attempt.status,
      remainingSeconds: Math.max(0, remaining),
      violationCount: attempt.violationCount,
      saveSeq: attempt.saveSeq,
      serverTime: now.toISOString(),
    };
  } catch (error) {
    console.error("Gagal heartbeat:", error);
    return { success: false };
  }
}
