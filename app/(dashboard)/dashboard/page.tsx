import { prisma } from "@/lib/prisma";
import {
  Users,
  GraduationCap,
  BookOpen,
  Activity,
  CalendarClock,
  ChevronRight,
  MonitorPlay,
  FileText,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const [
    totalSiswa,
    totalGuru,
    totalMapel,
    totalUjianAktif,
    upcomingExamsData,
    recentExamsData,
  ] = await Promise.all([
    prisma.student.count(),

    prisma.user.count({ where: { role: "GURU" } }),

    prisma.subject.count(),

    prisma.exam.count({ where: { status: "PUBLISHED" } }),

    prisma.exam.findMany({
      where: {
        status: { not: "COMPLETED" },
        endTime: { gt: new Date() },
      },
      orderBy: { startTime: "asc" },
      take: 4,
      include: { classes: true },
    }),

    prisma.exam.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const formatWITA = (date: Date) => {
    return (
      new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Makassar",
      }).format(date) + " WITA"
    );
  };

  const stats = [
    {
      title: "Total Siswa",
      value: totalSiswa.toString(),
      trend: "Data master aktif",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Total Guru",
      value: totalGuru.toString(),
      trend: "Akun pengajar",
      icon: GraduationCap,
      color: "text-indigo-600",
      bg: "bg-indigo-100",
    },
    {
      title: "Mata Pelajaran",
      value: totalMapel.toString(),
      trend: "Tersimpan di sistem",
      icon: BookOpen,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      title: "Ujian Aktif",
      value: totalUjianAktif.toString(),
      trend: "Status Published",
      icon: Activity,
      color: "text-teal-600",
      bg: "bg-teal-100",
    },
  ];

  const upcomingExams = upcomingExamsData.map((exam) => ({
    id: exam.id,
    title: exam.title,
    classes:
      exam.classes.length > 0
        ? exam.classes.map((c) => c.name).join(", ")
        : "Belum ada kelas",
    time: formatWITA(exam.startTime),
    status: exam.status,
  }));

  const recentActivities = recentExamsData.map((exam, i) => {
    const actionTexts = [
      "Admin menambahkan jadwal",
      "Jadwal baru dibuat:",
      "Sistem mencatat ujian",
      "Update jadwal:",
    ];
    return {
      id: exam.id,
      log: `${actionTexts[i % 4]} ${exam.title}`,
      time: formatWITA(exam.createdAt),
    };
  });

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-teal-600 to-indigo-700 p-8 text-white shadow-lg">
        <div className="relative z-10 md:w-2/3">
          <h1 className="mb-2 text-3xl font-bold">Selamat Datang, Admin! 👋</h1>
          <p className="mb-6 text-teal-100 text-sm leading-relaxed">
            Ini adalah pusat kendali sistem ujiin. Pantau aktivitas siswa,
            kelola jadwal ujian, dan pastikan pelaksanaan ujian di sekolah
            berjalan lancar tanpa hambatan.
          </p>
          <div className="flex gap-3">
            <Link
              href="/admin/monitoring"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-teal-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <MonitorPlay size={18} /> Pantau Ujian
            </Link>
            <Link
              href="/admin/jadwal"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-800/40 border border-teal-500/30 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800/60 transition-colors backdrop-blur-sm"
            >
              <CalendarClock size={18} /> Buat Jadwal Baru
            </Link>
          </div>
        </div>
        <div className="absolute -right-10 -top-24 opacity-20 hidden md:block">
          <TrendingUp size={300} strokeWidth={1} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}
              >
                <Icon size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {stat.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-gray-400">{stat.trend}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarClock size={20} className="text-teal-600" /> Jadwal Ujian
              Terdekat
            </h2>
            <Link
              href="/admin/jadwal"
              className="text-sm font-semibold text-teal-600 hover:text-teal-700 flex items-center"
            >
              Lihat Semua <ChevronRight size={16} />
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {upcomingExams.length > 0 ? (
                upcomingExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="p-5 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-bold text-gray-900">{exam.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <Users size={14} /> {exam.classes}
                      </p>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                        {exam.time}
                      </span>
                      {exam.status === "PUBLISHED" && (
                        <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2.5 py-1 rounded-full">
                          PUBLISHED
                        </span>
                      )}
                      {exam.status === "DRAFT" && (
                        <span className="text-xs font-bold text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full">
                          DRAFT
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  Belum ada jadwal ujian terdekat yang aktif.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Activity size={20} className="text-orange-500" /> Aktivitas
              Sistem
            </h2>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="relative border-l-2 border-gray-100 ml-3 space-y-6">
                {recentActivities.length > 0 ? (
                  recentActivities.map((act) => (
                    <div key={act.id} className="relative pl-5">
                      <div className="absolute -left-5.25 top-1 h-3 w-3 rounded-full border-2 border-white bg-orange-400"></div>
                      <p className="text-sm font-medium text-gray-800 leading-snug">
                        {act.log}
                      </p>
                      <span className="text-xs text-gray-400 mt-1 block">
                        {act.time}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 pl-4">
                    Belum ada aktivitas terekam.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <FileText size={20} className="text-indigo-500" /> Jalan Pintas
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/admin/master/siswa"
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-indigo-200 transition-all group"
              >
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg mb-2 group-hover:scale-110 transition-transform">
                  <Users size={20} />
                </div>
                <span className="text-xs font-semibold text-gray-700">
                  Data Siswa
                </span>
              </Link>
              <Link
                href="/admin/pengguna"
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-indigo-200 transition-all group"
              >
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg mb-2 group-hover:scale-110 transition-transform">
                  <GraduationCap size={20} />
                </div>
                <span className="text-xs font-semibold text-gray-700">
                  Data Guru
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
