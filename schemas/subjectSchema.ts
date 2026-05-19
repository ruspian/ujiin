import { z } from "zod";

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Nama mata pelajaran wajib diisi!"),

  religionId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== "" ? val.trim() : null)),
  teacherIds: z.array(z.string()).default([]),
  classIds: z.array(z.string()).default([]),
});

export const updateSubjectSchema = subjectSchema.extend({
  id: z.string().min(1, "ID mapel tidak valid!"),
});
