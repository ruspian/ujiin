import { z } from "zod";

export const classSchema = z.object({
  level: z.string().min(1).max(13, "Level kelas tidak boleh kosong!"),
  name: z.string().min(1).max(50, "Nama kelas tidak boleh kosong!"),
});

export const updateClassSchema = z.object({
  id: z.string(),
  level: z.string().min(1).max(13, "Level kelas tidak boleh kosong!"),
  name: z.string().min(1).max(50, "Nama kelas tidak boleh kosong!"),
});
