import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import EditJenisUjianModal from "@/components/layout/EditJenisUjianModal"; // Sesuaikan path komponen lu bos!
import { updateExamType } from "@/actions/exam-type";
import { toast } from "sonner";
import { EditJenisUjianModalProps } from "@/types/examType";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/exam-type", () => ({
  updateExamType: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - EditJenisUjianModal", () => {
  let setIsModalEditOpenMock: Mock<(open: boolean) => void>;

  // 🔥 Casting murni menggunakan kontrak interface asli tanpa 'any'
  const mockItemData = {
    id: "type-999",
    code: "UTS",
    name: "Ujian Tengah Semester",
  } as unknown as EditJenisUjianModalProps["itemData"];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalEditOpenMock = vi.fn();
  });

  const renderModal = (forceLoading = false) =>
    render(
      <EditJenisUjianModal
        itemData={mockItemData}
        setIsModalEditOpen={setIsModalEditOpenMock}
        forceLoading={forceLoading}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL & VALUE DEFAULT
  // ==========================================
  test("Harus sukses merender judul modal, value default input kode, input nama jenis ujian, dan hidden input ID", () => {
    const { getByText, getByRole, container } = renderModal();

    expect(getByText("Edit Jenis Ujian")).toBeInTheDocument();

    // Verifikasi hidden input ID
    const inputHidden = container.querySelector(
      'input[name="id"]',
    ) as HTMLInputElement;
    expect(inputHidden.value).toBe("type-999");

    // Verifikasi default value input code menggunakan attribute selector (aman dari unlinked label)
    const inputCode = container.querySelector(
      'input[name="code"]',
    ) as HTMLInputElement;
    expect(inputCode).toBeInTheDocument();
    expect(inputCode.value).toBe("UTS");

    // Verifikasi default value input name
    const inputName = container.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement;
    expect(inputName).toBeInTheDocument();
    expect(inputName.value).toBe("Ujian Tengah Semester");

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

    // Klik tombol X (tombol penutup di bagian kanan atas)
    const tombolX = getAllByRole("button")[0];
    if (tombolX) fireEvent.click(tombolX);
    expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
  });

  // ==========================================
  // SKENARIO 3: SUCCESS FLOW (UPDATE BERHASIL)
  // ==========================================
  test("Harus mengeksekusi Server Action, memicu toast sukses, dan menutup dialog modal", async () => {
    vi.mocked(updateExamType).mockResolvedValue({
      success: true,
      message: "Jenis ujian berhasil diperbarui!",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    // Kirim event submit langsung ke form element untuk menghindari batasan klik tombol submit JSDOM
    await act(async () => {
      fireEvent.submit(formElement);
    });

    expect(updateExamType).toHaveBeenCalled();

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Jenis ujian berhasil diperbarui!",
      );
      expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE (INJEKSI PROP AMAN)
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menyimpan...' saat proses transmisi berlangsung", () => {
    // Render modal dengan menyalakan paksa mode loading khusus testing
    const { getByRole, getByText } = renderModal(true);

    expect(getByText("Menyimpan...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menyimpan.../i });
    expect(tombolLoading).toBeDisabled();
  });
});
