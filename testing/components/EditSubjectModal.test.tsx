import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import EditSubjectModal from "@/components/layout/EditSubjectModal"; // Sesuaikan path komponen lu bos!
import { updateSubject } from "@/actions/subject";
import { toast } from "sonner";
import { EditSubjectModalProps } from "@/types/data.master";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/subject", () => ({
  updateSubject: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - EditSubjectModal", () => {
  let setIsModalEditOpenMock: Mock<(open: boolean) => void>;
  let setIsSubmittingMock: Mock<(submitting: boolean) => void>;

  // 🔥 Casting murni menggunakan skema interface asli bawaan tanpa 'any'
  const mockSubjectData = {
    id: "sbj-999",
    name: "Pemrograman Web Dasar",
    teachers: [{ id: "t-1", name: "Budi Santoso" }],
    classes: [{ id: "c-1", name: "X RPL 1" }],
  } as unknown as EditSubjectModalProps["subjectData"];

  const mockTeachers = [
    { id: "t-1", name: "Budi Santoso" },
    { id: "t-2", name: "Siti Aminah" },
  ] as unknown as EditSubjectModalProps["teachers"];

  const mockClasses = [
    { id: "c-1", name: "X RPL 1" },
    { id: "c-2", name: "X RPL 2" },
  ] as unknown as EditSubjectModalProps["classes"];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalEditOpenMock = vi.fn();
    setIsSubmittingMock = vi.fn();
  });

  const renderModal = (isSubmitting = false) =>
    render(
      <EditSubjectModal
        subjectData={mockSubjectData}
        teachers={mockTeachers}
        classes={mockClasses}
        isSubmitting={isSubmitting}
        setIsModalEditOpen={setIsModalEditOpenMock}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL & VALUE DEFAULT
  // ==========================================
  test("Harus sukses merender judul modal, default value nama mapel, hidden input ID, dan state checkbox", () => {
    const { getByText, getByRole, container } = renderModal();

    expect(getByText("Edit Mata Pelajaran")).toBeInTheDocument();

    // Verifikasi hidden input ID
    const inputHidden = container.querySelector(
      'input[name="id"]',
    ) as HTMLInputElement;
    expect(inputHidden.value).toBe("sbj-999");

    // Verifikasi default value input nama mapel menggunakan selector (kebal dari peringatan label)
    const inputName = container.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement;
    expect(inputName).toBeInTheDocument();
    expect(inputName.value).toBe("Pemrograman Web Dasar");

    // Verifikasi checkbox relasi Guru (T-1 harusnya checked, T-2 unchecked)
    const cbTeacher1 = container.querySelector(
      'input[name="teacherIds"][value="t-1"]',
    ) as HTMLInputElement;
    const cbTeacher2 = container.querySelector(
      'input[name="teacherIds"][value="t-2"]',
    ) as HTMLInputElement;
    expect(cbTeacher1.checked).toBe(true);
    expect(cbTeacher2.checked).toBe(false);

    // Verifikasi checkbox relasi Kelas (C-1 harusnya checked, C-2 unchecked)
    const cbClass1 = container.querySelector(
      'input[name="classIds"][value="c-1"]',
    ) as HTMLInputElement;
    const cbClass2 = container.querySelector(
      'input[name="classIds"][value="c-2"]',
    ) as HTMLInputElement;
    expect(cbClass1.checked).toBe(true);
    expect(cbClass2.checked).toBe(false);

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

    // Klik tombol X (tombol paling atas)
    const tombolX = getAllByRole("button")[0];
    if (tombolX) fireEvent.click(tombolX);
    expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
  });

  // ==========================================
  // SKENARIO 3: INTERAKSI CHECKBOX RELASI
  // ==========================================
  test("Harus bisa berinteraksi (centang/hapus centang) dengan daftar pilihan Guru dan Kelas", () => {
    const { container } = renderModal();

    const cbTeacher2 = container.querySelector(
      'input[name="teacherIds"][value="t-2"]',
    ) as HTMLInputElement;

    // Status awal T-2 belum dicentang, kita klik supaya dicentang
    expect(cbTeacher2.checked).toBe(false);
    fireEvent.click(cbTeacher2);
    expect(cbTeacher2.checked).toBe(true);

    const cbClass1 = container.querySelector(
      'input[name="classIds"][value="c-1"]',
    ) as HTMLInputElement;

    // Status awal C-1 sudah dicentang, kita klik supaya batal dicentang
    expect(cbClass1.checked).toBe(true);
    fireEvent.click(cbClass1);
    expect(cbClass1.checked).toBe(false);
  });

  // ==========================================
  // SKENARIO 4: SUCCESS FLOW (UPDATE BERHASIL)
  // ==========================================
  test("Harus memicu Server Action, merubah state loading, dan menampilkan toast sukses", async () => {
    vi.mocked(updateSubject).mockResolvedValue({
      success: true,
      message: "Data mata pelajaran berhasil diperbarui!",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    // Kirim event submit langsung ke form element
    await act(async () => {
      fireEvent.submit(formElement);
    });

    expect(setIsSubmittingMock).toHaveBeenCalledWith(true);
    expect(updateSubject).toHaveBeenCalled();

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Data mata pelajaran berhasil diperbarui!",
      );
      expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 5: ERROR HANDLING (SERVER GAGAL)
  // ==========================================
  test("Harus menampilkan toast error jika Server Action mengembalikan respons gagal", async () => {
    vi.mocked(updateSubject).mockResolvedValue({
      success: false,
      message: "Gagal memperbarui! Nama mapel sudah ada.",
    });

    const { container } = renderModal();
    const formElement = container.querySelector("form");
    if (!formElement) throw new Error("Elemen form tidak ditemukan");

    await act(async () => {
      fireEvent.submit(formElement);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal memperbarui! Nama mapel sudah ada.",
      );
      expect(setIsModalEditOpenMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // SKENARIO 6: LOCAL LOADING STATE
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Menyimpan...' saat isSubmitting bernilai true", () => {
    // Injeksi state dari props pembungkus, no JS trickery needed!
    const { getByRole, getByText } = renderModal(true);

    expect(getByText("Menyimpan...")).toBeInTheDocument();

    const tombolLoading = getByRole("button", { name: /menyimpan.../i });
    expect(tombolLoading).toBeDisabled();
  });
});
