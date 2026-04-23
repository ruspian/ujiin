import { z } from "zod";

export const setupSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong!"),
  username: z.string().min(1, "Username tidak boleh kosong!"),
  password: z.string().min(8, "Password minimal 8 karakter!"),
});
