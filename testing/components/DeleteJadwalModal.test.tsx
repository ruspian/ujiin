import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import DeleteJadwalModal from "@/components/layout/DeleteJadwalModal";
import { deleteExam } from "@/actions/exam";
import { toast } from "sonner";
import { DeleteJadwalModalProps } from "@/types/exam";

// 1. MOCKING DEPENDENSI

vi.mock("@/actions/exam", () => ({
  deleteExam: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - DeleteJadwalModal", () => {
  let setIsModalDeleteOpenMock: Mock<(open: boolean) => void>;

  // 🔥 Casting murni menggunakan interface lu, 0% any!
  const mockItemData = {
    id: "exam-123",
    title: "Ujian Tengah Semester - Matematika",
  } as unknown as DeleteJadwalModalProps["itemData"];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalDeleteOpenMock = vi.fn();
  });

  const renderModal = () =>
    render(
      <DeleteJadwalModal
        itemData={mockItemData}
        setIsModalDeleteOpen={setIsModalDeleteOpenMock}
      />,
    );

  // SKENARIO 1: RENDERING AWAL

  test("Harus sukses merender konfirmasi hapus, teks dinamis, dan hidden input", () => {
    const { getByText, getByRole, container } = renderModal();

    expect(getByText("Hapus Jadwal Ujian?")).toBeInTheDocument();
    expect(getByText("Ujian Tengah Semester - Matematika")).toBeInTheDocument();

    const inputHidden = container.querySelector(
      'input[name="id"]',
    ) as HTMLInputElement;
    expect(inputHidden.value).toBe("exam-123");

    expect(getByRole("button", { name: /ya, hapus/i })).not.toBeDisabled();
  });

  // SKENARIO 2: AKSI BATAL

  test("Harus sukses menutup modal ketika tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = renderModal();

    fireEvent.click(getByRole("button", { name: /batal/i }));
    expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);

    const tombolX = getAllByRole("button")[0];
    if (tombolX) fireEvent.click(tombolX);
    expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
  });

  // SKENARIO 3: SUCCESS FLOW

  test("Harus mengeksekusi server action, menampilkan toast sukses, dan menutup modal", async () => {
    vi.mocked(deleteExam).mockResolvedValue({
      success: true,
      message: "Jadwal berhasil dihapus!",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    await waitFor(() => {
      expect(deleteExam).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Jadwal berhasil dihapus!");
      expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // SKENARIO 4: ERROR FLOW

  test("Harus menampilkan toast error jika server gagal menghapus data", async () => {
    vi.mocked(deleteExam).mockResolvedValue({
      success: false,
      message: "Gagal menghapus! Jadwal sudah dikerjakan siswa.",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal menghapus! Jadwal sudah dikerjakan siswa.",
      );
      expect(setIsModalDeleteOpenMock).not.toHaveBeenCalled();
    });
  });

  // SKENARIO 5: LOCAL LOADING STATE (DENGAN INJEKSI PROP)

  test("Harus mengunci tombol dan mengubah teks menjadi 'Menghapus...' saat proses berlangsung", () => {
    //  Render ulang dengan prop forceLoading=true
    const { getByRole, getByText } = render(
      <DeleteJadwalModal
        itemData={mockItemData}
        setIsModalDeleteOpen={setIsModalDeleteOpenMock}
        forceLoading={true}
      />,
    );

    // Langsung tembak DOM-nya tanpa perlu fireEvent atau act!
    expect(getByText("Menghapus...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menghapus.../i });
    expect(tombolLoading).toBeDisabled();
  });
});
