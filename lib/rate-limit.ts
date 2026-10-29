import { prisma } from "@/lib/prisma";

/**
 * Pembatas percobaan GAGAL berbasis database (tahan serverless/multi-instance).
 *
 * Cara pakai:
 *   if (await isRateLimited(key, 8)) -> tolak
 *   ... verifikasi ...
 *   gagal  -> await recordFailure(key, windowMs)
 *   sukses -> await resetRateLimit(key)
 *
 * FAIL-OPEN: bila database bermasalah, pembatas dilewati supaya siswa yang sah
 * tidak terkunci saat ujian. Keamanan utama tetap ada di password/token.
 */

export const LOGIN_WINDOW_MS = 10 * 60 * 1000;
export const LOGIN_MAX_FAILURES = 8;
export const TOKEN_WINDOW_MS = 5 * 60 * 1000;
export const TOKEN_MAX_FAILURES = 10;

export async function isRateLimited(
  key: string,
  maxFailures: number,
): Promise<boolean> {
  try {
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    if (!row) return false;
    if (row.resetAt.getTime() <= Date.now()) return false;
    return row.count >= maxFailures;
  } catch (error) {
    console.error("Rate limit (cek) dilewati:", error);
    return false;
  }
}

export async function recordFailure(
  key: string,
  windowMs: number,
): Promise<void> {
  try {
    const resetAt = new Date(Date.now() + windowMs);
    // Atomik: jendela baru dimulai bila yang lama sudah lewat.
    await prisma.$executeRaw`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" <= NOW()
                       THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= NOW()
                         THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    `;
  } catch (error) {
    console.error("Rate limit (catat) dilewati:", error);
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  try {
    await prisma.rateLimit.deleteMany({ where: { key } });
  } catch (error) {
    console.error("Rate limit (reset) dilewati:", error);
  }
}

/** IP klien dari header proxy (best effort; bisa kosong). */
export function clientIpFromHeaders(
  h: { get(name: string): string | null } | null | undefined,
): string {
  const forwarded = h?.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() || h?.get("x-real-ip") || "unknown";
}
