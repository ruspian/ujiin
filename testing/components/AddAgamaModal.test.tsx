import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import AddAgamaModal from "@/components/layout/AddAgamaModal";
import { createReligion } from "@/actions/religion";
import { toast } from "sonner";

//  MOCKING DEPENDENSI SERVER ACTION & TOAST

vi.mock("@/actions/religion", () => ({
  createReligion: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Pengujian Komponen UI - AddAgamaModal (Form Action Mode)", () => {
  let setIsModalOpenMock: Mock<(open: boolean) => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalOpenMock = vi.fn();
  });

  //  RENDERING KOMPONEN UTUH

  test("Harus sukses merender struktur form input dan judul modal agama", () => {
    const { getByText, getByPlaceholderText } = render(
      <AddAgamaModal setIsModalOpen={setIsModalOpenMock} />,
    );

    expect(getByText("Tambah Agama")).toBeInTheDocument();
    expect(getByPlaceholderText("Contoh: Islam")).toBeInTheDocument();
    expect(getByText("Simpan Data")).toBeInTheDocument();
  });

  //  AKSI BATAL DAN PENUTUPAN MODAL

  test("Harus sukses menutup modal ketika tombol Batal atau tombol X diklik", () => {
    const { getByRole, getAllByRole } = render(
      <AddAgamaModal setIsModalOpen={setIsModalOpenMock} />,
    );

    const tombolBatal = getByRole("button", { name: /batal/i });
    fireEvent.click(tombolBatal);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);

    const tombolX = getAllByRole("button")[0];
    if (!tombolX) throw new Error("Tombol X tidak ditemukan di DOM");
    fireEvent.click(tombolX);
    expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
  });

  //  LOADING STATE & SUBMIT BERHASIL

  test("Harus memicu internal loading state, memanggil action, memunculkan toast sukses, dan menutup modal", async () => {
    // Biarkan Server Action langsung selesai untuk mensimulasikan happy path yang cepat
    vi.mocked(createReligion).mockResolvedValue({
      success: true,
      message: "Data agama berhasil ditambahkan!",
    });

    const { getByRole, getByPlaceholderText } = render(
      <AddAgamaModal setIsModalOpen={setIsModalOpenMock} />,
    );

    const inputNama = getByPlaceholderText("Contoh: Islam");
    const tombolSimpan = getByRole("button", { name: /simpan data/i });

    //  Simulasikan pengetikan data
    fireEvent.change(inputNama, { target: { value: "Kristen Protestan" } });

    //  Picu klik pada tombol submit (bukan submit form) dengan balutan act() agar React merespons state update
    await act(async () => {
      fireEvent.click(tombolSimpan);
    });

    //  Tunggu dan tegaskan bahwa seluruh aksi setelah loading state berjalan mulus
    await waitFor(() => {
      expect(createReligion).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Data agama berhasil ditambahkan!",
      );
      expect(setIsModalOpenMock).toHaveBeenCalledWith(false);
    });
  });

  //  ERROR HANDLING SERVER ACTION

  test("Harus sukses menampilkan pesan error jika server action gagal menyimpan data", async () => {
    vi.mocked(createReligion).mockResolvedValue({
      success: false,
      message: "Agama sudah terdaftar di sistem!",
    });

    const { getByRole, getByPlaceholderText } = render(
      <AddAgamaModal setIsModalOpen={setIsModalOpenMock} />,
    );

    const inputNama = getByPlaceholderText("Contoh: Islam");
    const tombolSimpan = getByRole("button", { name: /simpan data/i });

    //  Simulasikan pengetikan data yang bentrok
    fireEvent.change(inputNama, { target: { value: "Islam" } });

    //  Klik dengan asinkronus act()
    await act(async () => {
      fireEvent.click(tombolSimpan);
    });

    //  Pastikan toast error meledak dan modal tetap terbuka
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Agama sudah terdaftar di sistem!",
      );
      expect(setIsModalOpenMock).not.toHaveBeenCalled();
    });
  });
});
