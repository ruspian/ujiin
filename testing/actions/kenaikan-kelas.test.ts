import { describe, test, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prosesKenaikanKelas } from "@/actions/kenaikan-kelas";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    class: { findUnique: vi.fn() },
    student: { updateMany: vi.fn() },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

describe("Server Action - Kenaikan Kelas & Kelulusan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    } as never);
  });

  test("Hanya admin yang boleh memproses", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "g", role: "GURU" } } as never);
    const res = await prosesKenaikanKelas(["s1"], "LULUS");
    expect(res.success).toBe(false);
    expect(prisma.student.updateMany).not.toHaveBeenCalled();
  });

  test("Lulus: hanya siswa ACTIVE yang diubah menjadi GRADUATED, data tidak dihapus", async () => {
    vi.mocked(prisma.student.updateMany).mockResolvedValue({ count: 3 });

    const res = await prosesKenaikanKelas(["s1", "s2", "s3"], "LULUS");

    expect(prisma.student.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["s1", "s2", "s3"] }, status: "ACTIVE" },
      data: { status: "GRADUATED" },
    });
    expect(res).toEqual({ success: true, message: "3 siswa berhasil diluluskan." });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/kenaikan-kelas");
  });

  test("Lulus untuk siswa yang sudah lulus: tidak error, dilaporkan jelas", async () => {
    vi.mocked(prisma.student.updateMany).mockResolvedValue({ count: 0 });
    const res = await prosesKenaikanKelas(["s1"], "LULUS");
    expect(res.success).toBe(false);
    expect(res.message).toContain("Tidak ada siswa aktif");
  });

  test("Sebagian sudah tidak aktif: yang aktif diproses, sisanya dilewati", async () => {
    vi.mocked(prisma.student.updateMany).mockResolvedValue({ count: 2 });
    const res = await prosesKenaikanKelas(["s1", "s2", "s3"], "LULUS");
    expect(res.success).toBe(true);
    expect(res.message).toContain("2 siswa berhasil diluluskan");
    expect(res.message).toContain("1 dilewati");
  });

  test("Naik kelas butuh kelas tujuan yang ada", async () => {
    expect((await prosesKenaikanKelas(["s1"], "NAIK_KELAS")).message).toBe("Pilih kelas tujuan!");

    vi.mocked(prisma.class.findUnique).mockResolvedValue(null);
    expect((await prosesKenaikanKelas(["s1"], "NAIK_KELAS", "c9")).message).toBe(
      "Kelas tujuan tidak ditemukan!",
    );
  });

  test("Naik kelas memindahkan hanya siswa ACTIVE", async () => {
    vi.mocked(prisma.class.findUnique).mockResolvedValue({ id: "c2" } as never);
    vi.mocked(prisma.student.updateMany).mockResolvedValue({ count: 1 });

    const res = await prosesKenaikanKelas(["s1"], "NAIK_KELAS", "c2");

    expect(prisma.student.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["s1"] }, status: "ACTIVE" },
      data: { classId: "c2" },
    });
    expect(res.success).toBe(true);
    expect(res.message).toContain("dinaikkan kelasnya");
  });
});
