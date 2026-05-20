import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import EditAgamaModal from "@/components/layout/EditAgamaModal"; // Sesuaikan path komponen lu bos!
import { updateReligion } from "@/actions/religion";
import { toast } from "sonner";
import { EditAgamaModalProps } from "@/types/religion";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/religion", () => ({
  updateReligion: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - EditAgamaModal", () => {
  let setIsModalEditOpenMock: Mock<(open: boolean) => void>;

  // 🔥 Casting murni menggunakan kontrak tipe data asli, anti 'any'
  const mockItemData = {
    id: "rel-555",
    name: "Kristen Protestan",
  } as unknown as EditAgamaModalProps["itemData"];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalEditOpenMock = vi.fn();
  });

  const renderModal = (forceLoading = false) =>
    render(
      <EditAgamaModal
        itemData={mockItemData}
        setIsModalEditOpen={setIsModalEditOpenMock}
        forceLoading={forceLoading}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL & VALUE DEFAULT
  // ==========================================
  test("Harus sukses merender judul modal, value default input nama agama, dan hidden input ID", () => {
    const { getByText, getByRole, container } = renderModal();

    expect(getByText("Edit Agama")).toBeInTheDocument();

    // Verifikasi hidden input ID
    const inputHidden = container.querySelector(
      'input[name="id"]',
    ) as HTMLInputElement;
    expect(inputHidden.value).toBe("rel-555");

    // Verifikasi default value input nama agama menggunakan attribute selector (aman dari masalah label unlinked)
    const inputName = container.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement;
    expect(inputName).toBeInTheDocument();
    expect(inputName.value).toBe("Kristen Protestan");

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
    vi.mocked(updateReligion).mockResolvedValue({
      success: true,
      message: "Data nama agama berhasil diperbarui!",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    // Kirim event submit langsung ke form element untuk menghindari pemblokiran klik oleh JSDOM
    await act(async () => {
      fireEvent.submit(formElement);
    });

    expect(updateReligion).toHaveBeenCalled();

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Data nama agama berhasil diperbarui!",
      );
      expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 4: ERROR HANDLING (SERVER GAGAL)
  // ==========================================
  test("Harus menampilkan toast error jika Server Action memberikan respons kegagalan", async () => {
    vi.mocked(updateReligion).mockResolvedValue({
      success: false,
      message: "Nama agama tersebut sudah terdaftar di sistem.",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    await act(async () => {
      fireEvent.submit(formElement);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Nama agama tersebut sudah terdaftar di sistem.",
      );
      expect(setIsModalEditOpenMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE (INJEKSI PROP AMAN)
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menyimpan...' saat proses transmisi berlangsung", () => {
    // Render modal dengan menyalakan paksa mode loading testing
    const { getByRole, getByText } = renderModal(true);

    expect(getByText("Menyimpan...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menyimpan.../i });
    expect(tombolLoading).toBeDisabled();
  });
});
