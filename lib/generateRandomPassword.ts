import { randomInt } from "crypto";

// Tanpa karakter yang mudah tertukar (0/O, 1/I/L).
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Dipakai untuk password awal siswa dan token ujian.
 * Memakai crypto.randomInt (CSPRNG), bukan Math.random yang bisa diprediksi.
 */
export function generateRandomPassword(length = 6) {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += CHARS.charAt(randomInt(CHARS.length));
  }
  return password;
}
