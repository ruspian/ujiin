import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import DeleteSubjectModal from "@/components/layout/DeleteSubjectModal"; // Sesuaikan path komponen lu bos!
import { deleteSubject } from "@/actions/subject";
import { toast } from "sonner";
import { DeleteSubjectModalProps } from "@/types/data.master";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/subject", () => ({
  deleteSubject: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - DeleteSubjectModal", () => {
  let setIsModalDeleteOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  // 🔥 Casting murni menggunakan kontrak interface asli bawaan, anti 'any'
  const mockSubjectData = {
    id: "sbj-101",
    name: "Informatika",
  } as unknown as DeleteSubjectModalProps["subjectData"];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalDeleteOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (isSubmitting = false) =>
    render(
      <DeleteSubjectModal
        subjectData={mockSubjectData}
        isSubmitting={isSubmitting}
        setIsModalDeleteOpen={setIsModalDeleteOpenMock}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL
  // ==========================================
  test("Harus sukses merender judul modal, nama mapel secara dinamis, ", () => {
    const { getByText, getByRole } = renderModal();

    expect(getByText("Hapus Mata Pelajaran?")).toBeInTheDocument();
    expect(getByText("Informatika")).toBeInTheDocument();

    expect(
      getByRole("button", { name: /ya, hapus mapel/i }),
    ).not.toBeDisabled();
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
    vi.mocked(deleteSubject).mockResolvedValue({
      success: true,
      message: "Mata pelajaran berhasil dihapus!",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus mapel/i }));
    });

    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);
    expect(deleteSubject).toHaveBeenCalledWith("sbj-101");

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Mata pelajaran berhasil dihapus!",
      );
      expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 4: ERROR HANDLING (SERVER GAGAL)
  // ==========================================
  test("Harus menampilkan toast error jika Server Action mengembalikan respons gagal", async () => {
    vi.mocked(deleteSubject).mockResolvedValue({
      success: false,
      message:
        "Gagal menghapus! Mapel ini sudah terikat dengan bank soal aktif.",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus mapel/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal menghapus! Mapel ini sudah terikat dengan bank soal aktif.",
      );
      expect(setIsModalDeleteOpenMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE (MUTLAK BERHASIL)
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menghapus...' saat isSubmitting bernilai true", () => {
    // Karena isSubmitting adalah prop luar, kita injeksi true secara legal & sinkronus tanpa menyentuh event loop JSDOM
    const { getByRole, getByText } = renderModal(true);

    expect(getByText("Menghapus...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menghapus.../i });
    expect(tombolLoading).toBeDisabled();
  });
});
