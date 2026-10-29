import { describe, test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getToken = vi.hoisted(() => vi.fn());
vi.mock("next-auth/jwt", () => ({ getToken }));

import { proxy } from "@/proxy";

const req = (path: string) => new NextRequest(`https://ujian.test${path}`);
const redirectedTo = (res: Response) => {
  const loc = res.headers.get("location");
  return loc ? new URL(loc).pathname : null;
};

describe("proxy - gerbang akses per role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-secret";
  });

  test("tanpa login: /admin, /guru, /dashboard dan /cetak diarahkan ke /login", async () => {
    getToken.mockResolvedValue(null);
    for (const p of ["/admin/pengguna", "/guru/soal", "/dashboard", "/cetak/kelas-1"]) {
      expect(redirectedTo(await proxy(req(p)))).toBe("/login");
    }
  });

  test("guru tidak boleh membuka /admin maupun /cetak", async () => {
    getToken.mockResolvedValue({ id: "g1", role: "GURU" });
    for (const p of ["/admin/pengguna", "/admin/master/siswa", "/cetak/kelas-1"]) {
      expect(redirectedTo(await proxy(req(p)))).toBe("/dashboard");
    }
  });

  test("guru boleh membuka /guru dan /dashboard", async () => {
    getToken.mockResolvedValue({ id: "g1", role: "GURU" });
    for (const p of ["/guru/soal", "/dashboard"]) {
      expect(redirectedTo(await proxy(req(p)))).toBeNull();
    }
  });

  test("admin boleh membuka /admin, /cetak, dan /guru", async () => {
    getToken.mockResolvedValue({ id: "a1", role: "ADMIN" });
    for (const p of ["/admin/pengguna", "/cetak/kelas-1", "/guru/monitoring"]) {
      expect(redirectedTo(await proxy(req(p)))).toBeNull();
    }
  });

  test("cookie siswa palsu / mentah ditolak di /ujian dan /siswa", async () => {
    getToken.mockResolvedValue(null);
    const forged = new NextRequest("https://ujian.test/ujian/abc", {
      headers: { cookie: "student_session=siswa-id-mentah" },
    });
    expect(redirectedTo(await proxy(forged))).toBe("/login-siswa");
  });
});
