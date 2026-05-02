import { z } from "zod";

export const examSchema = z.object({
  title: z.string().min(1, "Judul ujian wajib diisi!"),
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih!"),
  examTypeId: z.string().min(1, "Jenis ujian wajib dipilih!"),
  academicYearId: z.string().min(1, "Tahun ajaran wajib dipilih!"),
  startTime: z.string().min(1, "Waktu mulai wajib diisi!"),
  endTime: z.string().min(1, "Waktu selesai wajib diisi!"),
  duration: z.coerce.number().min(1, "Durasi minimal 1 menit!"),
  randomizeQuestions: z.boolean().default(true),
  showResult: z.boolean().default(false),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED"]).default("DRAFT"),
  classes: z.array(z.string()).min(1, "Minimal pilih satu kelas!"),
  questions: z.array(z.string()).min(1, "Minimal pilih satu soal!"),
});

export type ExamSchema = z.infer<typeof examSchema>;
