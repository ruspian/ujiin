"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, ACCESS_DENIED } from "@/lib/require-role";
import type { DocBlock } from "@/lib/report-doc";
import {
  buildStudentWorkBlocks,
  type WorkQuestion,
} from "@/lib/student-work-report";
import type { AnswerValue } from "@/lib/grading";

export type CetakResult =
  | { success: true; blocks: DocBlock[]; fileName: string; title: string }
  | { success: false; message: string };

const STATUS: Record<string, string> = {
  SUBMITTED: "Selesai",
  CHEATED: "Dikeluarkan",
  ONGOING: "Mengerjakan",
};

/**
 * Dokumen hasil pekerjaan SEMUA siswa satu kelas pada satu ujian:
 * halaman pertama daftar nilai, lalu hasil tiap siswa (satu siswa per halaman).
 * Diambil saat tombol ditekan agar halaman daftar peserta tetap ringan.
 */
export async function getHasilKelasDokumen(
  examId: string,
  classId: string,
): Promise<CetakResult> {
  const user = await requireRole("GURU");
  if (!user) return { success: false, message: ACCESS_DENIED };
  if (!examId || !classId) {
    return { success: false, message: "Data tidak lengkap!" };
  }

  try {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, classes: { some: { id: classId } } },
      include: {
        subject: true,
        examType: true,
        questions: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!exam) return { success: false, message: "Ujian tidak ditemukan!" };

    // hanya guru pengampu mapel di kelas ini, atau pengawas ujian
    const assignment = await prisma.subjectAssignment.findUnique({
      where: { subjectId_classId: { subjectId: exam.subjectId, classId } },
      select: { teacherId: true },
    });
    if (assignment?.teacherId !== user.id && exam.supervisorId !== user.id) {
      return { success: false, message: ACCESS_DENIED };
    }

    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { name: true },
    });

    const students = await prisma.student.findMany({
      where: {
        classId,
        OR: [{ status: "ACTIVE" }, { attempts: { some: { examId } } }],
      },
      orderBy: { name: "asc" },
      include: { attempts: { where: { examId } } },
    });

    const questions: WorkQuestion[] = exam.questions.map((q) => ({
      id: q.id,
      type: q.type,
      score: q.score,
      correctAnswer: q.correctAnswer,
      text: q.text,
      options: q.options,
    }));

    const className = cls?.name ?? "-";
    const blocks: DocBlock[] = [
      { kind: "title", text: "HASIL UJIAN PER KELAS" },
      {
        kind: "subtitle",
        text: `${exam.title} - ${exam.subject.name}`.toUpperCase(),
      },
      {
        kind: "kv",
        rows: [
          ["Kelas", className],
          ["Jenis Ujian", exam.examType.name],
          ["Jumlah Peserta", String(students.length)],
        ],
      },
      {
        kind: "table",
        header: ["No", "Nama Siswa", "NISN", "Status", "Nilai"],
        widths: [6, 44, 18, 18, 14],
        center: [true, false, true, true, true],
        rows: students.map((s, i) => {
          const a = s.attempts[0];
          return [
            String(i + 1),
            s.name,
            s.nisn,
            a ? (STATUS[a.status] ?? a.status) : "Belum mengerjakan",
            a && a.score !== null ? String(Math.round(a.score)) : "-",
          ];
        }),
      },
    ];

    for (const s of students) {
      const a = s.attempts[0];
      if (!a || a.status === "ONGOING") continue; // hanya yang sudah selesai/dikeluarkan

      let answers: Record<string, AnswerValue> = {};
      try {
        const raw = typeof a.answers === "string" ? JSON.parse(a.answers) : a.answers;
        if (raw && typeof raw === "object") answers = raw as Record<string, AnswerValue>;
      } catch {
        // jawaban rusak: dicetak sebagai tidak dijawab
      }

      blocks.push({ kind: "pagebreak" });
      blocks.push(
        ...buildStudentWorkBlocks({
          studentName: s.name,
          nisn: s.nisn,
          className,
          examTitle: exam.title,
          subjectName: exam.subject.name,
          status: a.status,
          score: a.score,
          answers,
          essayScores: (a.essayScores as Record<string, number> | null) ?? null,
          questions,
        }),
      );
    }

    return {
      success: true,
      blocks,
      title: `Hasil ${exam.title} - ${className}`,
      fileName: `Hasil_${exam.title}_${className}`,
    };
  } catch (error) {
    console.error("ERROR_CETAK_HASIL_KELAS:", error);
    return { success: false, message: "Gagal menyiapkan dokumen." };
  }
}
