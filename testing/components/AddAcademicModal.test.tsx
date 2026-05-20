import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import AddAcademicModal from "@/components/layout/AddAcademicModal";
import { createAcademicYear } from "@/actions/academic";
import { toast } from "sonner";

//  MOCKING DEPENDENSI SERVER ACTION & TOAST

vi.mock("@/actions/academic", () => ({
  createAcademicYear: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - AddAcademicModal (Form Action Mode)", () => {
  let setIsModalOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  //RENDERING KOMPONEN UTUH

  test("Harus sukses merender seluruh struktur form input dan judul modal", () => {
    const { getByText, getByPlaceholderText, container } = render(
      <AddAcademicModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={false}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

    expect(getByText("Tambah Tahun Ajaran")).toBeInTheDocument();
    expect(getByPlaceholderText("2025/2026")).toBeInTheDocument();

    // Gunakan query HTML dasar untuk memastikan select element berhasil dirender
    const selectSemester = container.querySelector('select[name="semester"]');
    expect(selectSemester).toBeInTheDocument();
  });

  //AKSI BATAL DAN PENUTUPAN MODAL

  test("Harus sukses menutup modal ketika tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = render(
      <AddAcademicModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={false}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

    const tombolBatal = getByRole("button", { name: /batal/i });
    fireEvent.click(tombolBatal);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);

    const tombolX = getAllByRole("button")[0];
    if (!tombolX) throw new Error("Tombol X tidak ditemukan di DOM");
    fireEvent.click(tombolX);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
  });

  //  LOADING STATE & SUBMIT BERHASIL

  test("Harus memicu status loading, mengirim data form, memicu toast sukses, dan menutup modal", async () => {
    let resolveAction: (value: {
      success: boolean;
      message: string;
    }) => void = () => {};

    vi.mocked(createAcademicYear).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveAction = resolve;
      });
    });

    const { getByRole, getByPlaceholderText, container } = render(
      <AddAcademicModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={false}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

    const inputYear = getByPlaceholderText("2025/2026");
    const selectSemester = container.querySelector('select[name="semester"]');
    const tombolSimpanData = getByRole("button", { name: /simpan data/i });
    const formElement = tombolSimpanData.closest("form");

    if (!selectSemester || !formElement) {
      throw new Error(
        "Elemen input select atau form induk tidak ditemukan di DOM",
      );
    }

    // Isi nilai form secara aman
    fireEvent.change(inputYear, { target: { value: "2026/2027" } });
    fireEvent.change(selectSemester, { target: { value: "GENAP" } });

    // Picu submit form
    fireEvent.submit(formElement);

    // Verifikasi state submission awal
    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);

    // Render ulang simulasi state loading (isSubmitting = true)
    const renderLoading = render(
      <AddAcademicModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={true}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

    const tombolLoading = renderLoading.getByRole("button", {
      name: /menyimpan.../i,
    });
    expect(tombolLoading).toBeDisabled();

    // Selesaikan aksi asinkronus server action
    resolveAction({
      success: true,
      message: "Data tahun ajaran baru berhasil disimpan!",
    });

    await waitFor(() => {
      expect(createAcademicYear).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Data tahun ajaran baru berhasil disimpan!",
      );
      expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
    });
  });

  //  ERROR HANDLING SERVER ACTION

  test("Harus sukses menampilkan pesan error jika server action mengembalikan status gagal", async () => {
    vi.mocked(createAcademicYear).mockResolvedValue({
      success: false,
      message: "Format tahun ajaran yang Anda masukkan salah!",
    });

    const { getByRole, getByPlaceholderText } = render(
      <AddAcademicModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={false}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

    const inputYear = getByPlaceholderText("2025/2026");
    const formElement = getByRole("button", { name: /simpan data/i }).closest(
      "form",
    );

    if (!formElement) throw new Error("Elemen form induk tidak ditemukan");

    fireEvent.change(inputYear, { target: { value: "2026/2027" } });
    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Format tahun ajaran yang Anda masukkan salah!",
      );
      expect(setIsModalOpenMock).not.toHaveBeenCalled();
    });
  });
});
