import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import DeleteUserModal from "@/components/layout/DeleteUserModal"; // Sesuaikan path jika berbeda
import { deleteUser } from "@/actions/user";
import { toast } from "sonner";
import { DeleteUserModalProps } from "@/types/user.admin";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/user", () => ({
  deleteUser: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - DeleteUserModal", () => {
  let setIsModalDeleteOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  // 🔥 Casting data tiruan murni menggunakan kontrak interface asli tanpa 'any'
  const mockData = {
    id: "usr-888",
    name: "Ruspian Majid",
  } as unknown as DeleteUserModalProps["data"];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalDeleteOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (isSubmitting = false) =>
    render(
      <DeleteUserModal
        data={mockData}
        name="Admin"
        isSubmitting={isSubmitting}
        setIsModalDeleteOpen={setIsModalDeleteOpenMock}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL
  // ==========================================
  test("Harus sukses merender judul, teks nama pengguna secara dinamis, dan tombol hapus aktif", () => {
    const { getByText, getByRole } = renderModal();

    expect(getByText("Hapus Pengguna?")).toBeInTheDocument();
    expect(getByText("Ruspian Majid")).toBeInTheDocument();
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
    vi.mocked(deleteUser).mockResolvedValue({
      success: true,
      message: "Pengguna berhasil dihapus!",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    // Verifikasi alur pemanggilan state internal dan parameter action
    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);
    expect(deleteUser).toHaveBeenCalledWith("usr-888");

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Pengguna berhasil dihapus!");
      expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 4: ERROR HANDLING (SERVER GAGAL)
  // ==========================================
  test("Harus memunculkan toast error jika Server Action mengembalikan respons gagal", async () => {
    vi.mocked(deleteUser).mockResolvedValue({
      success: false,
      message:
        "Gagal menghapus! Pengguna ini merupakan Administrator utama sistem.",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal menghapus! Pengguna ini merupakan Administrator utama sistem.",
      );
      expect(setIsModalDeleteOpenMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menghapus...' saat isSubmitting bernilai true", () => {
    // Kontrol langsung state loading dari props pembungkus secara sinkronus
    const { getByRole, getByText } = renderModal(true);

    expect(getByText("Menghapus...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menghapus.../i });
    expect(tombolLoading).toBeDisabled();
  });
});
