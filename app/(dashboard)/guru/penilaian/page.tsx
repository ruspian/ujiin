import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BookOpen, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";

export default async function PilihMapelPenilaianPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "GURU") redirect("/login");

  const subjects = await prisma.subject.findMany({
    where: {
      teachers: {
        some: {
          id: session.user.id,
        },
      },
    },
    include: {
      exams: {
        where: {
          academicYear: { active: true },
        },
        select: { id: true },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Penilaian Ujian</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pilih mata pelajaran yang Anda ampu untuk mulai mengoreksi ujian di
          tahun akademik aktif.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <Link
            key={subject.id}
            href={`/guru/penilaian/${subject.id}`} // 🔥 Lanjut ke step 2: [subjectId]
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all group block cursor-pointer"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                  {subject.name}
                </h3>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <FileText size={16} className="text-gray-400" />
                <span>
                  <strong className="text-gray-900">
                    {subject.exams.length}
                  </strong>{" "}
                  Ujian Aktif
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                <ChevronRight size={18} />
              </div>
            </div>
          </Link>
        ))}

        {subjects.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <BookOpen size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium text-sm">
              Anda belum ditugaskan untuk mengampu mata pelajaran apapun.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
