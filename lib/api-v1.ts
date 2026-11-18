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
