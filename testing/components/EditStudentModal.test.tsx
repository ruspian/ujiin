import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import EditStudentModal from "@/components/layout/EditStudentModal"; // Sesuaikan path komponen lu bos!
import { updateStudent } from "@/actions/student";
import { toast } from "sonner";
import { EditStudentModalProps } from "@/types/student";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/student", () => ({
  updateStudent: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - EditStudentModal", () => {
  let setIsModalEditOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  // 🔥 Casting data tiruan murni menggunakan kontrak interface asli tanpa 'any'
  const mockStudentData = {
    id: "std-111",
    nisn: "0012345678",
    name: "Ruspian Majid",
    classId: "cls-A",
    religionId: "rel-1",
  } as unknown as EditStudentModalProps["studentData"];

  const mockClasses = [
    { id: "cls-A", name: "XII Teknik Informatika 1", level: 12 },
    { id: "cls-B", name: "XII Teknik Informatika 2", level: 12 },
  ];

  const mockReligions = [
    { id: "rel-1", name: "Islam" },
    { id: "rel-2", name: "Kristen Protestan" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalEditOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (isSubmitting = false) =>
    render(
      <EditStudentModal
        studentData={mockStudentData}
        classes={mockClasses}
        religions={mockReligions}
        isSubmitting={isSubmitting}
        setIsModalEditOpen={setIsModalEditOpenMock}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL & VALUE DEFAULT
  // ==========================================
  test("Harus sukses merender judul modal, default value NISN, Nama, seleksi Kelas, dan seleksi Agama", () => {
    const { getByText, getByRole, container } = renderModal();

    expect(getByText("Edit Data Siswa")).toBeInTheDocument();

    // Verifikasi hidden input ID
    const inputHidden = container.querySelector(
      'input[name="id"]',
    ) as HTMLInputElement;
    expect(inputHidden.value).toBe("std-111");

    // Verifikasi default value input NISN dan Name via attribute selector
    const inputNisn = container.querySelector(
      'input[name="nisn"]',
    ) as HTMLInputElement;
    expect(inputNisn).toBeInTheDocument();
    expect(inputNisn.value).toBe("0012345678");

    const inputName = container.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement;
    expect(inputName).toBeInTheDocument();
    expect(inputName.value).toBe("Ruspian Majid");

    // 🔥 PERBAIKAN: Deteksi langsung menggunakan name attribute selector, 100% bebas dari batasan role "form"
    const selectClass = container.querySelector(
      'select[name="classId"]',
    ) as HTMLSelectElement;
    const selectReligion = container.querySelector(
      'select[name="religionId"]',
    ) as HTMLSelectElement;

    expect(selectClass).toBeInTheDocument();
    expect(selectClass.value).toBe("cls-A");

    expect(selectReligion).toBeInTheDocument();
    expect(selectReligion.value).toBe("rel-1");

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

    // Klik tombol X di kanan atas modal
    const tombolX = getAllByRole("button")[0];
    if (tombolX) fireEvent.click(tombolX);
    expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
  });

  // ==========================================
  // SKENARIO 3: SUCCESS FLOW (UPDATE BERHASIL)
  // ==========================================
  test("Harus memicu Server Action, merubah state loading, dan menampilkan toast sukses", async () => {
    vi.mocked(updateStudent).mockResolvedValue({
      success: true,
      message: "Data siswa berhasil diperbarui!",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    // Kirim event submit langsung ke form element untuk mem-bypass error klik JSDOM
    await act(async () => {
      fireEvent.submit(formElement);
    });

    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);
    expect(updateStudent).toHaveBeenCalled();

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Data siswa berhasil diperbarui!",
      );
      expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 4: ERROR HANDLING (SERVER GAGAL)
  // ==========================================
  test("Harus menampilkan toast error jika Server Action mengembalikan respons gagal", async () => {
    vi.mocked(updateStudent).mockResolvedValue({
      success: false,
      message: "Gagal memperbarui! NISN sudah digunakan oleh siswa lain.",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    await act(async () => {
      fireEvent.submit(formElement);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal memperbarui! NISN sudah digunakan oleh siswa lain.",
      );
      expect(setIsModalEditOpenMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menyimpan...' saat isSubmitting bernilai true", () => {
    // Kontrol langsung state loading dari props secara sinkronus tanpa interupsi JSDOM
    const { getByRole, getByText } = renderModal(true);

    expect(getByText("Menyimpan...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menyimpan.../i });
    expect(tombolLoading).toBeDisabled();
  });
});
