import { getSchoolProfile } from "@/actions/school";
import SchoolProfileForm from "@/components/layout/SchoolProfile";

export default async function SettingsPage() {
  const profile = await getSchoolProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-sm text-gray-500">
          Sesuaikan identitas sekolah dan informasi lainnya untuk kebutuhan
          administrasi dan laporan.
        </p>
      </div>

      <div className="max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SchoolProfileForm initialData={profile.data} />
      </div>
    </div>
  );
}
