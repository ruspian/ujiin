import { describe, test, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import AdminView from "@/components/layout/AdminView";
import { prisma } from "@/lib/prisma";

// 1. MOCKING DEPENDENSI DATABASE PRISMA

// Kita mem-mock metode Prisma agar tidak benar-benar menembak ke database sungguhan saat testing
vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: { count: vi.fn() },
    user: { count: vi.fn() },
    subject: { count: vi.fn() },
    exam: { count: vi.fn(), findMany: vi.fn() },
  },
}));

describe("Pengujian Komponen Server (RSC) - AdminView Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // SKENARIO 1: RENDERING DASHBOARD DENGAN DATA

  test("Harus sukses merender dashboard dengan data statistik, jadwal aktif, dan aktivitas terkini", async () => {
    // 1. Mock nilai kembalian untuk kartu statistik (Promise.all 4 baris pertama)
    vi.mocked(prisma.student.count).mockResolvedValue(1204);
    vi.mocked(prisma.user.count).mockResolvedValue(45);
    vi.mocked(prisma.subject.count).mockResolvedValue(18);
    vi.mocked(prisma.exam.count).mockResolvedValue(3);

    // 2. Mock nilai kembalian untuk tabel ujian dan aktivitas.
    // Kita menggunakan trik casting "unknown" agar terhindar dari virus 'any'
    // karena Prisma mewajibkan struktur schema yg sangat rumit jika tidak di-cast.
    const mockFindMany = prisma.exam.findMany as unknown as ReturnType<
      typeof vi.fn
    >;

    // Panggilan .findMany() pertama (upcomingExamsData)
    mockFindMany.mockResolvedValueOnce([
      {
        id: "exam-1",
        title: "PAS Matematika Kelas 10",
        startTime: new Date("2026-05-20T08:00:00Z"),
        status: "PUBLISHED",
        classes: [{ name: "10 RPL 1" }, { name: "10 RPL 2" }],
      },
    ]);

    // Panggilan .findMany() kedua (recentExamsData)
    mockFindMany.mockResolvedValueOnce([
      {
        id: "exam-1",
        title: "PAS Matematika Kelas 10",
        createdAt: new Date("2026-05-19T10:00:00Z"),
      },
    ]);

    // 3. Karena ini Server Component, kita bisa mengeksekusi (await) fungsinya secara langsung!
    const RSC_UI = await AdminView();
    const { getByText } = render(RSC_UI);

    // 4. Verifikasi Render Banner & Angka Statistik
    expect(getByText("Selamat Datang, Admin! 👋")).toBeInTheDocument();
    expect(getByText("1204")).toBeInTheDocument();
    expect(getByText("45")).toBeInTheDocument();
    expect(getByText("18")).toBeInTheDocument();
    expect(getByText("3")).toBeInTheDocument();

    // 5. Verifikasi Render Jadwal Ujian Terdekat
    expect(getByText("PAS Matematika Kelas 10")).toBeInTheDocument();
    expect(getByText("10 RPL 1, 10 RPL 2")).toBeInTheDocument();
    expect(getByText("PUBLISHED")).toBeInTheDocument();

    // 6. Verifikasi Render Aktivitas Sistem (Log aksi generator text urutan index % 4 = 0)
    expect(
      getByText("Admin menambahkan jadwal PAS Matematika Kelas 10"),
    ).toBeInTheDocument();
  });

  // SKENARIO 2: RENDERING DASHBOARD KOSONG (EMPTY STATE)

  test("Harus sukses merender status kosong jika belum ada data ujian atau aktivitas di database", async () => {
    // Setel semuanya menjadi nol
    vi.mocked(prisma.student.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.subject.count).mockResolvedValue(0);
    vi.mocked(prisma.exam.count).mockResolvedValue(0);

    const mockFindMany = prisma.exam.findMany as unknown as ReturnType<
      typeof vi.fn
    >;

    // Kembalikan array kosong untuk jadwal aktif dan aktivitas
    mockFindMany.mockResolvedValueOnce([]);
    mockFindMany.mockResolvedValueOnce([]);

    const RSC_UI = await AdminView();
    const { getByText, getAllByText } = render(RSC_UI);

    // Verifikasi Render Empty State mendarat di DOM
    expect(
      getByText("Belum ada jadwal ujian terdekat yang aktif."),
    ).toBeInTheDocument();
    expect(getByText("Belum ada aktivitas terekam.")).toBeInTheDocument();

    //  Gunakan getAllByText karena angka "0" akan muncul di ke-4 kartu statistik
    const elemenNol = getAllByText("0");
    expect(elemenNol).toHaveLength(4); // Pastikan benar-benar ada 4 kotak yang merender angka 0
  });
});
