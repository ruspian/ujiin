import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import DeleteStudentModal from "@/components/layout/DeleteStudentModal"; // Sesuaikan path komponen lu bos!
import { deleteStudent } from "@/actions/student";
import { toast } from "sonner";
import { DeleteStudentModalProps } from "@/types/student";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/student", () => ({
  deleteStudent: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - DeleteStudentModal", () => {
  let setIsModalDeleteOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  // 🔥 Casting murni menggunakan kontrak interface bawaan tanpa 'any'
  const mockStudentData = {
    id: "std-99",
    name: "Ruspian Majid",
  } as unknown as DeleteStudentModalProps["studentData"];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalDeleteOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (isSubmitting = false) =>
    render(
      <DeleteStudentModal
        studentData={mockStudentData}
        isSubmitting={isSubmitting}
        setIsModalDeleteOpen={setIsModalDeleteOpenMock}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL
  // ==========================================
  test("Harus sukses merender judul modal, nama siswa secara dinamis, dan tombol konfirmasi", () => {
    const { getByText, getByRole } = renderModal();

    expect(getByText("Hapus Data Siswa?")).toBeInTheDocument();
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
  test("Harus memicu Server Action, merubah state loading, dan menampilkan toast sukses", async () => {
    vi.mocked(deleteStudent).mockResolvedValue({
      success: true,
      message: "Data siswa berhasil dihapus secara permanen!",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    // Pastikan state loading dipicu dan action dipanggil dengan ID yang tepat
    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);
    expect(deleteStudent).toHaveBeenCalledWith("std-99");

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Data siswa berhasil dihapus secara permanen!",
      );
      expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 4: ERROR HANDLING (SERVER GAGAL)
  // ==========================================
  test("Harus memunculkan toast error jika Server Action mengembalikan respons gagal", async () => {
    vi.mocked(deleteStudent).mockResolvedValue({
      success: false,
      message:
        "Gagal menghapus! Siswa ini sudah memiliki riwayat pengerjaan ujian.",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal menghapus! Siswa ini sudah memiliki riwayat pengerjaan ujian.",
      );
      // Modal tidak boleh menutup jika proses gagal
      expect(setIsModalDeleteOpenMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menghapus...' saat isSubmitting bernilai true", () => {
    // Kontrol langsung state loading dari props pembungkus
    const { getByRole, getByText } = renderModal(true);

    expect(getByText("Menghapus...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menghapus.../i });
    expect(tombolLoading).toBeDisabled();
  });
});
