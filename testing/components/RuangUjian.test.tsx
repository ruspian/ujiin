import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import RuangUjian from "@/components/layout/RuangUjian";
import {
  autoSaveJawaban,
  submitUjianSiswa,
  cekStatusAttempt,
  catatPelanggaran,
} from "@/actions/ruang-ujian";
import { toast } from "sonner";
import { RuangUjianProps } from "@/types/ruang-ujian";

// 1. MOCKING DEPENDENSI

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-123"),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/actions/ruang-ujian", () => ({
  autoSaveJawaban: vi.fn(),
  submitUjianSiswa: vi.fn(),
  catatPelanggaran: vi.fn(),
  cekStatusAttempt: vi
    .fn()
    .mockResolvedValue({ success: true, status: "IN_PROGRESS" }),
}));

vi.mock("@/components/layout/FullscreenGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("Pengujian Komponen Utama - Ruang Ujian", () => {
  // Ubah opsi jawaban agar tidak bentrok dengan teks navigasi "nomor soal"
  const mockProps: RuangUjianProps = {
    attemptId: "att-123",
    examName: "Ujian Akhir Semester",
    subjectName: "Matematika Lanjut",
    questions: [
      {
        id: "q1",
        text: "Berapa hasil dari 1 + 1?",
        type: "MULTIPLE_CHOICE",
        score: 10,
        options: [
          { id: "opt-A", text: "Dua" }, // Ubah "2" menjadi "Dua"
          { id: "opt-B", text: "Tiga" }, // Ubah "3" menjadi "Tiga"
        ],
      },
      {
        id: "q2",
        text: "Jelaskan Teori Pythagoras!",
        type: "ESSAY",
        score: 20,
        options: [],
      },
    ] as unknown as RuangUjianProps["questions"],
    endTime: new Date(Date.now() + 3600000),
    serverTime: new Date(),
    initialAnswers: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // SKENARIO 1: RENDERING AWAL & INFORMASI

  test("Harus sukses merender informasi mapel, ujian, dan soal pertama", async () => {
    const { getByText } = render(<RuangUjian {...mockProps} />);

    await waitFor(() => {
      expect(cekStatusAttempt).toHaveBeenCalledWith("att-123");
    });

    expect(getByText("Matematika Lanjut")).toBeInTheDocument();
    expect(getByText(/Ujian Akhir Semester/i)).toBeInTheDocument();

    expect(getByText("Berapa hasil dari 1 + 1?")).toBeInTheDocument();
    expect(getByText("Dua")).toBeInTheDocument(); // Sesuaikan ekspektasi
    expect(getByText("Tiga")).toBeInTheDocument(); // Sesuaikan ekspektasi
  });

  // SKENARIO 2: AUTO-SAVE JAWABAN

  test("Harus memanggil fungsi autoSaveJawaban saat siswa memilih opsi", async () => {
    const { getByText } = render(<RuangUjian {...mockProps} />);

    // Sesuaikan yang diklik
    const opsiA = getByText("Dua");

    await act(async () => {
      fireEvent.click(opsiA);
    });

    await waitFor(() => {
      expect(autoSaveJawaban).toHaveBeenCalledWith("att-123", {
        q1: "opt-A",
      });
    });
  });

  // SKENARIO 3: NAVIGASI ANTAR SOAL

  test("Harus bisa berpindah ke soal berikutnya dan sebelumnya", async () => {
    const { getByRole, getByText, queryByText } = render(
      <RuangUjian {...mockProps} />,
    );

    const btnPrev = getByRole("button", { name: /Soal Sebelumnya/i });
    expect(btnPrev).toBeDisabled();

    const btnNext = getByRole("button", { name: /Soal Berikutnya/i });

    await act(async () => {
      fireEvent.click(btnNext);
    });

    expect(getByText("Jelaskan Teori Pythagoras!")).toBeInTheDocument();
    expect(queryByText("Berapa hasil dari 1 + 1?")).not.toBeInTheDocument();
    expect(btnPrev).not.toBeDisabled();
  });

  // SKENARIO 4: PENGUMPULAN UJIAN (SUBMIT)

  test("Harus memunculkan modal konfirmasi dan berhasil mengumpulkan ujian", async () => {
    vi.mocked(submitUjianSiswa).mockResolvedValue({
      success: true,
      message: "Ujian berhasil diselesaikan!",
    });

    const { getByRole, getByText } = render(<RuangUjian {...mockProps} />);
    const btnSelesaiAtas = getByRole("button", { name: /Selesai Ujian/i });

    await act(async () => {
      fireEvent.click(btnSelesaiAtas);
    });

    expect(getByText("Kumpulkan Jawaban?")).toBeInTheDocument();

    const btnKonfirmasi = getByRole("button", { name: /Ya, Kumpulkan/i });

    await act(async () => {
      fireEvent.click(btnKonfirmasi);
    });

    await waitFor(() => {
      expect(submitUjianSiswa).toHaveBeenCalledWith("att-123", {});
      expect(toast.success).toHaveBeenCalledWith(
        "Ujian berhasil diselesaikan!",
        { id: "toast-123" },
      );
    });
  });

  // SKENARIO 5: ANTI-CHEAT (WINDOW BLUR)

  test("Harus mencatat pelanggaran jika siswa meninggalkan tab browser", async () => {
    vi.mocked(catatPelanggaran).mockResolvedValue({
      success: true,
      violationCount: 1,
      isKicked: false,
    });

    const { getByText } = render(<RuangUjian {...mockProps} />);

    await act(async () => {
      fireEvent.blur(window);
    });

    await waitFor(() => {
      expect(catatPelanggaran).toHaveBeenCalledWith(
        "att-123",
        "Meninggalkan tab browser",
      );
    });

    expect(getByText("Peringatan Kecurangan!")).toBeInTheDocument();
    expect(getByText("Meninggalkan tab browser")).toBeInTheDocument();
  });
});
