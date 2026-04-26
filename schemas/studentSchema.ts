import { z } from "zod";

export const classSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  nisn: z.string().min(1, "NISN wajib diisi"),
  classId: z.string().min(1, "Kelas wajib diisi"),
});

export const updateClassSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  name: z.string().min(1, "Nama wajib diisi"),
  nisn: z.string().min(1, "NISN wajib diisi"),
  classId: z.string().min(1, "Kelas wajib diisi"),
});
