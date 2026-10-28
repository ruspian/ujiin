import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

export const ACCESS_DENIED = "Akses ditolak!";

/**
 * Pengecekan login + role untuk server action.
 *
 * Server action adalah endpoint publik: pengecekan di halaman/UI TIDAK cukup
 * karena siapa pun bisa memanggil action langsung. Pakai di awal setiap action:
 *
 *   const user = await requireRole("ADMIN");
 *   if (!user) return { success: false, message: ACCESS_DENIED };
 *
 * @returns user yang sedang login bila rolenya termasuk `roles`, selain itu null.
 */
export async function requireRole(...roles: Role[]) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !roles.includes(user.role)) return null;
  return user;
}
