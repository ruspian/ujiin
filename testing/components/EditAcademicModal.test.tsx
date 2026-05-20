import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import EditAcademicModal from "@/components/layout/EditAcademicModal"; // Sesuaikan path komponen lu bos!
import { updateAcademicYear } from "@/actions/academic";
import { toast } from "sonner";
import { EditAcademicModalProps } from "@/types/academic";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/academic", () => ({
  updateAcademicYear: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - EditAcademicModal", () => {
  let setIsModalEditOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  // 🔥 Casting data tiruan murni menggunakan skema interface asli tanpa 'any'
  const mockItemData = {
    id: "acd-2026",
    year: "2025/2026",
    semester: "GENAP",
  } as unknown as EditAcademicModalProps["itemData"];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalEditOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (isSubmitting = false) =>
    render(
      <EditAcademicModal
        itemData={mockItemData}
        isSubmitting={isSubmitting}
        setIsModalEditOpen={setIsModalEditOpenMock}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL & VALUE DEFAULT
  // ==========================================
  test("Harus sukses merender judul modal, default value input teks, select semester, dan hidden input ID", () => {
    // 🔥 PERBAIKAN: Hapus getByLabelText karena label & input di komponen asli belum terhubung id/htmlFor
    const { getByText, getByRole, container } = renderModal();

    expect(getByText("Edit Tahun Ajaran")).toBeInTheDocument();

    // Verifikasi hidden input ID
    const inputHidden = container.querySelector(
      'input[name="id"]',
    ) as HTMLInputElement;
    expect(inputHidden.value).toBe("acd-2026");

    // Verifikasi default value input text tahun ajaran berdasarkan name attribute
    const inputYear = container.querySelector(
      'input[name="year"]',
    ) as HTMLInputElement;
    expect(inputYear).toBeInTheDocument();
    expect(inputYear.value).toBe("2025/2026");

    // Verifikasi default value select box semester
    const selectSemester = getByRole("combobox") as HTMLSelectElement;
    expect(selectSemester.value).toBe("GENAP");

    expect(
      getByRole("button", { name: /simpan perubahan/i }),
    ).not.toBeDisabled();
  });

  // ==========================================
  // SKENARIO 2: AKSI BATAL ATAU TUTUP
  // ==========================================
  test("Harus memanggil setIsModalEditOpen(false) saat tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = renderModal();

    // Klik tombol Batal
    fireEvent.click(getByRole("button", { name: /batal/i }));
    expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);

    // Klik tombol X (tombol pertama di dalam susunan modal)
    const tombolX = getAllByRole("button")[0];
    if (tombolX) fireEvent.click(tombolX);
    expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
  });

  // ==========================================
  // SKENARIO 3: SUCCESS FLOW (UPDATE BERHASIL)
  // ==========================================
  test("Harus memicu Server Action, merubah state loading, dan menampilkan toast sukses", async () => {
    vi.mocked(updateAcademicYear).mockResolvedValue({
      success: true,
      message: "Data tahun ajaran berhasil diperbarui!",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    // Kirim event submit langsung ke elemen form untuk mem-bypass error click JSDOM
    await act(async () => {
      fireEvent.submit(formElement);
    });

    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);
    expect(updateAcademicYear).toHaveBeenCalled();

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Data tahun ajaran berhasil diperbarui!",
      );
      expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 4: ERROR HANDLING (SERVER GAGAL)
  // ==========================================
  test("Harus menampilkan toast error jika Server Action mengembalikan respons gagal", async () => {
    vi.mocked(updateAcademicYear).mockResolvedValue({
      success: false,
      message: "Format tahun ajaran tidak valid atau sudah terdaftar.",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    await act(async () => {
      fireEvent.submit(formElement);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Format tahun ajaran tidak valid atau sudah terdaftar.",
      );
      expect(setIsModalEditOpenMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menyimpan...' saat isSubmitting bernilai true", () => {
    // Injeksi status loading murni secara sinkronus lewat props luar
    const { getByRole, getByText } = renderModal(true);

    expect(getByText("Menyimpan...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menyimpan.../i });
    expect(tombolLoading).toBeDisabled();
  });
});
