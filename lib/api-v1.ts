import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

/** API untuk aplikasi desktop guru/admin (sesi memakai cookie login yang sama dengan web). */
export type StaffUser = { id: string; name: string; username: string; role: Role };

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export const fail = (message: string, status = 400) =>
  json({ success: false, message }, status);

export async function requireStaff(
  ...roles: Role[]
): Promise<StaffUser | null> {
  const session = await auth();
  const user = session?.user;
  const allowed: Role[] = roles.length ? roles : ["ADMIN", "GURU"];
  if (!user?.id || !allowed.includes(user.role)) return null;
  return {
    id: user.id,
    name: user.name ?? "",
    username: user.username,
    role: user.role,
  };
}

/**
 * Rentang tanggal sebuah tahun ajaran ("2025/2026" → 1 Jul 2025 s/d 30 Jun 2026, WITA).
 * Soal tidak punya kolom tahun ajaran, jadi dipakai tanggal dibuat.
 */
export function yearRange(year: string): { gte: Date; lt: Date } | null {
  const m = /^(\d{4})\s*\/\s*(\d{4})$/.exec(year.trim());
  if (!m) return null;
  return {
    gte: new Date(`${m[1]}-07-01T00:00:00+08:00`),
    lt: new Date(`${m[2]}-07-01T00:00:00+08:00`),
  };
}
