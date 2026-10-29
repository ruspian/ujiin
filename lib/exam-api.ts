import { REQUEST_TIMEOUT_MS } from "@/lib/exam-config";
import type { AnswersMap } from "@/types/ruang-ujian";

export type ExamOp =
  | { type: "save"; attemptId: string; answers: AnswersMap; seq: number }
  | { type: "heartbeat"; attemptId: string }
  | { type: "status"; attemptId: string }
  | { type: "submit"; attemptId: string; answers: AnswersMap }
  | {
      type: "violation";
      attemptId: string;
      jenis: string;
      sumber: "web" | "android";
      occurredAt: string;
    };

/** Sesi login siswa berakhir: coba ulang tidak ada gunanya, harus login lagi. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Sesi login berakhir");
    this.name = "UnauthorizedError";
  }
}

/**
 * Panggil /api/ujian/sync dengan batas waktu. Melempar error bila jaringan
 * putus, timeout, atau server membalas non-2xx (mis. 502 dari proxy) supaya
 * pemanggil menganggapnya GAGAL SEMENTARA dan mencoba lagi.
 * Hanya mengembalikan nilai bila server benar-benar menjawab dengan JSON.
 */
export async function examCall<T = Record<string, unknown>>(
  op: ExamOp,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("/api/ujian/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(op),
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
    });

    if (res.status === 401) throw new UnauthorizedError();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
