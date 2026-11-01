/** Konfigurasi bersama ujian & anti-cheat (dipakai server DAN client). */

/** Pelanggaran ke-N otomatis mengeluarkan siswa (status CHEATED). */
export const MAX_VIOLATIONS = 3;

/**
 * Toleransi (detik) setelah waktu habis untuk submit/simpan yang terlambat
 * karena jaringan jelek (mode semi daring). Jawaban yang sudah tersimpan di
 * server SEBELUM waktu habis selalu dipakai, berapa pun lama keterlambatannya;
 * toleransi ini hanya untuk kiriman terakhir dari perangkat siswa.
 */
export const SUBMIT_GRACE_SECONDS = 120;

/** Interval heartbeat client -> server (ms). */
export const HEARTBEAT_INTERVAL_MS = 15_000;

/** Jeda minimum (ms) antar pelanggaran yang sama agar 1 kejadian tidak terhitung ganda. */
export const VIOLATION_DEDUPE_MS = 3_000;

/**
 * Batas waktu efektif satu pengerjaan:
 * paling cepat antara jam berakhir jadwal DAN (mulai mengerjakan + durasi).
 * Sebelumnya `duration` diabaikan sehingga siswa yang masuk lebih awal
 * bisa mengerjakan lebih lama dari durasi yang ditetapkan guru.
 *
 * `extraSeconds` = tambahan waktu khusus siswa ini dari pengawas (mis. HP
 * error). Ditambahkan SETELAH batas di atas, jadi bisa melewati jam selesai
 * jadwal untuk siswa tersebut saja.
 */
export function getAttemptDeadline(
  attemptStart: Date,
  examEnd: Date,
  durationMinutes: number,
  extraSeconds = 0,
): Date {
  const byDuration = attemptStart.getTime() + durationMinutes * 60_000;
  const base = Math.min(byDuration, examEnd.getTime());
  return new Date(base + Math.max(0, extraSeconds) * 1000);
}

/** Batas tambahan waktu per siswa (menit) agar tidak bisa tak terbatas. */
export const MAX_EXTRA_MINUTES_TOTAL = 180;

/** Batas waktu (ms) satu panggilan ke server sebelum dianggap gagal & dicoba ulang. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Jeda coba-ulang (ms): 2s, 4s, 8s, 16s, lalu tetap 30s. */
export const RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 16_000, 30_000];

/** Bila tidak ada kontak sukses ke server selama ini, tampilkan "jaringan tidak stabil". */
export const STALE_CONTACT_MS = 45_000;
