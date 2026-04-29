import { z } from "zod";

export const AcademicYearSchema = z.object({
  year: z.string(),
  semester: z.enum(["GANJIL", "GENAP"]),
});

export const UpdateAcademicYearSchema = z.object({
  id: z.string(),
  year: z.string(),
  semester: z.enum(["GANJIL", "GENAP"]),
});
