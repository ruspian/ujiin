import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import EditClassModal from "@/components/layout/EditKelasModal";
import { updateClass } from "@/actions/class";
import { toast } from "sonner";
import { EditClassModalProps } from "@/types/class";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/class", () => ({
  updateClass: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - EditClassModal", () => {
  let setIsModalEditOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  // 🔥 Casting murni menggunakan kontrak interface bawaan tanpa 'any'
  const mockClassData = {
    id: "cls-123",
    level: 12,
    name: "XII RPL 1",
  } as unknown as EditClassModalProps["classData"];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalEditOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (isSubmitting = false) =>
    render(
      <EditClassModal
        classData={mockClassData}
        isSubmitting={isSubmitting}
        setIsModalEditOpen={setIsModalEditOpenMock}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL & VALUE DEFAULT
  // ==========================================
  test("Harus sukses merender judul modal, default value tingkat, nama rombel, dan hidden input ID", () => {
    const { getByText, getByRole, container } = renderModal();

    expect(getByText("Edit Data Kelas")).toBeInTheDocument();

    // Verifikasi hidden input ID
    const inputHidden = container.querySelector(
      'input[name="id"]',
    ) as HTMLInputElement;
    expect(inputHidden.value).toBe("cls-123");

    // Verifikasi default value input level tingkat kelas
    const inputLevel = container.querySelector(
      'input[name="level"]',
    ) as HTMLInputElement;
    expect(inputLevel).toBeInTheDocument();
    expect(inputLevel.value).toBe("12");

    // Verifikasi default value input nama rombel kelas
    const inputName = container.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement;
    expect(inputName).toBeInTheDocument();
    expect(inputName.value).toBe("XII RPL 1");

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

    // Klik tombol X di kanan atas
    const tombolX = getAllByRole("button")[0];
    if (tombolX) fireEvent.click(tombolX);
    expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
  });

  // ==========================================
  // SKENARIO 3: SUCCESS FLOW (UPDATE BERHASIL)
  // ==========================================
  test("Harus memicu Server Action, merubah state loading, dan menampilkan toast sukses", async () => {
    vi.mocked(updateClass).mockResolvedValue({
      success: true,
      message: "Data kelas berhasil diperbarui!",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    // Kirim event submit langsung ke form element untuk menghindari penolakan klik tombol submit JSDOM
    await act(async () => {
      fireEvent.submit(formElement);
    });

    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);
    expect(updateClass).toHaveBeenCalled();

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Data kelas berhasil diperbarui!",
      );
      expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 4: ERROR HANDLING (SERVER GAGAL)
  // ==========================================
  test("Harus menampilkan toast error jika Server Action mengembalikan respons gagal", async () => {
    vi.mocked(updateClass).mockResolvedValue({
      success: false,
      message:
        "Gagal memperbarui! Nama kelas sudah digunakan pada tingkat ini.",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    await act(async () => {
      fireEvent.submit(formElement);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal memperbarui! Nama kelas sudah digunakan pada tingkat ini.",
      );
      expect(setIsModalEditOpenMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menyimpan...' saat isSubmitting bernilai true", () => {
    // Karena isSubmitting dikontrol dari luar, kita set true murni tanpa perlu memicu event loop form
    const { getByRole, getByText } = renderModal(true);

    expect(getByText("Menyimpan...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menyimpan.../i });
    expect(tombolLoading).toBeDisabled();
  });
});
