import AdminView from "@/components/layout/AdminView";
import GuruView from "@/components/layout/GuruView";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    return <AdminView />;
  } else if (session.user.role === "GURU") {
    const namaGuru = session.user.name || "Guru";
    return <GuruView namaGuru={namaGuru} />;
  }

  return (
    <div className="p-8 text-center text-gray-500">
      Maaf, dashboard untuk role Anda belum tersedia.
    </div>
  );
}
