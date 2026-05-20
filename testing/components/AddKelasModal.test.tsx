import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import AddClassModal from "@/components/layout/AddKelasModal";
import { createClass } from "@/actions/class";
import { toast } from "sonner";

// 1. MOCKING DEPENDENSI SERVER ACTION & TOAST

vi.mock("@/actions/class", () => ({
  createClass: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - AddClassModal (Form Action Mode)", () => {
  let setIsModalOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  // SKENARIO 1: RENDERING KOMPONEN UTUH

  test("Harus sukses merender struktur form input tingkat kelas, nama kelas, dan judul modal", () => {
    const { getByText, container } = render(
      <AddClassModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={false}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

    expect(getByText("Tambah Kelas Baru")).toBeInTheDocument();

    // Gunakan querySelector berbasis name agar lolos dari validasi strict A11y
    const inputLevel = container.querySelector('input[name="level"]');
    const inputName = container.querySelector('input[name="name"]');

    expect(inputLevel).toBeInTheDocument();
    expect(inputName).toBeInTheDocument();
  });

  // SKENARIO 2: AKSI BATAL DAN PENUTUPAN MODAL

  test("Harus sukses menutup modal ketika tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = render(
      <AddClassModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={false}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

    // Klik tombol Batal
    const tombolBatal = getByRole("button", { name: /batal/i });
    fireEvent.click(tombolBatal);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);

    // Klik tombol silang X (biasanya ada di index 0 karena dirender pertama di header)
    const tombolX = getAllByRole("button")[0];
    if (!tombolX) throw new Error("Tombol X tidak ditemukan di DOM");
    fireEvent.click(tombolX);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
  });

  // SKENARIO 3: LOADING STATE & SUBMIT BERHASIL

  test("Harus memicu fungsi setIsSubmitting, memanggil server action, memunculkan toast sukses, dan menutup modal", async () => {
    vi.mocked(createClass).mockResolvedValue({
      success: true,
      message: "Kelas baru berhasil disimpan!",
    });

    const { getByRole, container } = render(
      <AddClassModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={false}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

    const inputLevel = container.querySelector('input[name="level"]');
    const inputName = container.querySelector('input[name="name"]');
    const tombolSimpan = getByRole("button", { name: /simpan kelas/i });

    if (!inputLevel || !inputName)
      throw new Error("Input elemen tidak ditemukan");

    // 1. Simulasikan pengetikan data oleh pengguna
    fireEvent.change(inputLevel, { target: { value: "10" } });
    fireEvent.change(inputName, { target: { value: "10 RPL 1" } });

    // 2. Picu aksi submit menggunakan act + click agar kompatibel dengan Form Action React 19
    await act(async () => {
      fireEvent.click(tombolSimpan);
    });

    // 3. Verifikasi bahwa setIsSubmitting(true) dipanggil saat proses berjalan
    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);

    // 4. Pastikan efek akhir pasca-submit berjalan lancar
    await waitFor(() => {
      expect(createClass).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Kelas baru berhasil disimpan!",
      );
      expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
    });
  });

  test("Harus sukses merender tombol dalam kondisi terkunci (disabled) jika isSubmitting true", () => {
    const { getByRole, getByText } = render(
      <AddClassModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={true} // 🔥 Simulasi re-render dari komponen induk saat loading
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

    const tombolLoading = getByRole("button", { name: /menyimpan.../i });

    expect(getByText("Menyimpan...")).toBeInTheDocument();
    expect(tombolLoading).toBeDisabled();
  });

  // SKENARIO 4: ERROR HANDLING SERVER ACTION

  test("Harus sukses menampilkan pesan error jika server action gagal menyimpan kelas", async () => {
    vi.mocked(createClass).mockResolvedValue({
      success: false,
      message: "Nama kelas sudah digunakan!",
    });

    const { getByRole, container } = render(
      <AddClassModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={false}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

    const inputLevel = container.querySelector('input[name="level"]');
    const inputName = container.querySelector('input[name="name"]');
    const tombolSimpan = getByRole("button", { name: /simpan kelas/i });

    if (!inputLevel || !inputName)
      throw new Error("Input elemen tidak ditemukan");

    fireEvent.change(inputLevel, { target: { value: "12" } });
    fireEvent.change(inputName, { target: { value: "12 TKJ 2" } });

    await act(async () => {
      fireEvent.click(tombolSimpan);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Nama kelas sudah digunakan!");
      expect(setIsModalOpenMock).not.toHaveBeenCalled(); // Modal tetap terbuka agar user bisa merevisi input
    });
  });
});
