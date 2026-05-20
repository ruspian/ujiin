import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import AutoRefresh from "@/components/layout/AutoRefresh"; // Sesuaikan path komponen lu, bos

// 1. MOCKING DEPENDENSI NEXT.JS ROUTER

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

describe("Pengujian Komponen Logika - AutoRefresh (Fake Timers Mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Nyalakan mesin waktu Vitest sebelum tiap tes dimulai
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Kembalikan waktu ke normal setelah tes selesai agar tidak merusak tes lain
    vi.useRealTimers();
  });

  // SKENARIO 1: INTERVAL DEFAULT (5000ms)

  test("Harus mengeksekusi router.refresh secara berkala sesuai interval default (5 detik)", () => {
    render(<AutoRefresh />);

    // Di awal render (detik ke-0), refresh belum boleh terpanggil
    expect(mockRefresh).not.toHaveBeenCalled();

    // Percepat waktu tepat 5000ms
    vi.advanceTimersByTime(5000);
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Percepat waktu 5000ms lagi (total 10 detik)
    vi.advanceTimersByTime(5000);
    expect(mockRefresh).toHaveBeenCalledTimes(2);
  });

  // SKENARIO 2: INTERVAL KUSTOM

  test("Harus mengeksekusi router.refresh sesuai prop interval yang dikustomisasi", () => {
    // Kita set interval jadi 2 detik (2000ms)
    render(<AutoRefresh interval={2000} />);

    // Majukan 1999ms, harusnya belum terpanggil
    vi.advanceTimersByTime(1999);
    expect(mockRefresh).not.toHaveBeenCalled();

    // Tambah 1ms lagi (genap 2000ms)
    vi.advanceTimersByTime(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Tambah 4000ms (genap 6000ms total, harusnya terpanggil 3x)
    vi.advanceTimersByTime(4000);
    expect(mockRefresh).toHaveBeenCalledTimes(3);
  });

  // SKENARIO 3: PENCEGAHAN MEMORY LEAK (UNMOUNT)

  test("Harus menghapus interval (clearInterval) ketika komponen di-unmount dari DOM", () => {
    const { unmount } = render(<AutoRefresh interval={3000} />);

    // Majukan 3000ms pertama untuk memastikan interval berjalan normal
    vi.advanceTimersByTime(3000);
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Cabut paksa komponen dari DOM
    unmount();

    // Majukan waktu 3000ms lagi. Karena sudah di-unmount, fungsi harusnya tidak jalan lagi!
    vi.advanceTimersByTime(3000);
    expect(mockRefresh).toHaveBeenCalledTimes(1); // Tetap 1x, tidak bertambah jadi 2
  });
});
