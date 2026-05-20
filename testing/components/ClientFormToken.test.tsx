import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import ClientFormToken from "@/components/layout/ClientFormToken";
import { verifikasiTokenUjian } from "@/actions/ujian";
import { toast } from "sonner";

// 1. MOCKING DEPENDENSI

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions/ujian", () => ({
  verifikasiTokenUjian: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen Ujian - ClientFormToken", () => {
  const defaultProps = {
    examId: "exam-123",
    studentId: "stud-456",
    subjectName: "Matematika",
    examTypeName: "PAS",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // SKENARIO 1: RENDERING AWAL

  test("Harus sukses merender info ujian dan input token", () => {
    const { getByText, getByPlaceholderText } = render(
      <ClientFormToken {...defaultProps} />,
    );

    expect(getByText("PAS")).toBeInTheDocument();
    expect(getByText("Matematika")).toBeInTheDocument();
    expect(getByPlaceholderText("XXXXXX")).toBeInTheDocument();
  });

  // SKENARIO 2: VERIFIKASI TOKEN BERHASIL

  test("Harus mengarahkan siswa ke halaman ujian jika token valid", async () => {
    vi.mocked(verifikasiTokenUjian).mockResolvedValue({
      success: true,
      attemptId: "attempt-789",
      message: "Token valid!",
    });

    const { getByPlaceholderText, getByRole } = render(
      <ClientFormToken {...defaultProps} />,
    );
    const inputToken = getByPlaceholderText("XXXXXX");
    const tombolSubmit = getByRole("button", { name: /mulai mengerjakan/i });

    fireEvent.change(inputToken, { target: { value: "123456" } });

    await act(async () => {
      fireEvent.click(tombolSubmit);
    });

    await waitFor(() => {
      expect(verifikasiTokenUjian).toHaveBeenCalledWith(
        "exam-123",
        "stud-456",
        "123456",
      );
      expect(mockPush).toHaveBeenCalledWith("/ujian/attempt-789");
      expect(toast.success).toHaveBeenCalledWith("Token valid!");
    });
  });

  // SKENARIO 3: VERIFIKASI TOKEN GAGAL

  test("Harus menampilkan toast error jika token salah", async () => {
    vi.mocked(verifikasiTokenUjian).mockResolvedValue({
      success: false,
      message: "Token kadaluarsa atau salah!",
    });

    const { getByPlaceholderText, getByRole } = render(
      <ClientFormToken {...defaultProps} />,
    );
    const inputToken = getByPlaceholderText("XXXXXX");
    const tombolSubmit = getByRole("button", { name: /mulai mengerjakan/i });

    fireEvent.change(inputToken, { target: { value: "SALAH" } });

    await act(async () => {
      fireEvent.click(tombolSubmit);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Token kadaluarsa atau salah!");
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // SKENARIO 4: LOADING STATE

  test("Harus menonaktifkan tombol dan input saat proses verifikasi berlangsung", async () => {
    // Kita buat action pending (menggantung)
    vi.mocked(verifikasiTokenUjian).mockImplementation(
      () => new Promise(() => {}),
    );

    const { getByPlaceholderText, getByRole, getByText } = render(
      <ClientFormToken {...defaultProps} />,
    );

    fireEvent.change(getByPlaceholderText("XXXXXX"), {
      target: { value: "123456" },
    });
    fireEvent.click(getByRole("button", { name: /mulai mengerjakan/i }));

    expect(getByText("Memverifikasi Token...")).toBeInTheDocument();
    expect(getByRole("button")).toBeDisabled();
    expect(getByPlaceholderText("XXXXXX")).toBeDisabled();
  });
});
