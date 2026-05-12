import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClipboardCheck, Users, Calendar } from "lucide-react";
import Link from "next/link";

export default async function KoreksiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const exams = await prisma.exam.findMany({
    where: {
      subject: {
        teachers: {
          some: {
            id: session.user.id,
          },
        },
      },
    },
    include: {
      subject: true,
      examType: true,
      _count: {
        select: {
          attempts: {
            where: { status: "SUBMITTED" },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Koreksi Jawaban</h1>
        <p className="text-gray-500 text-sm">
          Pilih ujian dari mata pelajaran yang Anda ampu untuk melakukan
          penilaian.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ClipboardCheck size={24} />
              </div>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase">
                {exam.examType.name}
              </span>
            </div>

            <h3
              className="font-bold text-gray-900 mb-1 line-clamp-1"
              title={exam.title}
            >
              {exam.title}
            </h3>
            <p className="text-xs font-semibold text-blue-600 mb-4">
              {exam.subject.name}
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Users size={14} className="text-gray-400" />
                <span>
                  <span className="font-bold text-gray-900">
                    {exam._count.attempts}
                  </span>{" "}
                  Siswa sudah mengumpulkan
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Calendar size={14} className="text-gray-400" />
                <span>
                  {new Date(exam.startTime).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <Link
              href={`/guru/koreksi/${exam.id}`}
              className="block w-full text-center py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors"
            >
              Lihat Daftar Siswa
            </Link>
          </div>
        ))}

        {exams.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <ClipboardCheck size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium text-sm">
              Belum ada ujian untuk mata pelajaran yang Anda ampu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
