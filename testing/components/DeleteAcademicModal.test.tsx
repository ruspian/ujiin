import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import DeleteAcademicModal from "@/components/layout/DeleteAcademicModal";
import { deleteAcademicYear } from "@/actions/academic";
import { toast } from "sonner";

// 1. MOCKING DEPENDENSI SERVER ACTION & TOAST

vi.mock("@/actions/academic", () => ({
  deleteAcademicYear: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - DeleteAcademicModal", () => {
  let setIsModalDeleteOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  const mockItemData = {
    id: "acad-1",
    year: "2025/2026",
    semester: "Ganjil",
    active: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalDeleteOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (item = mockItemData, isSubmittingState = false) =>
    render(
      <DeleteAcademicModal
        itemData={item}
        setIsModalDeleteOpen={setIsModalDeleteOpenMock}
        isSubmitting={isSubmittingState}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

  // SKENARIO 1: RENDERING AWAL (DATA TIDAK AKTIF)

  test("Harus sukses merender konfirmasi hapus dan tombol tidak terkunci jika tahun ajaran tidak aktif", () => {
    const { getByText, getByRole, queryByText } = renderModal();

    expect(getByText("Hapus Tahun Ajaran?")).toBeInTheDocument();

    // Verifikasi teks dinamis sesuai data props
    expect(getByText("2025/2026 - Ganjil")).toBeInTheDocument();

    // Verifikasi peringatan aktif TIDAK muncul
    expect(
      queryByText(/Tahun ajaran ini sedang AKTIF/i),
    ).not.toBeInTheDocument();

    // Tombol hapus harusnya bisa diklik
    const tombolHapus = getByRole("button", { name: /ya, hapus data/i });
    expect(tombolHapus).not.toBeDisabled();
  });

  // SKENARIO 2: PERLINDUNGAN DATA AKTIF

  test("Harus memunculkan peringatan dan mengunci tombol hapus jika tahun ajaran sedang aktif", () => {
    // Ubah status item menjadi aktif
    const activeItem = { ...mockItemData, active: true };
    const { getByText, getByRole } = renderModal(activeItem);

    // Verifikasi peringatan muncul
    expect(getByText(/Tahun ajaran ini sedang/i)).toBeInTheDocument();
    expect(getByText("AKTIF")).toBeInTheDocument();

    // Tombol hapus WAJIB terkunci
    const tombolHapus = getByRole("button", { name: /ya, hapus data/i });
    expect(tombolHapus).toBeDisabled();
  });

  // SKENARIO 3: AKSI BATAL DAN PENUTUPAN MODAL

  test("Harus sukses menutup modal ketika tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = renderModal();

    const tombolBatal = getByRole("button", { name: /batal/i });
    fireEvent.click(tombolBatal);
    expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);

    const tombolX = getAllByRole("button")[0];
    if (!tombolX) throw new Error("Tombol X tidak ditemukan di DOM");
    fireEvent.click(tombolX);
    expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
  });

  // SKENARIO 4: SUCCESS FLOW (HAPUS BERHASIL)

  test("Harus memicu loading, memanggil server action, menampilkan toast sukses, dan menutup modal", async () => {
    vi.mocked(deleteAcademicYear).mockResolvedValue({
      success: true,
      message: "Tahun ajaran berhasil dihapus!",
    });

    const { getByRole } = renderModal();
    const tombolHapus = getByRole("button", { name: /ya, hapus data/i });

    await act(async () => {
      fireEvent.click(tombolHapus);
    });

    // Cek status loading dilempar ke parent
    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(deleteAcademicYear).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Tahun ajaran berhasil dihapus!",
      );
      expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // SKENARIO 5: ERROR HANDLING

  test("Harus menampilkan toast error jika server gagal menghapus data", async () => {
    vi.mocked(deleteAcademicYear).mockResolvedValue({
      success: false,
      message: "Gagal menghapus karena ada data siswa terkait!",
    });

    const { getByRole } = renderModal();
    const tombolHapus = getByRole("button", { name: /ya, hapus data/i });

    await act(async () => {
      fireEvent.click(tombolHapus);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal menghapus karena ada data siswa terkait!",
      );
      // Modal wajib tetap terbuka kalau error
      expect(setIsModalDeleteOpenMock).not.toHaveBeenCalled();
    });
  });

  test("Harus merubah teks tombol menjadi 'Menghapus...' saat isSubmitting = true", () => {
    const { getByRole, getByText } = renderModal(mockItemData, true); // Set loading ke true

    const tombolLoading = getByRole("button", { name: /menghapus.../i });

    expect(getByText("Menghapus...")).toBeInTheDocument();
    expect(tombolLoading).toBeDisabled();
  });
});
