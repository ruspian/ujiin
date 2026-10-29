import { RETRY_DELAYS_MS } from "@/lib/exam-config";

/** Jeda sebelum percobaan ke-N (mulai 1): 2s, 4s, 8s, 16s, lalu 30s. */
export function retryDelayMs(failures: number): number {
  const i = Math.min(Math.max(failures, 1), RETRY_DELAYS_MS.length) - 1;
  return RETRY_DELAYS_MS[i];
}

/** Item antrean pelanggaran yang tersimpan di perangkat sampai berhasil terkirim. */
export interface QueuedViolation {
  jenis: string;
  sumber: "web" | "android";
  /** ISO time kejadian di perangkat */
  at: string;
  /** berapa kali server menjawab gagal (bukan putus jaringan) */
  tries: number;
}

/** Server menjawab gagal terus untuk pelanggaran yang sama: berhenti agar tidak macet. */
export const MAX_VIOLATION_TRIES = 5;

export type SyncState = "synced" | "saving" | "pending";
export type ConnectionState = "online" | "unstable";
