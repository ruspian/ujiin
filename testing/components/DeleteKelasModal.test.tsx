import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import DeleteKelasModal from "@/components/layout/DeleteKelasModal"; // Sesuaikan path jika berbeda
import { deleteClass } from "@/actions/class";
import { toast } from "sonner";
import { DeleteKelasModalProps } from "@/types/class";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/class", () => ({
  deleteClass: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - DeleteKelasModal", () => {
  let setIsModalDeleteOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  // 🔥 Casting data tiruan murni menggunakan kontrak interface asli tanpa 'any'
  const mockData = {
    id: "cls-777",
    name: "XII RPL 1",
  } as unknown as DeleteKelasModalProps["data"];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalDeleteOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (isSubmitting = false) =>
    render(
      <DeleteKelasModal
        data={mockData}
        name="Kelas"
        isSubmitting={isSubmitting}
        setIsModalDeleteOpen={setIsModalDeleteOpenMock}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL
  // ==========================================
  test("Harus sukses merender judul, teks dinamis nama kelas, dan tombol hapus", () => {
    const { getByText, getByRole } = renderModal();

    expect(getByText("Hapus Kelas?")).toBeInTheDocument();
    expect(getByText("XII RPL 1")).toBeInTheDocument();
    expect(getByRole("button", { name: /ya, hapus/i })).not.toBeDisabled();
  });

  // ==========================================
  // SKENARIO 2: AKSI BATAL
  // ==========================================
  test("Harus memanggil setIsModalDeleteOpen(false) saat tombol Batal diklik", () => {
    const { getByRole } = renderModal();

    fireEvent.click(getByRole("button", { name: /batal/i }));
    expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
  });

  // ==========================================
  // SKENARIO 3: SUCCESS FLOW (HAPUS BERHASIL)
  // ==========================================
  test("Harus memicu Server Action, mengubah state submitting, dan memunculkan toast sukses", async () => {
    vi.mocked(deleteClass).mockResolvedValue({
      success: true,
      message: "Kelas berhasil dihapus!",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    // Verifikasi alur pemanggilan state dan action
    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);
    expect(deleteClass).toHaveBeenCalledWith("cls-777");

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Kelas berhasil dihapus!");
      expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 4: ERROR HANDLING
  // ==========================================
  test("Harus memunculkan toast error jika Server Action gagal menghapus data", async () => {
    vi.mocked(deleteClass).mockResolvedValue({
      success: false,
      message:
        "Gagal menghapus! Kelas ini memiliki relasi dengan data siswa aktif.",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal menghapus! Kelas ini memiliki relasi dengan data siswa aktif.",
      );
      expect(setIsModalDeleteOpenMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE (MURNI TANPA HACK)
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menghapus...' saat isSubmitting bernilai true", () => {
    // Karena isSubmitting dioper lewat props, kita cukup set nilainya langsung ke true!
    const { getByRole, getByText } = renderModal(true);

    expect(getByText("Menghapus...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menghapus.../i });
    expect(tombolLoading).toBeDisabled();
  });
});
