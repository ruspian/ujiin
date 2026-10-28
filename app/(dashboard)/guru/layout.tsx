import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Halaman /guru untuk GURU (dan ADMIN), dicek dengan role terbaru dari database. */
export default async function GuruLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "GURU" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
