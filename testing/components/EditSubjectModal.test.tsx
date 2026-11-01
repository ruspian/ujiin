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
    assignments: [{ classId: "c-1", teacherId: "t-1" }],
  } as unknown as EditSubjectModalProps["subjectData"];

  const mockReligions = [{ id: "r-1", name: "Islam" }];

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
        religions={mockReligions}
        isSubmitting={isSubmitting}
        setIsModalEditOpen={setIsModalEditOpenMock}
        setIsSubmitting={setIsSubmittingMock}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL & VALUE DEFAULT
  // ==========================================
  test("Harus sukses merender judul modal, nama mapel, hidden input ID, dan plot guru-kelas awal", () => {
    const { getByText, getByRole, container } = renderModal();

    expect(getByText("Edit Mata Pelajaran")).toBeInTheDocument();

    const inputHidden = container.querySelector(
      'input[name="id"]',
    ) as HTMLInputElement;
    expect(inputHidden.value).toBe("sbj-999");

    const inputName = container.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement;
    expect(inputName.value).toBe("Pemrograman Web Dasar");

    // Satu baris plot awal: kelas c-1 diampu guru t-1
    const selects = container.querySelectorAll("select[required]");
    expect(selects).toHaveLength(2);
    expect((selects[0] as HTMLSelectElement).value).toBe("c-1");
    expect((selects[1] as HTMLSelectElement).value).toBe("t-1");

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
  test("Harus bisa menambah baris plot, dan menolak menghapus baris terakhir", () => {
    const { container, getByRole, getAllByTitle } = renderModal();

    fireEvent.click(getByRole("button", { name: /tambah baris/i }));
    expect(container.querySelectorAll("select[required]")).toHaveLength(4);

    // hapus satu baris -> sisa satu; hapus lagi ditolak dengan toast
    fireEvent.click(getAllByTitle("Hapus baris")[1]);
    expect(container.querySelectorAll("select[required]")).toHaveLength(2);
    fireEvent.click(getAllByTitle("Hapus baris")[0]);
    expect(container.querySelectorAll("select[required]")).toHaveLength(2);
    expect(toast.error).toHaveBeenCalledWith(
      "Minimal harus ada satu pengampu mata pelajaran!",
    );
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
    const sent = vi.mocked(updateSubject).mock.calls[0][0] as FormData;
    expect(sent.get("id")).toBe("sbj-999");
    expect(JSON.parse(sent.get("assignments") as string)).toEqual([
      { classId: "c-1", teacherId: "t-1" },
    ]);

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
