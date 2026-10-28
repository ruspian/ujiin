import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Semua halaman /admin hanya untuk ADMIN. Dicek lagi di sini (selain di proxy)
 * memakai role terbaru dari database, jadi admin yang baru diturunkan rolenya
 * langsung kehilangan akses.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return <>{children}</>;
}
