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
import { ExportExcelProps, CustomWindow } from "@/types/rekap-nilai";

// ==========================================
// 1. MOCKING DEPENDENSI
// ==========================================
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
  let writeXlsxFileMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Inisialisasi mock function untuk writeXlsxFile
    writeXlsxFileMock = vi.fn().mockResolvedValue(true);

    // Bersihkan objek window custom sebelum tiap test
    const customWindow = window as unknown as CustomWindow;
    delete customWindow.writeXlsxFile;

    // Bersihkan script tag yang mungkin tertinggal di DOM
    document.head.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => render(<ExportNilaiExcel {...defaultProps} />);

  // ==========================================
  // SKENARIO 1: RENDERING AWAL
  // ==========================================
  test("Harus sukses merender tombol unduh Excel dengan teks dan kondisi aktif", () => {
    const { getByRole, getByText } = renderComponent();

    const btnExport = getByRole("button", { name: /export excel/i });
    expect(btnExport).toBeInTheDocument();
    expect(btnExport).not.toBeDisabled();
    expect(getByText("Export Excel")).toBeInTheDocument();
  });

  // ==========================================
  // SKENARIO 2: SUCCESS FLOW (LIBRARY SUDAH ADA DI WINDOW)
  // ==========================================
  test("Harus mengeksekusi library Excel secara langsung dan memunculkan toast sukses jika library sudah ter-load di window", async () => {
    const customWindow = window as unknown as CustomWindow;
    customWindow.writeXlsxFile =
      writeXlsxFileMock as unknown as CustomWindow["writeXlsxFile"];

    const { getByRole } = renderComponent();

    await act(async () => {
      fireEvent.click(getByRole("button", { name: /export excel/i }));
    });

    await waitFor(() => {
      expect(writeXlsxFileMock).toHaveBeenCalled();

      // Verifikasi argumen pertama yang dikirim ke fungsi eksekusi (Baris Judul)
      const callArgs = writeXlsxFileMock.mock.calls[0][0];
      expect(callArgs[0][0].value).toBe("REKAP NILAI: INFORMATIKA");
      expect(callArgs[1][0].value).toBe(
        "Kelas: XII RPL 1 | Tahun Ajaran: 2025/2026",
      );

      expect(toast.success).toHaveBeenCalledWith(
        "File Excel berhasil diunduh!",
        { id: "toast-id-999" },
      );
    });
  });

  // ==========================================
  // SKENARIO 3: SUCCESS FLOW (INJEKSI SCRIPT DINAMIS)
  // ==========================================
  test("Harus menginjeksi tag script ke document.head, menunggunya dimuat, mengeksekusi, dan sukses jika library belum ada", async () => {
    const { getByRole } = renderComponent();

    const customWindow = window as unknown as CustomWindow;
    expect(customWindow.writeXlsxFile).toBeUndefined();

    const appendChildSpy = vi
      .spyOn(document.head, "appendChild")
      .mockImplementation(<T extends Node>(node: T): T => {
        const scriptElement = node as unknown as HTMLScriptElement;

        setTimeout(() => {
          customWindow.writeXlsxFile =
            writeXlsxFileMock as unknown as CustomWindow["writeXlsxFile"];
          scriptElement.dispatchEvent(new Event("load"));
        }, 50);

        return node;
      });

    fireEvent.click(getByRole("button", { name: /export excel/i }));

    expect(appendChildSpy).toHaveBeenCalled();
    const appendedScript = appendChildSpy.mock.calls[0][0] as HTMLScriptElement;
    expect(appendedScript.src).toContain("write-excel-file.min.js");

    await waitFor(() => {
      expect(writeXlsxFileMock).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "File Excel berhasil diunduh!",
        { id: "toast-id-999" },
      );
    });
  });

  // ==========================================
  // SKENARIO 4: ERROR FLOW (GAGAL MEMUAT SCRIPT)
  // ==========================================
  test("Harus memunculkan toast error jika gagal memuat library script dari internet", async () => {
    const { getByRole } = renderComponent();

    vi.spyOn(document.head, "appendChild").mockImplementation(
      <T extends Node>(node: T): T => {
        const scriptElement = node as unknown as HTMLScriptElement;

        setTimeout(() => {
          scriptElement.dispatchEvent(new Event("error"));
        }, 50);

        return node;
      },
    );

    fireEvent.click(getByRole("button", { name: /export excel/i }));

    await waitFor(() => {
      expect(writeXlsxFileMock).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        "Gagal mengunduh file Excel. Pastikan koneksi internet stabil.",
        { id: "toast-id-999" },
      );
    });
  });

  // ==========================================
  // SKENARIO 5: LOCAL LOADING STATE
  // ==========================================
  test("Harus mengunci tombol dan mengubah teks menjadi 'Memproses...' selama unduhan asinkronus berlangsung", async () => {
    let resolvePromise!: (value: boolean) => void;
    writeXlsxFileMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const customWindow = window as unknown as CustomWindow;
    customWindow.writeXlsxFile =
      writeXlsxFileMock as unknown as CustomWindow["writeXlsxFile"];

    const { getByRole, findByText } = renderComponent();

    fireEvent.click(getByRole("button", { name: /export excel/i }));

    const tombolLoading = await findByText(/memproses.../i);
    expect(tombolLoading).toBeInTheDocument();

    const tombolInduk = tombolLoading.closest("button");
    expect(tombolInduk).toBeDisabled();

    await act(async () => {
      resolvePromise(true);
    });
  });
});
