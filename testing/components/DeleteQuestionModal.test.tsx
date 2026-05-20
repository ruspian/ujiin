import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import DeleteQuestionModal from "@/components/layout/DeleteQuestionModal"; // Sesuaikan path komponen lu bos!
import { deleteQuestion } from "@/actions/question";
import { toast } from "sonner";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/question", () => ({
  deleteQuestion: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-id-123"),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - DeleteQuestionModal", () => {
  const mockQuestionId = "q-999";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(<DeleteQuestionModal questionId={mockQuestionId} />);

  // ==========================================
  // SKENARIO 1: RENDERING AWAL (MODAL SEMBUNYI)
  // ==========================================
  test("Harus sukses merender tombol pemicu utama dan menyembunyikan modal di awal", () => {
    const { getByRole, queryByText } = renderComponent();

    // 🔥 PERBAIKAN: Gunakan accessible name dari atribut title ("Hapus Soal")
    const tombolPemicu = getByRole("button", { name: /hapus soal/i });
    expect(tombolPemicu).toBeInTheDocument();

    expect(queryByText("Hapus Soal Ini?")).not.toBeInTheDocument();
  });

  // ==========================================
  // SKENARIO 2: MEMBUKA DAN MENUTUP MODAL
  // ==========================================
  test("Harus sukses membuka modal saat ikon diklik dan menutupnya kembali saat tombol Batal ditekan", () => {
    const { getByRole, queryByText, getByText } = renderComponent();

    // 🔥 PERBAIKAN: Gunakan accessible name /hapus soal/i
    const tombolPemicu = getByRole("button", { name: /hapus soal/i });
    fireEvent.click(tombolPemicu);

    expect(getByText("Hapus Soal Ini?")).toBeInTheDocument();

    const tombolBatal = getByRole("button", { name: /batal/i });
    fireEvent.click(tombolBatal);

    expect(queryByText("Hapus Soal Ini?")).not.toBeInTheDocument();
  });

  // ==========================================
  // SKENARIO 3: SUCCESS FLOW (HAPUS SOAL BERHASIL)
  // ==========================================
  test("Harus mengeksekusi server action, memicu toast sukses, dan menutup modal", async () => {
    vi.mocked(deleteQuestion).mockResolvedValue({
      success: true,
      message: "Soal berhasil dihapus dari bank soal!",
    });

    const { getByRole, queryByText } = renderComponent();

    // 🔥 PERBAIKAN: Gunakan accessible name /hapus soal/i
    fireEvent.click(getByRole("button", { name: /hapus soal/i }));

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    await waitFor(() => {
      expect(deleteQuestion).toHaveBeenCalledWith("q-999");
      expect(toast.success).toHaveBeenCalledWith(
        "Soal berhasil dihapus dari bank soal!",
        { id: "toast-id-123" },
      );
      expect(queryByText("Hapus Soal Ini?")).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // SKENARIO 4: ERROR HANDLING (SERVER GAGAL)
  // ==========================================
  test("Harus menampilkan toast error jika server menolak penghapusan", async () => {
    vi.mocked(deleteQuestion).mockResolvedValue({
      success: false,
      message:
        "Gagal menghapus! Soal ini sedang digunakan dalam jadwal ujian aktif.",
    });

    const { getByRole, getByText } = renderComponent();

    // 🔥 PERBAIKAN: Gunakan accessible name /hapus soal/i
    fireEvent.click(getByRole("button", { name: /hapus soal/i }));

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal menghapus! Soal ini sedang digunakan dalam jadwal ujian aktif.",
        { id: "toast-id-123" },
      );
      expect(getByText("Hapus Soal Ini?")).toBeInTheDocument();
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menghapus...' selama proses asinkronus berjalan", async () => {
    type ActionResponse = { success: boolean; message: string };
    let resolvePromise!: (value: ActionResponse) => void;

    const deferredPromise = new Promise<ActionResponse>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(deleteQuestion).mockReturnValue(deferredPromise);

    const { getByRole, findByText } = renderComponent();

    // 🔥 PERBAIKAN: Gunakan accessible name /hapus soal/i
    fireEvent.click(getByRole("button", { name: /hapus soal/i }));

    fireEvent.click(getByRole("button", { name: /ya, hapus/i }));

    const tombolLoading = await findByText("Menghapus...");
    expect(tombolLoading).toBeInTheDocument();
    expect(tombolLoading).toBeDisabled();

    await act(async () => {
      resolvePromise({ success: true, message: "Selesai" });
    });
  });
});
