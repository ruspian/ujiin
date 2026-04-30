import { z } from "zod";

export const religionSchema = z.object({
  name: z.string().min(1, { message: "Nama Agama wajib diisi!" }),
});
