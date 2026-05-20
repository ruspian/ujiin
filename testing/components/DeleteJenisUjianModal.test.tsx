import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import DeleteJenisUjianModal from "@/components/layout/DeleteJenisUjianModal";
import { deleteExamType } from "@/actions/exam-type";
import { toast } from "sonner";
import { DeleteJenisUjianModalProps } from "@/types/examType";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/exam-type", () => ({
  deleteExamType: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - DeleteJenisUjianModal", () => {
  let setIsModalDeleteOpenMock: Mock<(open: boolean) => void>;

  // 🔥 Casting murni menggunakan contract interface asli, anti 'any'
  const mockItemData = {
    id: "ext-789",
    code: "UAS",
    name: "Ujian Akhir Semester",
  } as unknown as DeleteJenisUjianModalProps["itemData"];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalDeleteOpenMock = vi.fn();
  });

  const renderModal = (forceLoading = false) =>
    render(
      <DeleteJenisUjianModal
        itemData={mockItemData}
        setIsModalDeleteOpen={setIsModalDeleteOpenMock}
        forceLoading={forceLoading}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL
  // ==========================================
  test("Harus sukses merender konfirmasi hapus, teks kode dinamis, dan hidden input ID", () => {
    const { getByText, getByRole, container } = renderModal();

    expect(getByText("Hapus Jenis Ujian?")).toBeInTheDocument();
    expect(getByText("[UAS] Ujian Akhir Semester")).toBeInTheDocument();

    const inputHidden = container.querySelector(
      'input[name="id"]',
    ) as HTMLInputElement;
    expect(inputHidden.value).toBe("ext-789");

    expect(getByRole("button", { name: /ya, hapus/i })).not.toBeDisabled();
  });

  // ==========================================
  // SKENARIO 2: AKSI BATAL
  // ==========================================
  test("Harus sukses menutup modal ketika tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = renderModal();

    fireEvent.click(getByRole("button", { name: /batal/i }));
    expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);

    const tombolX = getAllByRole("button")[0];
    if (tombolX) fireEvent.click(tombolX);
    expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
  });

  // ==========================================
  // SKENARIO 3: SUCCESS FLOW
  // ==========================================
  test("Harus mengeksekusi server action, menampilkan toast sukses, dan menutup modal", async () => {
    vi.mocked(deleteExamType).mockResolvedValue({
      success: true,
      message: "Jenis ujian berhasil dihapus!",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    await waitFor(() => {
      expect(deleteExamType).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Jenis ujian berhasil dihapus!",
      );
      expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 4: ERROR FLOW
  // ==========================================
  test("Harus menampilkan toast error jika server gagal menghapus data", async () => {
    vi.mocked(deleteExamType).mockResolvedValue({
      success: false,
      message: "Gagal menghapus! Data ini masih terikat dengan jadwal aktif.",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal menghapus! Data ini masih terikat dengan jadwal aktif.",
      );
      expect(setIsModalDeleteOpenMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE (INJEKSI PROP AMAN)
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menghapus...' saat proses berlangsung", () => {
    // Paksa mode loading bernilai true tanpa menyentuh event loop JSDOM
    const { getByRole, getByText } = renderModal(true);

    expect(getByText("Menghapus...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menghapus.../i });
    expect(tombolLoading).toBeDisabled();
  });
});
