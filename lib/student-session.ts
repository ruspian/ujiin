/**
 * Sesi login siswa yang DITANDATANGANI (HMAC-SHA256).
 *
 * Sebelumnya cookie `student_id` berisi ID siswa mentah. Siapa pun yang tahu
 * (atau menebak) ID siswa lain bisa membuat cookie itu sendiri di browser dan
 * langsung masuk sebagai siswa tersebut tanpa password. Sekarang isi cookie
 * adalah token bertanda tangan yang hanya bisa dibuat server.
 *
 * Hanya memakai Web Crypto sehingga bisa dipakai di proxy.ts maupun server action.
 */

export const STUDENT_COOKIE = "student_session";
export const STUDENT_SESSION_MAX_AGE = 60 * 60 * 12; // 12 jam

const encoder = new TextEncoder();

let devSecret: string | null = null;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET belum diatur di environment.");
  }
  // Hanya development: kunci acak per proses (sesi lama tidak valid saat restart)
  devSecret ??= crypto.randomUUID() + crypto.randomUUID();
  return devSecret;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`student-session:${payload}`),
  );
  return toBase64Url(sig);
}

/** Perbandingan waktu-konstan agar tanda tangan tidak bisa ditebak lewat timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Format token: `<studentId>.<kadaluarsa(detik epoch)>.<tandatangan>` */
export async function signStudentSession(
  studentId: string,
  now: number = Date.now(),
): Promise<string> {
  const exp = Math.floor(now / 1000) + STUDENT_SESSION_MAX_AGE;
  const payload = `${studentId}.${exp}`;
  return `${payload}.${await sign(payload)}`;
}

/** @returns studentId bila token sah dan belum kedaluwarsa, selain itu null. */
export async function verifyStudentSession(
  token: string | undefined | null,
  now: number = Date.now(),
): Promise<string | null> {
  if (!token || typeof token !== "string" || token.length > 300) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [studentId, expText, signature] = parts;
  if (!studentId || !/^\d+$/.test(expText)) return null;

  if (Number(expText) * 1000 < now) return null;

  const expected = await sign(`${studentId}.${expText}`);
  return safeEqual(expected, signature) ? studentId : null;
}
