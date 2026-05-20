import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import DeleteAgamaModal from "@/components/layout/DeleteAgamaModal";
import { deleteReligion } from "@/actions/religion";
import { toast } from "sonner";
import { ReligionData } from "@/types/religion";

// 1. MOCKING DEPENDENSI

vi.mock("@/actions/religion", () => ({
  deleteReligion: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - DeleteAgamaModal", () => {
  let setIsModalDeleteOpenMock: Mock<(open: boolean) => void>;

  const mockItemData = {
    id: "rel-1",
    name: "Islam",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as ReligionData;

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalDeleteOpenMock = vi.fn();
  });

  const renderModal = () =>
    render(
      <DeleteAgamaModal
        itemData={mockItemData}
        setIsModalDeleteOpen={setIsModalDeleteOpenMock}
      />,
    );

  test("Harus sukses merender konfirmasi hapus, teks dinamis, dan hidden input", () => {
    const { getByText, getByRole, container } = renderModal();
    expect(getByText("Hapus Data Agama?")).toBeInTheDocument();
    expect(getByText("Islam")).toBeInTheDocument();

    const inputHidden = container.querySelector(
      'input[name="id"]',
    ) as HTMLInputElement;
    expect(inputHidden.value).toBe("rel-1");
    expect(getByRole("button", { name: /ya, hapus/i })).not.toBeDisabled();
  });

  test("Harus sukses menutup modal ketika tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = renderModal();

    fireEvent.click(getByRole("button", { name: /batal/i }));
    expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);

    const tombolX = getAllByRole("button")[0];
    if (tombolX) fireEvent.click(tombolX);
    expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
  });

  test("Harus mengeksekusi server action, menampilkan toast sukses, dan menutup modal", async () => {
    vi.mocked(deleteReligion).mockResolvedValue({
      success: true,
      message: "Data berhasil dihapus!",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    await waitFor(() => {
      expect(deleteReligion).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Data berhasil dihapus!");
      expect(setIsModalDeleteOpenMock).toHaveBeenCalledWith(false);
    });
  });

  test("Harus menampilkan toast error jika server gagal menghapus data", async () => {
    vi.mocked(deleteReligion).mockResolvedValue({
      success: false,
      message: "Gagal menghapus!",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /ya, hapus/i }));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Gagal menghapus!");
      expect(setIsModalDeleteOpenMock).not.toHaveBeenCalled();
    });
  });

  // SKENARIO 5: TANGKAP LOADING STATE DENGAN ASYNC

  test("Harus mengunci tombol dan mengubah teks menjadi 'Menghapus...' saat proses berlangsung", async () => {
    // Tipe kembalian tanpa any
    type ActionResponse = { success: boolean; message: string };
    let resolvePromise!: (value: ActionResponse) => void;

    // Buat promise yang menggantung
    const deferredPromise = new Promise<ActionResponse>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(deleteReligion).mockReturnValue(deferredPromise);

    const { getByRole, findByText } = renderModal();

    // 1. Trigger klik biasa (tanpa await act) agar event loop berjalan
    fireEvent.click(getByRole("button", { name: /ya, hapus/i }));

    // 2. Gunakan findByText (bukan getByText) karena ini asinkronus dan akan menunggu
    // sampai state isSubmitting berubah dan merender ulang teksnya.
    const tombolLoading = await findByText("Menghapus...");

    // 3. Verifikasi UI
    expect(tombolLoading).toBeInTheDocument();
    expect(tombolLoading).toBeDisabled();

    // 4. Bersihkan memori dengan menyelesaikan promise
    await act(async () => {
      resolvePromise({ success: true, message: "Selesai" });
    });
  });
});
