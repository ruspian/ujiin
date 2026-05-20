import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import AdminDashboard from "@/components/layout/AdminDashboard";

describe("Pengujian Komponen UI - AdminDashboard (Static UI Mode)", () => {
  // SKENARIO 1: RENDERING KARTU STATISTIK

  test("Harus sukses merender seluruh kartu statistik dengan angka yang tepat", () => {
    const { getByText } = render(<AdminDashboard />);

    // Verifikasi Kartu Guru
    expect(getByText("Total Guru")).toBeInTheDocument();
    expect(getByText("45")).toBeInTheDocument();

    // Verifikasi Kartu Siswa
    expect(getByText("Total Siswa")).toBeInTheDocument();
    expect(getByText("1,204")).toBeInTheDocument();

    // Verifikasi Kartu Kelas
    expect(getByText("Total Kelas")).toBeInTheDocument();
    expect(getByText("36")).toBeInTheDocument();

    // Verifikasi Kartu Mata Pelajaran
    expect(getByText("Mata Pelajaran")).toBeInTheDocument();
    expect(getByText("18")).toBeInTheDocument();
  });

  // SKENARIO 2: RENDERING AKTIVITAS TERKINI

  test("Harus sukses merender bagian Aktivitas Terkini dengan status kosong", () => {
    const { getByText } = render(<AdminDashboard />);

    // Verifikasi Header Aktivitas
    expect(getByText("Aktivitas Terkini")).toBeInTheDocument();

    // Verifikasi Teks Placeholder
    expect(getByText("Belum ada aktivitas yang tercatat.")).toBeInTheDocument();
  });
});
