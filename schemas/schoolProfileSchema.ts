import { z } from "zod";

export const schoolProfileSchema = z.object({
  name: z.string().min(1, { message: "Nama Sekolah wajib diisi!" }),
  npsn: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
});
