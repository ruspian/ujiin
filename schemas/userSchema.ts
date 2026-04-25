import { z } from "zod";

export const UserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  username: z.string().min(5, "Username minimal 5 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["ADMIN", "GURU"], "Role harus ADMIN atau GURU"),
});

export const UpdateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nama wajib diisi"),
  username: z.string().min(5, "Username minimal 5 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter").or(z.literal("")),
  role: z.enum(["ADMIN", "GURU"], {
    message: "Role harus ADMIN atau GURU",
  }),
});
