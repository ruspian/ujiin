import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import FormSoal from "@/components/layout/FormSoal"; // Sesuaikan path jika berbeda
import { createQuestion } from "@/actions/question";
import { toast } from "sonner";
import { ExtendedFormSoalProps } from "@/types/question";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
vi.mock("@/actions/question", () => ({
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Next.js Router
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// 🔥 MOCKING CRUCIAL: Ubah RichTextEditor jadi textarea biasa agar JSDOM tidak meledak
vi.mock("@/components/layout/RichTextEditor", () => ({
  default: ({
    content,
    onChange,
  }: {
    content: string;
    onChange: (val: string) => void;
  }) => (
    <textarea
      data-testid="mock-rich-text"
      value={content}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe("Pengujian Komponen UI - FormSoal", () => {
  const defaultProps = {
    subjectId: "sbj-1",
    classId: "cls-1",
    typeId: "type-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<ExtendedFormSoalProps> = {}) =>
    render(<FormSoal {...defaultProps} {...props} />);

  // ==========================================
  // SKENARIO 1: RENDERING AWAL (MODE BUAT SOAL)
  // ==========================================
  test("Harus merender form pembuatan soal dengan default Pilihan Ganda", () => {
    const { getByText, getByTestId, getByRole } = renderComponent();

    // Pastikan tombol submit bertuliskan "Simpan Soal"
    expect(getByText("Simpan Soal")).toBeInTheDocument();

    // Pastikan jenis soal default
    const selectType = getByRole("combobox") as HTMLSelectElement;
    expect(selectType.value).toBe("MULTIPLE_CHOICE");

    // Pastikan opsi A, B, C, D, E terender
    expect(getByText("Opsi Jawaban & Kunci")).toBeInTheDocument();

    // Pastikan mock RichTextEditor terender
    expect(getByTestId("mock-rich-text")).toBeInTheDocument();
  });

  // ==========================================
  // SKENARIO 2: RENDERING AWAL (MODE EDIT SOAL)
  // ==========================================
  test("Harus merender form dengan data awal dan mode Update", () => {
    // 🔥 Casting murni, anti 'any'
    const mockInitialData = {
      id: "q-99",
      type: "ESSAY",
      text: "<p>Jelaskan cara kerja React!</p>",
      score: 25,
      correctAnswer: "React menggunakan Virtual DOM...",
      options: [],
    } as unknown as ExtendedFormSoalProps["initialData"];

    const { getByText, getByTestId, getByDisplayValue } = renderComponent({
      questionId: "q-99",
      initialData: mockInitialData,
    });

    expect(getByText("Update Soal")).toBeInTheDocument();

    // Verifikasi teks soal masuk ke dalam mock editor
    const editor = getByTestId("mock-rich-text") as HTMLTextAreaElement;
    expect(editor.value).toBe("<p>Jelaskan cara kerja React!</p>");

    // Verifikasi nilai bobot score
    expect(getByDisplayValue("25")).toBeInTheDocument();

    // Verifikasi kunci jawaban essay
    const inputAnswer = getByDisplayValue(
      "React menggunakan Virtual DOM...",
    ) as HTMLTextAreaElement;
    expect(inputAnswer).toBeInTheDocument();
  });

  // ==========================================
  // SKENARIO 3: VALIDASI ERROR (TEKS SOAL KOSONG)
  // ==========================================
  test("Harus memblokir submit dan memunculkan toast error jika teks soal dibiarkan kosong", async () => {
    const { getByRole } = renderComponent();

    const form = getByRole("button", { name: /simpan soal/i }).closest("form")!;

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(toast.error).toHaveBeenCalledWith("Teks pertanyaan wajib diisi!");
    expect(createQuestion).not.toHaveBeenCalled();
  });

  // ==========================================
  // SKENARIO 4: SUCCESS FLOW (BUAT SOAL ESAI)
  // ==========================================
  test("Harus sukses membuat soal Esai dan mengarahkan pengguna kembali", async () => {
    vi.mocked(createQuestion).mockResolvedValue({
      success: true,
      message: "Soal berhasil ditambahkan!",
    });

    const { getByRole, getByTestId, getByPlaceholderText } = renderComponent();

    // 1. Ubah tipe soal ke Essay
    const selectType = getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(selectType, { target: { value: "ESSAY" } });

    // 2. Isi teks pertanyaan
    const editor = getByTestId("mock-rich-text") as HTMLTextAreaElement;
    fireEvent.change(editor, {
      target: { value: "<p>Sebutkan 3 rukun iman!</p>" },
    });

    // 3. Isi kunci jawaban
    const inputAnswer = getByPlaceholderText(
      /Contoh: Siswa menjawab A mendapat skor 5/i,
    ) as HTMLTextAreaElement;
    fireEvent.change(inputAnswer, {
      target: { value: "Iman kepada Allah, Malaikat, dan Kitab-kitabnya" },
    });

    // 4. Submit form
    const form = getByRole("button", { name: /simpan soal/i }).closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    // 5. Verifikasi pemanggilan server action dengan payload yang tepat
    await waitFor(() => {
      expect(createQuestion).toHaveBeenCalledWith({
        subjectId: "sbj-1",
        classId: "cls-1",
        typeId: "type-1",
        type: "ESSAY",
        score: 10,
        text: "<p>Sebutkan 3 rukun iman!</p>",
        options: [], // Esai tidak punya opsi
        correctAnswer: "Iman kepada Allah, Malaikat, dan Kitab-kitabnya",
      });

      expect(toast.success).toHaveBeenCalledWith("Soal berhasil ditambahkan!");
      expect(mockPush).toHaveBeenCalledWith(
        "/guru/soal/sbj-1?classId=cls-1&type=type-1",
      );
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE & BATAL
  // ==========================================
  test("Harus memanggil router.back saat tombol batal diklik", () => {
    const { getByRole } = renderComponent();

    // Verifikasi tombol batal memanggil router.back
    fireEvent.click(getByRole("button", { name: /batal/i }));

    // Pastikan fungsi kembali (back) dari next/navigation terpanggil
    expect(mockBack).toHaveBeenCalled();
  });
});
