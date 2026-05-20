import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import EditJadwalModal from "@/components/layout/EditJadwalModal"; // Sesuaikan path komponen lu bos!
import { updateExam } from "@/actions/exam";
import { toast } from "sonner";
import { EditJadwalModalProps } from "@/types/exam";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/exam", () => ({
  updateExam: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - EditJadwalModal", () => {
  let setIsModalEditOpenMock: Mock<(open: boolean) => void>;

  // 🔥 Casting murni menggunakan skema interface asli bawaan tanpa 'any'
  const mockItemData = {
    id: "exam-99",
    title: "Ujian Harian Pemrograman",
    startTime: "2026-05-20T08:00:00+08:00",
    endTime: "2026-05-20T10:00:00+08:00",
    randomizeQuestions: true,
    showResult: false,
    status: "DRAFT",
    subject: { id: "sbj-1", name: "Informatika" },
    examType: { id: "type-1", name: "UH" },
    academicYear: { id: "acd-1", name: "2025/2026" },
    classes: [{ id: "cls-1", name: "X RPL 1" }],
  } as unknown as EditJadwalModalProps["itemData"];

  const mockSubjects = [
    { id: "sbj-1", name: "Informatika" },
    { id: "sbj-2", name: "Matematika" },
  ];
  const mockExamTypes = [
    { id: "type-1", name: "UH" },
    { id: "type-2", name: "UTS" },
  ];
  const mockClasses = [
    { id: "cls-1", name: "X RPL 1" },
    { id: "cls-2", name: "X RPL 2" },
  ];
  const mockAcademicYears = [{ id: "acd-1", name: "2025/2026" }];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalEditOpenMock = vi.fn();
  });

  const renderModal = () =>
    render(
      <EditJadwalModal
        itemData={mockItemData}
        setIsModalEditOpen={setIsModalEditOpenMock}
        subjects={mockSubjects}
        examTypes={mockExamTypes}
        classes={mockClasses}
        academicYears={mockAcademicYears}
      />,
    );

  // ==========================================
  // SKENARIO 1: RENDERING AWAL
  // ==========================================
  test("Harus sukses merender judul modal, default value input, dan opsi pilihan kelas", () => {
    const { getByText, getByDisplayValue, getByLabelText } = renderModal();

    expect(getByText("Edit Jadwal Ujian")).toBeInTheDocument();
    expect(getByDisplayValue("Ujian Harian Pemrograman")).toBeInTheDocument();

    // Memastikan checkbox kelas terender dan mengikuti default values
    const checkbox1 = getByLabelText("X RPL 1") as HTMLInputElement;
    const checkbox2 = getByLabelText("X RPL 2") as HTMLInputElement;
    expect(checkbox1.checked).toBe(true);
    expect(checkbox2.checked).toBe(false);
  });

  // ==========================================
  // SKENARIO 2: AKSI BATAL
  // ==========================================
  test("Harus memanggil setIsModalEditOpen(false) saat tombol Batal diklik", () => {
    const { getByRole } = renderModal();

    fireEvent.click(getByRole("button", { name: /batal/i }));
    expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
  });

  // ==========================================
  // SKENARIO 3: INTERAKSI CHECKBOX PESERTA KELAS
  // ==========================================
  test("Harus bisa menambah atau mengurangi daftar pilihan kelas peserta ujian", () => {
    const { getByLabelText } = renderModal();

    const checkbox2 = getByLabelText("X RPL 2") as HTMLInputElement;
    expect(checkbox2.checked).toBe(false);

    // Simulasikan pilih kelas tambahan
    fireEvent.click(checkbox2);
    expect(checkbox2.checked).toBe(true);

    // Simulasikan lepas pilihan
    fireEvent.click(checkbox2);
    expect(checkbox2.checked).toBe(false);
  });

  // ==========================================
  // SKENARIO 4: SUCCESS FLOW (UPDATE JADWAL BERHASIL)
  // ==========================================
  test("Harus memicu server action updateExam dengan payload yang terformat pasca submit form", async () => {
    vi.mocked(updateExam).mockResolvedValue({
      success: true,
      message: "Jadwal ujian berhasil diperbarui!",
    });

    const { getByRole } = renderModal();

    await act(async () => {
      fireEvent.submit(
        getByRole("button", { name: /simpan perubahan/i }).closest("form")!,
      );
    });

    await waitFor(() => {
      expect(updateExam).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Jadwal ujian berhasil diperbarui!",
      );
      expect(setIsModalEditOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE (MURNI ASYNC)
  // ==========================================
  test("Harus mengunci tombol submit dan mengubah teks status menjadi 'Menympan...' saat proses kirim sedang aktif", async () => {
    type ActionResponse = { success: boolean; message: string };
    let resolvePromise!: (value: ActionResponse) => void;

    const deferredPromise = new Promise<ActionResponse>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(updateExam).mockReturnValue(deferredPromise);

    const { getByRole, findByText } = renderModal();

    // Jalankan submit form secara sinkronus agar state transisi isSubmitting berubah ke true
    fireEvent.submit(
      getByRole("button", { name: /simpan perubahan/i }).closest("form")!,
    );

    // Gunakan findByText asinkronus untuk menunggu re-render state loading lokal
    const tombolLoading = await findByText("Menyimpan...");
    expect(tombolLoading).toBeInTheDocument();
    expect(tombolLoading).toBeDisabled();

    // Bersihkan memori siklus testing dengan menyelesaikan janji promise gantung
    await act(async () => {
      resolvePromise({ success: true, message: "Selesai" });
    });
  });
});
