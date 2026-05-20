import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import Agama from "@/components/layout/Agama";
import { ReligionData } from "@/types/religion";

// 1. MOCKING DEPENDENSI EKSTERNAL (NEXT.JS & DEBOUNCE)

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/master/agama",
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams, // Gunakan variabel dinamis agar bisa diubah
}));

vi.mock("use-debounce", () => ({
  useDebounce: (value: string) => [value],
}));

vi.mock("@/actions/religion", () => ({
  createReligion: vi.fn(),
  updateReligion: vi.fn(),
  deleteReligion: vi.fn(),
}));

describe("Pengujian Komponen Halaman - Data Master Agama", () => {
  const mockReligions: ReligionData[] = [
    { id: "rel-1", name: "Islam" },
    { id: "rel-2", name: "Kristen Protestan" },
  ];

  const defaultProps = {
    religions: mockReligions,
    totalCount: 2,
    totalPages: 1,
    currentPage: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams(); // Reset URL tiap test
  });

  // SKENARIO 1: RENDERING AWAL & KONDISI TABEL

  test("Harus sukses merender header, input pencarian, dan data tabel agama", () => {
    const { getByText, getByPlaceholderText } = render(
      <Agama {...defaultProps} />,
    );

    expect(getByText("Data Master")).toBeInTheDocument();
    expect(getByText("Kelola data inti sistem ujian.")).toBeInTheDocument();
    expect(getByPlaceholderText("Cari agama...")).toBeInTheDocument();
    expect(getByText("Islam")).toBeInTheDocument();
    expect(getByText("Kristen Protestan")).toBeInTheDocument();
  });

  test("Harus sukses merender status kosong jika data agama tidak ada", () => {
    const emptyProps = { ...defaultProps, religions: [], totalCount: 0 };
    const { getByText } = render(<Agama {...emptyProps} />);

    expect(getByText("Data Agama belum ada.")).toBeInTheDocument();
  });

  // SKENARIO 2: FITUR PENCARIAN (DEBOUNCE & ROUTER)

  test("Harus sukses memperbarui URL dengan query pencarian saat pengguna mengetik", async () => {
    const { getByPlaceholderText } = render(<Agama {...defaultProps} />);
    const inputPencarian = getByPlaceholderText("Cari agama...");

    fireEvent.change(inputPencarian, { target: { value: "Buddha" } });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/admin/master/agama?search=Buddha",
      );
    });
  });

  test("Harus sukses menghapus parameter pencarian dari URL jika input dikosongkan", async () => {
    const { getByPlaceholderText } = render(<Agama {...defaultProps} />);
    const inputPencarian = getByPlaceholderText("Cari agama...");

    fireEvent.change(inputPencarian, { target: { value: "Hindu" } });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin/master/agama?search=Hindu");
    });

    // Update state mock URL seakan-akan browser sudah ganti URL
    mockSearchParams = new URLSearchParams("?search=Hindu");

    fireEvent.change(inputPencarian, { target: { value: "" } });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin/master/agama?");
    });
  });

  // SKENARIO 3: INTERAKSI MODAL DINAMIS

  test("Harus sukses membuka modal Tambah Data saat tombol diklik", async () => {
    const { getByRole, findByText } = render(<Agama {...defaultProps} />);
    const tombolTambah = getByRole("button", { name: /tambah data/i });

    act(() => {
      fireEvent.click(tombolTambah);
    });

    // Gunakan findByText (async) untuk mencari modal yang dirender
    expect(await findByText("Simpan Data")).toBeInTheDocument();
  });

  test("Harus sukses membuka modal Edit dengan data item yang tepat", async () => {
    const { container, findByText } = render(<Agama {...defaultProps} />);

    const tombolEdit = container.querySelectorAll(
      "tbody tr:first-child button",
    )[0];
    if (!tombolEdit) throw new Error("Tombol Edit tidak ditemukan");

    act(() => {
      fireEvent.click(tombolEdit);
    });

    expect(await findByText("Edit Agama")).toBeInTheDocument();
  });

  test("Harus sukses membuka modal Hapus dengan peringatan penghapusan", async () => {
    const { container, findByText } = render(<Agama {...defaultProps} />);

    const tombolHapus = container.querySelectorAll(
      "tbody tr:first-child button",
    )[1];
    if (!tombolHapus) throw new Error("Tombol Hapus tidak ditemukan");

    act(() => {
      fireEvent.click(tombolHapus);
    });

    //  Gunakan findByText (menunggu render modal) & regex yang lebih longgar (/yakin/i)
    expect(await findByText(/yakin/i)).toBeInTheDocument();
  });
});
