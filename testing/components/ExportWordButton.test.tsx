import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import ExportWordButton from "@/components/layout/ExportWordButton"; // Sesuaikan path jika berbeda
import { exportQuestionsToWord } from "@/lib/exportWord";
import { toast } from "sonner";
import { Question } from "@prisma/client";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/lib/exportWord", () => ({
  exportQuestionsToWord: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    promise: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - ExportWordButton", () => {
  // 🔥 Casting murni menggunakan kontrak tipe Question dari Prisma tanpa 'any'
  const mockQuestions = [
    {
      id: "q-101",
      examId: "exam-99",
      type: "MULTIPLE_CHOICE",
      question: "Apa ibukota Sulawesi Utara?",
      answer: "Manado",
      options: ["Manado", "Makassar", "Palu", "Kendari"],
    },
  ] as unknown as Question[];

  const defaultProps = {
    questions: mockQuestions,
    subjectName: "Geografi",
    className: "XII IPS 1",
    examName: "Ujian Akhir Semester",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = defaultProps) =>
    render(<ExportWordButton {...props} />);

  // ==========================================
  // SKENARIO 1: RENDERING AWAL
  // ==========================================
  test("Harus sukses merender tombol Export dengan ikon dan teks yang sesuai", () => {
    const { getByRole, getByText } = renderComponent();

    // Pastikan tombol ter-render dan tidak terkunci
    const btnExport = getByRole("button", { name: /export/i });
    expect(btnExport).toBeInTheDocument();
    expect(btnExport).not.toBeDisabled();

    // Pastikan teks terlihat
    expect(getByText("Export")).toBeInTheDocument();
  });

  // ==========================================
  // SKENARIO 2: ERROR VALIDASI (DATA KOSONG)
  // ==========================================
  test("Harus memblokir eksekusi dan memunculkan toast error jika array soal kosong", () => {
    // Override props untuk menyuntikkan array kosong
    const { getByRole } = renderComponent({ ...defaultProps, questions: [] });

    fireEvent.click(getByRole("button", { name: /export/i }));

    // Verifikasi validasi klien berjalan tanpa menyentuh fungsi ekspor
    expect(toast.error).toHaveBeenCalledWith("Tidak ada soal untuk diexport!");
    expect(exportQuestionsToWord).not.toHaveBeenCalled();
    expect(toast.promise).not.toHaveBeenCalled();
  });

  // ==========================================
  // SKENARIO 3: SUCCESS FLOW (TRIGGER EKSPOR)
  // ==========================================
  test("Harus memanggil fungsi exportQuestionsToWord dan menyerahkan penanganan loading ke toast.promise", () => {
    // Siapkan janji kosong palsu dengan mockImplementation agar 100% Type-Safe
    const fakePromise = Promise.resolve();
    vi.mocked(exportQuestionsToWord).mockImplementation(
      () => fakePromise as never,
    );

    const { getByRole } = renderComponent();

    fireEvent.click(getByRole("button", { name: /export/i }));

    // Verifikasi argumen yang dikirim ke fungsi library ekspor sudah presisi
    expect(exportQuestionsToWord).toHaveBeenCalledWith({
      questions: mockQuestions,
      subjectName: "Geografi",
      className: "XII IPS 1",
      examName: "Ujian Akhir Semester",
    });

    // Verifikasi toast.promise menerima argumen yang tepat dari komponen
    expect(toast.promise).toHaveBeenCalledWith(fakePromise, {
      loading: "Menyiapkan dokumen Word...",
      success: "Dokumen berhasil diunduh!",
      error: "Gagal mengexport soal.",
    });
  });
});
