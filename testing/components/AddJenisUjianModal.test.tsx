import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import AddJenisUjianModal from "@/components/layout/AddJenisUjianModal"; // Sesuaikan path komponen lu, coy
import { createExamType } from "@/actions/exam-type";
import { toast } from "sonner";

//  MOCKING DEPENDENSI SERVER ACTION & TOAST

vi.mock("@/actions/exam-type", () => ({
  createExamType: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - AddJenisUjianModal (Form Action Mode)", () => {
  let setIsModalOpenMock: Mock<(open: boolean) => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalOpenMock = vi.fn();
  });

  //  RENDERING KOMPONEN UTUH

  test("Harus sukses merender seluruh form input dan judul modal jenis ujian", () => {
    const { getByText, container } = render(
      <AddJenisUjianModal setIsModalOpen={setIsModalOpenMock} />,
    );

    expect(getByText("Tambah Jenis Ujian")).toBeInTheDocument();

    // Gunakan querySelector agar terhindar dari error strict A11y RTL
    const inputCode = container.querySelector('input[name="code"]');
    const inputName = container.querySelector('input[name="name"]');

    expect(inputCode).toBeInTheDocument();
    expect(inputName).toBeInTheDocument();
    expect(
      getByText("Maksimal 10 karakter (otomatis kapital)."),
    ).toBeInTheDocument();
  });

  //  AKSI BATAL DAN PENUTUPAN MODAL

  test("Harus sukses menutup modal ketika tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = render(
      <AddJenisUjianModal setIsModalOpen={setIsModalOpenMock} />,
    );

    // Klik tombol Batal
    const tombolBatal = getByRole("button", { name: /batal/i });
    fireEvent.click(tombolBatal);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);

    // Klik tombol silang X
    const tombolX = getAllByRole("button")[0];
    if (!tombolX) throw new Error("Tombol X tidak ditemukan di DOM");
    fireEvent.click(tombolX);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
  });

  // SUCCESS FLOW & SUBMIT BERHASIL

  test("Harus sukses mengeksekusi form action, memanggil server action, menampilkan toast sukses, dan menutup modal", async () => {
    // Biarkan action langsung me-resolve nilai untuk mensimulasikan happy path
    vi.mocked(createExamType).mockResolvedValue({
      success: true,
      message: "Jenis Ujian berhasil ditambahkan!",
    });

    const { getByRole, container } = render(
      <AddJenisUjianModal setIsModalOpen={setIsModalOpenMock} />,
    );

    const inputCode = container.querySelector('input[name="code"]');
    const inputName = container.querySelector('input[name="name"]');
    const tombolSimpan = getByRole("button", { name: /simpan data/i });

    if (!inputCode || !inputName)
      throw new Error("Input elemen tidak ditemukan di DOM");

    // 1. Simulasikan pengetikan data oleh pengguna
    fireEvent.change(inputCode, { target: { value: "PAS" } });
    fireEvent.change(inputName, {
      target: { value: "Penilaian Akhir Semester" },
    });

    // 2. Picu event submit menggunakan click event + act() agar Next.js form action terdeteksi mulus
    await act(async () => {
      fireEvent.click(tombolSimpan);
    });

    // 3. Pastikan eksekusi pasca-submit berjalan lancar tanpa nyangkut
    await waitFor(() => {
      expect(createExamType).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Jenis Ujian berhasil ditambahkan!",
      );
      expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
    });
  });

  // ERROR HANDLING SERVER ACTION

  test("Harus sukses menampilkan pesan error dari server jika data sudah ada", async () => {
    vi.mocked(createExamType).mockResolvedValue({
      success: false,
      message: "Kode ujian ini sudah terdaftar!",
    });

    const { getByRole, container } = render(
      <AddJenisUjianModal setIsModalOpen={setIsModalOpenMock} />,
    );

    const inputCode = container.querySelector('input[name="code"]');
    const inputName = container.querySelector('input[name="name"]');
    const tombolSimpan = getByRole("button", { name: /simpan data/i });

    if (!inputCode || !inputName)
      throw new Error("Input elemen tidak ditemukan di DOM");

    // 1. Simulasikan pengisian data
    fireEvent.change(inputCode, { target: { value: "PAS" } });
    fireEvent.change(inputName, { target: { value: "Ujian Akhir" } });

    // 2. Picu interaksi submit
    await act(async () => {
      fireEvent.click(tombolSimpan);
    });

    // 3. Tegaskan toast error dipanggil dan modal menolak untuk ditutup
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Kode ujian ini sudah terdaftar!",
      );
      expect(setIsModalOpenMock).not.toHaveBeenCalled();
    });
  });
});
