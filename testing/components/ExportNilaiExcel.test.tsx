import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach,
  Mock,
} from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import ExportNilaiExcel from "@/components/layout/ExportNilaiExcel"; // Sesuaikan path komponen lu bos!
import { toast } from "sonner";
import { ExportExcelProps } from "@/types/rekap-nilai";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
const writeXlsxFileMock: Mock = vi.hoisted(() => vi.fn());
vi.mock("write-excel-file", () => ({ default: writeXlsxFileMock }));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-id-999"),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - ExportNilaiExcel", () => {
  // 🔥 Casting murni menggunakan skema interface asli tanpa 'any'
  const mockStudents = [
    { id: "std-1", name: "Ruspian Majid", nisn: "0012345678" },
    { id: "std-2", name: "Budi Santoso", nisn: "0012345679" },
  ] as ExportExcelProps["students"];

  const mockExams = [
    { id: "ex-1", title: "Pemrograman Dasar", examType: { name: "UH" } },
    { id: "ex-2", title: "Desain Grafis", examType: { name: "UTS" } },
  ] as ExportExcelProps["exams"];

  const mockAttemptsMap: Record<string, number> = {
    "std-1_ex-1": 85,
    "std-1_ex-2": 90,
    "std-2_ex-1": 70,
    // Budi tidak ikut ujian ex-2
  };

  const defaultProps: ExportExcelProps = {
    students: mockStudents,
    exams: mockExams,
    attemptsMap: mockAttemptsMap,
    subjectName: "Informatika",
    className: "XII RPL 1",
    academicYear: "2025/2026",
  };

  // 🔥 PERBAIKAN: Gunakan tipe Mock eksplisit dari vitest

  beforeEach(() => {
    vi.clearAllMocks();

    writeXlsxFileMock.mockReset();
    writeXlsxFileMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => render(<ExportNilaiExcel {...defaultProps} />);

  test("Merender tombol unduh Excel yang aktif", () => {
    const { getByRole } = renderComponent();
    const btn = getByRole("button", { name: /export excel/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  test("Membuat file memakai library bawaan aplikasi (tanpa internet) dan toast sukses", async () => {
    const { getByRole } = renderComponent();
    await act(async () => {
      fireEvent.click(getByRole("button", { name: /export excel/i }));
    });

    await waitFor(() => {
      expect(writeXlsxFileMock).toHaveBeenCalled();
      const rows = writeXlsxFileMock.mock.calls[0][0];
      expect(rows[0][0].value).toBe("REKAP NILAI: INFORMATIKA");
      expect(rows[1][0].value).toBe("Kelas: XII RPL 1 | Tahun Ajaran: 2025/2026");
      // Baris data Ruspian: 2 nilai -> rata-rata 87.5
      const ruspian = rows[4];
      expect(ruspian[ruspian.length - 1].value).toBe(87.5);
      expect(toast.success).toHaveBeenCalledWith("File Excel berhasil diunduh!", {
        id: "toast-id-999",
      });
    });
    expect(document.head.querySelector("script")).toBeNull();
  });

  test("Toast error bila pembuatan file gagal", async () => {
    writeXlsxFileMock.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { getByRole } = renderComponent();
    await act(async () => {
      fireEvent.click(getByRole("button", { name: /export excel/i }));
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal membuat file Excel. Coba lagi.",
        { id: "toast-id-999" },
      );
    });
  });

  test("Tombol terkunci selama proses berlangsung", async () => {
    let resolvePromise!: (value: boolean) => void;
    writeXlsxFileMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    const { getByRole, findByText } = renderComponent();
    fireEvent.click(getByRole("button", { name: /export excel/i }));
    const loading = await findByText(/memproses.../i);
    expect(loading.closest("button")).toBeDisabled();
    await act(async () => {
      resolvePromise(true);
    });
  });
});
