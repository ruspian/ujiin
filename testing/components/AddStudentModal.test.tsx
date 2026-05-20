import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import AddStudentModal from "@/components/layout/AddStudentModal";
import { createStudent } from "@/actions/student";
import { toast } from "sonner";

// 1. MOCKING DEPENDENSI SERVER ACTION & TOAST

vi.mock("@/actions/student", () => ({
  createStudent: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - AddStudentModal (Form Action Mode)", () => {
  let setIsModalOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  const mockClasses = [{ id: "cls-1", name: "10 RPL 1", level: 10 }];
  const mockReligions = [{ id: "rel-1", name: "Islam" }];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (isSubmittingState = false) =>
    render(
      <AddStudentModal
        setIsModalOpen={setIsModalOpenMock}
        isSubmitting={isSubmittingState}
        setIsSubmitting={setIsSubmittingMock}
        classes={mockClasses}
        religions={mockReligions}
      />,
    );

  // SKENARIO 1: RENDERING & OPSI RELASI

  test("Harus sukses merender struktur form input, select relasi, dan judul modal", () => {
    const { getByText, container } = renderModal();

    expect(getByText("Tambah Siswa Baru")).toBeInTheDocument();

    // Validasi input text
    expect(container.querySelector('input[name="nisn"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="name"]')).toBeInTheDocument();

    // Validasi select dropdown dan data relasinya
    const selectClass = container.querySelector('select[name="classId"]');
    const selectReligion = container.querySelector('select[name="religionId"]');

    expect(selectClass).toBeInTheDocument();
    expect(selectReligion).toBeInTheDocument();

    expect(getByText("10 RPL 1")).toBeInTheDocument();
    expect(getByText("Islam")).toBeInTheDocument();
  });

  // SKENARIO 2: AKSI BATAL DAN PENUTUPAN MODAL

  test("Harus sukses menutup modal ketika tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = renderModal();

    const tombolBatal = getByRole("button", { name: /batal/i });
    fireEvent.click(tombolBatal);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);

    const tombolX = getAllByRole("button")[0];
    if (!tombolX) throw new Error("Tombol X tidak ditemukan di DOM");
    fireEvent.click(tombolX);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
  });

  // SKENARIO 3: SUCCESS FLOW & SUBMIT BERHASIL

  test("Harus memicu fungsi loading, mengeksekusi server action, memunculkan toast sukses, dan menutup modal", async () => {
    vi.mocked(createStudent).mockResolvedValue({
      success: true,
      message: "Data siswa berhasil disimpan!",
    });

    const { getByRole, container } = renderModal();

    const inputNisn = container.querySelector('input[name="nisn"]');
    const inputName = container.querySelector('input[name="name"]');
    const selectClass = container.querySelector('select[name="classId"]');
    const selectReligion = container.querySelector('select[name="religionId"]');
    const tombolSimpan = getByRole("button", { name: /simpan siswa/i });

    if (!inputNisn || !inputName || !selectClass || !selectReligion) {
      throw new Error("Ada elemen form yang tidak ditemukan di DOM");
    }

    // 1. Isi seluruh field data siswa
    fireEvent.change(inputNisn, { target: { value: "0051234567" } });
    fireEvent.change(inputName, { target: { value: "Ahmad Fadillah" } });
    fireEvent.change(selectClass, { target: { value: "cls-1" } });
    fireEvent.change(selectReligion, { target: { value: "rel-1" } });

    // 2. Picu pengiriman form action (klik via act)
    await act(async () => {
      fireEvent.click(tombolSimpan);
    });

    // 3. Verifikasi state loading dioper ke komponen induk
    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);

    // 4. Verifikasi eksekusi akhir
    await waitFor(() => {
      expect(createStudent).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Data siswa berhasil disimpan!",
      );
      expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
    });
  });

  test("Harus merender tombol dalam kondisi terkunci dengan teks 'Menyimpan...' saat isSubmitting = true", () => {
    const { getByRole, getByText } = renderModal(true); // Lempar state true dari parameter

    const tombolLoading = getByRole("button", { name: /menyimpan.../i });

    expect(getByText("Menyimpan...")).toBeInTheDocument();
    expect(tombolLoading).toBeDisabled();
  });

  // SKENARIO 4: ERROR HANDLING SERVER ACTION

  test("Harus sukses menampilkan pesan error jika server gagal menyimpan (misal: NISN ganda)", async () => {
    vi.mocked(createStudent).mockResolvedValue({
      success: false,
      message: "NISN sudah terdaftar pada siswa lain!",
    });

    const { getByRole, container } = renderModal();

    const inputNisn = container.querySelector('input[name="nisn"]');
    const inputName = container.querySelector('input[name="name"]');
    const selectClass = container.querySelector('select[name="classId"]');
    const selectReligion = container.querySelector('select[name="religionId"]');
    const tombolSimpan = getByRole("button", { name: /simpan siswa/i });

    if (!inputNisn || !inputName || !selectClass || !selectReligion) {
      throw new Error("Ada elemen form yang tidak ditemukan di DOM");
    }

    fireEvent.change(inputNisn, { target: { value: "0051234567" } });
    fireEvent.change(inputName, { target: { value: "Ahmad Fadillah" } });
    fireEvent.change(selectClass, { target: { value: "cls-1" } });
    fireEvent.change(selectReligion, { target: { value: "rel-1" } });

    await act(async () => {
      fireEvent.click(tombolSimpan);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "NISN sudah terdaftar pada siswa lain!",
      );
      // Modal wajib tetap terbuka kalau ada error
      expect(setIsModalOpenMock).not.toHaveBeenCalled();
    });
  });
});
