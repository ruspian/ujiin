import { z } from "zod";

const questionTypeEnum = z.enum([
  "MULTIPLE_CHOICE",
  "MULTIPLE_CHOICE_COMPLEX",
  "MATCHING",
  "ESSAY",
  "TRUE_FALSE",
]);

export const questionSchema = z.object({
  subjectId: z.string().min(1, { message: "Mata pelajaran wajib dipilih!" }),

  classId: z.string().min(1, { message: "Kelas tidak valid!" }),

  typeId: z.string().min(1, { message: "Kategori ujian wajib dipilih!" }),
  type: questionTypeEnum,
  text: z
    .string()
    .min(3, { message: "Teks soal terlalu pendek, minimal 3 karakter!" }),
  score: z.coerce.number().min(1, { message: "Bobot nilai minimal 1!" }),

  options: z.any(),

  correctAnswer: z.string().min(1, { message: "Kunci jawaban wajib diisi!" }),
});

export type QuestionFormValues = z.infer<typeof questionSchema>;
