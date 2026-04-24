import { redirect } from "next/navigation";
import AdminDashboard from "@/components/layout/AdminDashboard";
import GuruDashboard from "@/components/layout/GuruDashboard";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { name, role } = session.user;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Selamat datang, {name}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Anda login sebagai{" "}
          <span className="font-semibold text-teal-600">{role}</span>. Berikut
          adalah ringkasan sistem hari ini.
        </p>
      </div>

      {role === "ADMIN" && <AdminDashboard />}
      {role === "GURU" && <GuruDashboard />}

      {role === "SISWA" && (
        <div className="rounded-xl bg-red-50 p-4 text-red-600">
          Akses ditolak. Halaman ini bukan untuk siswa.
        </div>
      )}
    </div>
  );
}
