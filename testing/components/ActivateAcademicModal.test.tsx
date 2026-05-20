import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import ActivateAcademicModal from "@/components/layout/ActivateAcademicModal";
import { setActiveAcademicYear } from "@/actions/academic";
import { toast } from "sonner";
import { AcademicYear } from "@prisma/client";

//  MOCKING DEPENDENSI SERVER ACTION & TOAST

vi.mock("@/actions/academic", () => ({
  setActiveAcademicYear: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - ActivateAcademicModal (Synchronous Fire Mode)", () => {
  const mockItemData: AcademicYear = {
    id: "ay-2026",
    year: "2025/2026",
    semester: "GENAP",
    active: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let setIsModalActivateOpenMock: Mock<(open: boolean) => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalActivateOpenMock = vi.fn();
  });

  // RENDERING KOMPONEN & KONTEN TEXT

  test("Harus sukses merender informasi modal dengan informasi tahun ajaran yang tepat", () => {
    const { getByText } = render(
      <ActivateAcademicModal
        itemData={mockItemData}
        setIsModalActivateOpen={setIsModalActivateOpenMock}
      />,
    );

    expect(getByText("Aktifkan Tahun Ajaran?")).toBeInTheDocument();
    expect(getByText("2025/2026")).toBeInTheDocument();
    expect(getByText("GENAP")).toBeInTheDocument();
    expect(
      getByText(
        /Mengaktifkan tahun ajaran ini akan secara otomatis menonaktifkan tahun ajaran lainnya/i,
      ),
    ).toBeInTheDocument();
  });

  //  AKSI PENUTUPAN MODAL

  test("Harus sukses memicu penutupan modal saat tombol 'Batal' atau tombol silang 'X' diklik", () => {
    const { getByRole, getAllByRole } = render(
      <ActivateAcademicModal
        itemData={mockItemData}
        setIsModalActivateOpen={setIsModalActivateOpenMock}
      />,
    );

    const tombolBatal = getByRole("button", { name: /batal/i });
    fireEvent.click(tombolBatal);
    expect(setIsModalActivateOpenMock).toHaveBeenCalledWith(false);

    const tombolSilang = getAllByRole("button")[0];
    if (!tombolSilang)
      throw new Error("Tombol silang X tidak ditemukan di DOM");
    fireEvent.click(tombolSilang);
    expect(setIsModalActivateOpenMock).toHaveBeenCalledWith(false);
  });

  //  PROSES EKSEKUSI BERHASIL

  test("Harus memicu loading state, memanggil Server Action, memunculkan toast sukses, lalu menutup modal", async () => {
    // Gunakan penundaan Promise terkontrol tanpa menyentuh fakeTimers lingkungan global
    let resolveAction: (value: {
      success: boolean;
      message: string;
    }) => void = () => {};

    vi.mocked(setActiveAcademicYear).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveAction = resolve;
      });
    });

    const { getByText, getByRole } = render(
      <ActivateAcademicModal
        itemData={mockItemData}
        setIsModalActivateOpen={setIsModalActivateOpenMock}
      />,
    );

    const tombolAktifkan = getByRole("button", { name: /^aktifkan$/i });

    // Tembakkan klik secara sinkronus agar tidak menahan siklus event loop
    fireEvent.click(tombolAktifkan);

    //  Verifikasi Loading State tertangkap basah dengan aman!
    expect(getByText("Memproses...")).toBeInTheDocument();
    expect(tombolAktifkan).toBeDisabled();

    //  Selesaikan resolusi promise Server Action secara manual
    resolveAction({
      success: true,
      message: "Tahun ajaran berhasil diaktifkan!",
    });

    //  Pastikan kelanjutan efek visualnya tereksekusi pasca-loading
    await waitFor(() => {
      expect(setActiveAcademicYear).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Tahun ajaran berhasil diaktifkan!",
      );
      expect(setIsModalActivateOpenMock).toHaveBeenCalledWith(false);
    });
  });

  //  PENANGANAN EROR SERVER ACTION

  test("Harus sukses menangkap pesan kegagalan dari server action dan menampilkannya melalui toast error", async () => {
    vi.mocked(setActiveAcademicYear).mockResolvedValue({
      success: false,
      message: "Gagal memproses, tahun ajaran tidak ditemukan!",
    });

    const { getByRole } = render(
      <ActivateAcademicModal
        itemData={mockItemData}
        setIsModalActivateOpen={setIsModalActivateOpenMock}
      />,
    );

    const tombolAktifkan = getByRole("button", { name: /^aktifkan$/i });

    fireEvent.click(tombolAktifkan);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal memproses, tahun ajaran tidak ditemukan!",
      );
      expect(setIsModalActivateOpenMock).not.toHaveBeenCalledWith(false);
      expect(tombolAktifkan).not.toBeDisabled();
    });
  });
});
