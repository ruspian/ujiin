import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { getAttemptDeadline } from "@/lib/exam-config";
import { seededShuffle } from "@/lib/seeded-shuffle";
import { buildCsv, csvCell } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GET } from "@/app/api/admin/arsip/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: { findMany: vi.fn() },
    academicYear: { findUnique: vi.fn() },
    attempt: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

describe("getAttemptDeadline + waktu tambahan", () => {
  test("tambahan detik menggeser batas, termasuk melewati jadwal selesai", () => {
    const mulai = new Date("2026-10-27T08:00:00Z");
    const jadwal = new Date("2026-10-27T09:00:00Z");
    expect(getAttemptDeadline(mulai, jadwal, 60, 600).toISOString()).toBe(
      "2026-10-27T09:10:00.000Z",
    );
    expect(getAttemptDeadline(mulai, jadwal, 60).toISOString()).toBe(
      "2026-10-27T09:00:00.000Z",
    );
  });
});

describe("seededShuffle", () => {
  const items = ["a", "b", "c", "d", "e"];
  test("deterministik untuk seed sama, isi tetap lengkap", () => {
    const x = seededShuffle(items, "att1:q1");
    expect(seededShuffle(items, "att1:q1")).toEqual(x);
    expect([...x].sort()).toEqual(items);
    expect(items).toEqual(["a", "b", "c", "d", "e"]);
  });
  test("seed berbeda umumnya menghasilkan urutan berbeda", () => {
    const orders = new Set(
      ["s1", "s2", "s3", "s4", "s5", "s6"].map((s) =>
        seededShuffle(items, s).join(""),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe("CSV", () => {
  test("escape koma/kutip dan netralkan rumus", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(null)).toBe("");
  });
  test("diawali BOM UTF-8", () => {
    expect(buildCsv([["a", "b"]]).startsWith("﻿")).toBe(true);
  });
});

describe("GET /api/admin/arsip", () => {
  const req = (q: string) => new Request(`http://x/api/admin/arsip?${q}`);
  beforeEach(() => {
    vi.clearAllMocks();
    (vi.mocked(auth) as Mock).mockResolvedValue({
      user: { id: "a", role: "ADMIN" },
    });
  });

  test("selain admin ditolak 403", async () => {
    (vi.mocked(auth) as Mock).mockResolvedValue({
      user: { id: "g", role: "GURU" },
    });
    expect((await GET(req("type=siswa"))).status).toBe(403);
    (vi.mocked(auth) as Mock).mockResolvedValue(null);
    expect((await GET(req("type=siswa"))).status).toBe(403);
  });

  test("type tidak valid / yearId kosong", async () => {
    expect((await GET(req("type=apa"))).status).toBe(400);
    expect((await GET(req("type=nilai"))).status).toBe(400);
  });

  test("arsip siswa berisi header dan baris", async () => {
    vi.mocked(prisma.student.findMany).mockResolvedValue([
      { nisn: "001", name: "Budi", status: "ACTIVE", class: { name: "X A", level: 10 } },
    ] as never);
    const res = await GET(req("type=siswa"));
    const text = await res.text();
    expect(res.headers.get("Content-Disposition")).toContain("Arsip_Daftar_Siswa.csv");
    expect(text).toContain("NISN,Nama,Kelas,Tingkat,Status");
    expect(text).toContain("001,Budi,X A,10,ACTIVE");
  });

  test("arsip nilai per tahun ajaran", async () => {
    vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
      year: "2026/2027",
      semester: "GANJIL",
    } as never);
    vi.mocked(prisma.attempt.findMany).mockResolvedValue([
      {
        score: 85,
        status: "COMPLETED",
        violationCount: 1,
        startTime: new Date("2026-10-27T08:00:00Z"),
        endTime: null,
        student: { nisn: "001", name: "Budi", class: { name: "X A" } },
        exam: {
          title: "UH 1",
          subject: { name: "MTK" },
          examType: { name: "UH" },
        },
      },
    ] as never);
    const res = await GET(req("type=nilai&yearId=y1"));
    const text = await res.text();
    expect(res.headers.get("Content-Disposition")).toContain("Arsip_Nilai_2026-2027_GANJIL.csv");
    expect(text).toContain("2026/2027,GANJIL,MTK,UH,UH 1,X A,001,Budi,85,COMPLETED,1");
  });
});
