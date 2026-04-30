import { z } from "zod";

export const examTypeSchema = z.object({
  name: z.string().min(1, { message: "Nama Jenis Ujian wajib diisi!" }),
  code: z
    .string()
    .min(1, { message: "Kode/Singkatan wajib diisi!" })
    .max(10, { message: "Kode maksimal 10 karakter!" }),
});
