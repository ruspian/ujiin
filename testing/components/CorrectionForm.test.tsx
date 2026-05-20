import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import CorrectionForm from "@/components/layout/CorrectionForm";
import { updateAttemptScore } from "@/actions/koreksi";
import { toast } from "sonner";
import { Question } from "@prisma/client";
import { CorrectionFormProps } from "@/types/attempt"; // Import interface asli

// Mock dependencies
vi.mock("@/actions/koreksi", () => ({
  updateAttemptScore: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen Koreksi - CorrectionForm", () => {
  const mockQuestions: Question[] = [
    {
      id: "q1",
      text: "Apa itu React?",
      type: "ESSAY",
      score: 10,
      correctAnswer: "Library UI",
      options: [],
      classId: "cls-1",
      examTypeId: null,
      authorId: "user-1",
      subjectId: "subj-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // 🔥 Gunakan CorrectionFormProps agar TS mendeteksi field yang kurang (seperti studentName)
  const defaultProps: CorrectionFormProps = {
    attemptId: "att-1",
    examId: "exam-1",
    questions: mockQuestions,
    initialAnswers: {
      q1: { value: "Library JS", score: 0, isGraded: false },
    },
    studentName: "Budi Santoso", // Data wajib baru
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("Harus sukses merender pertanyaan dan jawaban siswa", () => {
    const { getByText } = render(<CorrectionForm {...defaultProps} />);

    expect(getByText("Apa itu React?")).toBeInTheDocument();
    expect(getByText("Library JS")).toBeInTheDocument();
    expect(getByText("Library UI")).toBeInTheDocument();
  });

  test("Harus memvalidasi nilai input agar tidak melebihi poin maksimal", async () => {
    const { getByPlaceholderText } = render(
      <CorrectionForm {...defaultProps} />,
    );
    const inputScore = getByPlaceholderText("0");

    await act(async () => {
      fireEvent.change(inputScore, { target: { value: "15" } });
    });

    expect(inputScore).toHaveValue(10);
  });

  test("Harus sukses menyimpan nilai dan melakukan redirect saat simpan berhasil", async () => {
    vi.mocked(updateAttemptScore).mockResolvedValue({
      success: true,
      message: "Berhasil disimpan",
    });

    const { getByText, getByPlaceholderText } = render(
      <CorrectionForm {...defaultProps} />,
    );

    fireEvent.change(getByPlaceholderText("0"), { target: { value: "8" } });

    await act(async () => {
      fireEvent.click(getByText("Simpan & Selesai"));
    });

    await waitFor(() => {
      expect(updateAttemptScore).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  test("Harus menampilkan error jika sistem gagal menyimpan", async () => {
    vi.mocked(updateAttemptScore).mockResolvedValue({
      success: false,
      message: "Gagal update!",
    });

    const { getByText } = render(<CorrectionForm {...defaultProps} />);

    await act(async () => {
      fireEvent.click(getByText("Simpan & Selesai"));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Gagal update!", {
        id: "toast-id",
      });
    });
  });
});
