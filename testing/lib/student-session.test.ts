import { describe, test, expect } from "vitest";
import {
  signStudentSession,
  verifyStudentSession,
  STUDENT_SESSION_MAX_AGE,
} from "@/lib/student-session";

describe("student-session - cookie sesi bertanda tangan", () => {
  test("token sah diterima dan mengembalikan ID siswa", async () => {
    const token = await signStudentSession("std-1");
    expect(await verifyStudentSession(token)).toBe("std-1");
  });

  test("ID mentah, token kosong, atau format salah ditolak", async () => {
    for (const bad of ["std-1", "", null, undefined, "a.b", "std-1.999.xxx", "x".repeat(400)]) {
      expect(await verifyStudentSession(bad as string)).toBeNull();
    }
  });

  test("ID siswa diganti (pemalsuan) -> tanda tangan tidak cocok", async () => {
    const token = await signStudentSession("std-1");
    const [, exp, sig] = token.split(".");
    expect(await verifyStudentSession(`std-2.${exp}.${sig}`)).toBeNull();
  });

  test("masa berlaku diperpanjang manual -> ditolak", async () => {
    const token = await signStudentSession("std-1");
    const [id, , sig] = token.split(".");
    const farFuture = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
    expect(await verifyStudentSession(`${id}.${farFuture}.${sig}`)).toBeNull();
  });

  test("token kedaluwarsa ditolak", async () => {
    const past = Date.now() - (STUDENT_SESSION_MAX_AGE + 60) * 1000;
    const token = await signStudentSession("std-1", past);
    expect(await verifyStudentSession(token)).toBeNull();
  });
});
