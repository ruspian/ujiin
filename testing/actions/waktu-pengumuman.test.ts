import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tambahWaktuUjian, kirimPengumumanUjian } from "@/actions/monitoring";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    exam: { findUnique: vi.fn(), update: vi.fn() },
    attempt: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const asGuru = () =>
  (vi.mocked(auth) as Mock).mockResolvedValue({
    user: { id: "guru-1", role: "GURU" },
  });

describe("tambahWaktuUjian", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asGuru();
    vi.mocked(prisma.exam.findUnique).mockResolvedValue({
      supervisorId: "guru-1",
      authorId: "x",
    } as never);
    vi.mocked(prisma.attempt.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  test("siswa menolak", async () => {
    (vi.mocked(auth) as Mock).mockResolvedValue({
      user: { id: "s", role: "STUDENT" },
    });
    const r = await tambahWaktuUjian("e1", 10);
    expect(r.success).toBe(false);
    expect(prisma.attempt.updateMany).not.toHaveBeenCalled();
  });

  test("guru yang bukan pengawas/pembuat ditolak", async () => {
    vi.mocked(prisma.exam.findUnique).mockResolvedValue({
      supervisorId: "lain",
      authorId: "lain",
    } as never);
    expect((await tambahWaktuUjian("e1", 10)).success).toBe(false);
  });

  test("menolak menit di luar 1-60", async () => {
    expect((await tambahWaktuUjian("e1", 0)).success).toBe(false);
    expect((await tambahWaktuUjian("e1", 61)).success).toBe(false);
    expect((await tambahWaktuUjian("e1", NaN)).success).toBe(false);
  });

  test("menambah detik ke siswa yang sedang mengerjakan", async () => {
    vi.mocked(prisma.attempt.findMany).mockResolvedValue([
      { id: "a1", extraSeconds: 0 },
      { id: "a2", extraSeconds: 600 },
    ] as never);
    const r = await tambahWaktuUjian("e1", 10);
    expect(r.success).toBe(true);
    expect(prisma.attempt.updateMany).toHaveBeenCalledWith({
      where: { id: "a1", status: "ONGOING" },
      data: { extraSeconds: 600 },
    });
    expect(prisma.attempt.updateMany).toHaveBeenCalledWith({
      where: { id: "a2", status: "ONGOING" },
      data: { extraSeconds: 1200 },
    });
  });

  test("dibatasi total 180 menit", async () => {
    vi.mocked(prisma.attempt.findMany).mockResolvedValue([
      { id: "a1", extraSeconds: 175 * 60 },
    ] as never);
    await tambahWaktuUjian("e1", 30);
    expect(prisma.attempt.updateMany).toHaveBeenCalledWith({
      where: { id: "a1", status: "ONGOING" },
      data: { extraSeconds: 180 * 60 },
    });
  });

  test("gagal bila tidak ada yang sedang mengerjakan", async () => {
    vi.mocked(prisma.attempt.findMany).mockResolvedValue([] as never);
    expect((await tambahWaktuUjian("e1", 10, "s1")).success).toBe(false);
  });
});

describe("kirimPengumumanUjian", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asGuru();
    vi.mocked(prisma.exam.findUnique).mockResolvedValue({
      supervisorId: "guru-1",
      authorId: "x",
    } as never);
    vi.mocked(prisma.exam.update).mockResolvedValue({} as never);
  });

  test("menyimpan pengumuman yang sudah dirapikan", async () => {
    const r = await kirimPengumumanUjian("e1", "  Waktu   10 menit lagi \n");
    expect(r.success).toBe(true);
    const arg = vi.mocked(prisma.exam.update).mock.calls[0][0] as {
      data: { announcement: string };
    };
    expect(arg.data.announcement).toBe("Waktu 10 menit lagi");
  });

  test("menolak kosong / terlalu panjang / bukan pengawas", async () => {
    expect((await kirimPengumumanUjian("e1", "   ")).success).toBe(false);
    expect((await kirimPengumumanUjian("e1", "x".repeat(301))).success).toBe(false);
    vi.mocked(prisma.exam.findUnique).mockResolvedValue({
      supervisorId: "l",
      authorId: "l",
    } as never);
    expect((await kirimPengumumanUjian("e1", "halo")).success).toBe(false);
    expect(prisma.exam.update).not.toHaveBeenCalled();
  });
});
