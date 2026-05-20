import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import CetakKartuModal from "@/components/layout/CetakKartuModal";

// 1. MOCKING DEPENDENSI NEXT.JS ROUTER

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("Pengujian Komponen UI - CetakKartuModal", () => {
  let setIsModalCetakOpenMock: Mock<(val: boolean) => void>;

  const mockClasses = [
    { id: "cls-1", name: "10 RPL 1" },
    { id: "cls-2", name: "10 TKJ 1" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    setIsModalCetakOpenMock = vi.fn();
  });

  // SKENARIO 1: RENDERING AWAL & KONDISI TOMBOL

  test("Harus sukses merender struktur modal dan memastikan tombol cetak terkunci secara default", () => {
    const { getByText, getByRole, getAllByText } = render(
      <CetakKartuModal
        classes={mockClasses}
        setIsModalCetakOpen={setIsModalCetakOpenMock}
      />,
    );

    // Verifikasi teks header
    expect(getByText("Cetak Kartu Ujian")).toBeInTheDocument();

    // 🔥 FIX: Gunakan getAllByText untuk menangani duplikasi "Pilih Kelas"
    // Ada dua: satu di <label> dan satu di <option>
    const pilihKelasElements = getAllByText("Pilih Kelas");
    expect(pilihKelasElements).toHaveLength(2);

    // Verifikasi data kelas
    expect(getByText("10 RPL 1")).toBeInTheDocument();
    expect(getByText("10 TKJ 1")).toBeInTheDocument();

    // Verifikasi tombol cetak terkunci
    const tombolCetak = getByRole("button", {
      name: /generate & cetak kartu/i,
    });
    expect(tombolCetak).toBeDisabled();
  });

  // SKENARIO 2: AKSI BATAL DAN PENUTUPAN MODAL

  test("Harus sukses menutup modal ketika tombol silang X diklik", () => {
    const { getAllByRole } = render(
      <CetakKartuModal
        classes={mockClasses}
        setIsModalCetakOpen={setIsModalCetakOpenMock}
      />,
    );

    // Klik tombol silang X (berada di index 0 karena dirender pertama di header)
    const tombolX = getAllByRole("button")[0];
    if (!tombolX) throw new Error("Tombol X tidak ditemukan di DOM");

    fireEvent.click(tombolX);
    expect(setIsModalCetakOpenMock).toHaveBeenCalledWith(false);
  });

  // SKENARIO 3: INTERAKSI DROPDOWN & REDIRECT CETAK

  test("Harus membuka kunci tombol setelah kelas dipilih dan mengarahkan router ke halaman cetak", () => {
    const { getByRole } = render(
      <CetakKartuModal
        classes={mockClasses}
        setIsModalCetakOpen={setIsModalCetakOpenMock}
      />,
    );

    const selectKelas = getByRole("combobox");
    const tombolCetak = getByRole("button", {
      name: /generate & cetak kartu/i,
    });

    // 1. Tombol harus disabled di awal
    expect(tombolCetak).toBeDisabled();

    // 2. Simulasikan pengguna memilih kelas "10 RPL 1"
    fireEvent.change(selectKelas, { target: { value: "cls-1" } });

    // 3. Tombol cetak harus terbuka kuncinya (enabled)
    expect(tombolCetak).not.toBeDisabled();

    // 4. Klik tombol cetak
    fireEvent.click(tombolCetak);

    // 5. Verifikasi bahwa Next.js router diarahkan ke URL ID kelas yang tepat
    expect(mockPush).toHaveBeenCalledWith("/cetak/cls-1");

    // 6. Verifikasi modal ditutup otomatis setelah proses dialihkan
    expect(setIsModalCetakOpenMock).toHaveBeenCalledWith(false);
  });
});
