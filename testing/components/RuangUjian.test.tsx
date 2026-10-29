import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import RuangUjian from "@/components/layout/RuangUjian";
import { toast } from "sonner";
import { RuangUjianProps } from "@/types/ruang-ujian";
import { useExamStore } from "@/store/useExamStore";

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

// Ruang ujian berkomunikasi lewat fetch ke /api/ujian/sync (examCall), bukan
// server action langsung, supaya satu request macet tidak memblokir yang lain.
const examCall = vi.hoisted(() => vi.fn());
vi.mock("@/lib/exam-api", () => ({
  examCall,
  UnauthorizedError: class UnauthorizedError extends Error {},
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
    // store jawaban dipersist ke localStorage -> bersihkan agar antar tes tidak bocor
    localStorage.clear();
    useExamStore.setState({ attemptId: null, answers: {} });
    examCall.mockImplementation(async (op: { type: string }) => {
      switch (op.type) {
        case "heartbeat":
          return {
            success: true,
            status: "ONGOING",
            remainingSeconds: 3000,
            serverTime: new Date().toISOString(),
          };
        case "violation":
          return { success: true, violationCount: 1, isKicked: false };
        case "status":
          return { success: true, status: "ONGOING" };
        default:
          return { success: true };
      }
    });
  });

  // SKENARIO 1: RENDERING AWAL & INFORMASI

  test("Harus sukses merender informasi mapel, ujian, dan soal pertama", async () => {
    const { getByText } = render(<RuangUjian {...mockProps} />);

    await waitFor(() => {
      expect(examCall).toHaveBeenCalledWith(
        { type: "status", attemptId: "att-123" },
        expect.anything(),
      );
    });

    expect(getByText("Matematika Lanjut")).toBeInTheDocument();
    expect(getByText(/Ujian Akhir Semester/i)).toBeInTheDocument();

    expect(getByText("Berapa hasil dari 1 + 1?")).toBeInTheDocument();
    expect(getByText("Dua")).toBeInTheDocument(); // Sesuaikan ekspektasi
    expect(getByText("Tiga")).toBeInTheDocument(); // Sesuaikan ekspektasi
  });

  // SKENARIO 2: AUTO-SAVE JAWABAN

  test("Harus menyimpan jawaban ke server (operasi save) saat siswa memilih opsi", async () => {
    const { findByText } = render(<RuangUjian {...mockProps} />);

    // Sesuaikan yang diklik
    const opsiA = await findByText("Dua");

    await act(async () => {
      fireEvent.click(opsiA);
    });

    await waitFor(() => {
      expect(examCall).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "save",
          attemptId: "att-123",
          answers: { q1: "opt-A" },
        }),
      );
    });
  });

  // SKENARIO 3: NAVIGASI ANTAR SOAL

  test("Harus bisa berpindah ke soal berikutnya dan sebelumnya", async () => {
    const { getByRole, getByText, queryByText, findByRole } = render(
      <RuangUjian {...mockProps} />,
    );

    const btnPrev = await findByRole("button", { name: /Soal Sebelumnya/i });
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
    const { getByRole, getByText, findAllByRole } = render(
      <RuangUjian {...mockProps} />,
    );
    // ada 2 tombol "Selesai Ujian" (header & footer soal terakhir); ambil yang di header
    const btnSelesaiAtas = (
      await findAllByRole("button", { name: /Selesai Ujian/i })
    )[0];

    await act(async () => {
      fireEvent.click(btnSelesaiAtas);
    });

    expect(getByText("Kumpulkan Jawaban?")).toBeInTheDocument();

    const btnKonfirmasi = getByRole("button", { name: /Ya, Kumpulkan/i });

    await act(async () => {
      fireEvent.click(btnKonfirmasi);
    });

    await waitFor(() => {
      expect(examCall).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "submit",
          attemptId: "att-123",
          answers: {},
        }),
        expect.anything(),
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Ujian berhasil dikumpulkan!",
      );
    });
  });

  // SKENARIO 5: ANTI-CHEAT (WINDOW BLUR)

  test("Harus mencatat pelanggaran jika siswa meninggalkan tab browser", async () => {
    const { getByText, findByText } = render(<RuangUjian {...mockProps} />);
    await findByText("Dua"); // tunggu inisialisasi penyimpanan lokal selesai

    await act(async () => {
      fireEvent.blur(window);
    });

    await waitFor(() => {
      expect(examCall).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "violation",
          attemptId: "att-123",
          jenis: "Meninggalkan tab browser",
          sumber: "web",
        }),
      );
    });

    expect(getByText("Peringatan Kecurangan!")).toBeInTheDocument();
    expect(getByText("Meninggalkan tab browser")).toBeInTheDocument();
  });
});
