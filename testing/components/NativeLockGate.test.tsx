import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import NativeLockGate from "@/components/layout/NativeLockGate";

const setNative = (status: object | null) => {
  window.UjiinNative = {
    isNativeApp: () => true,
    getVersion: () => "1",
    examReady: vi.fn(),
    drainViolations: () => "[]",
    saveFile: vi.fn(),
    retry: vi.fn(),
    lockStatus: () => JSON.stringify(status),
    openDndSettings: vi.fn(),
    requestPin: vi.fn(),
  } as never;
};

describe("NativeLockGate (aplikasi Android)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    delete window.UjiinNative;
  });

  test("izin Jangan Ganggu belum ada: minta izin, soal disembunyikan", () => {
    setNative({ active: true, dndGranted: false, dndBlocking: false, pinned: false });
    render(<NativeLockGate><p>SOAL</p></NativeLockGate>);

    expect(screen.getByText("Izinkan Blokir Notifikasi")).toBeTruthy();
    expect(document.querySelector("[data-lock-content]")).toHaveProperty("style.display", "none");
  });

  test("izin ada tapi layar belum terkunci: minta kunci layar", () => {
    setNative({ active: true, dndGranted: true, dndBlocking: true, pinned: false });
    render(<NativeLockGate><p>SOAL</p></NativeLockGate>);

    expect(screen.getByText("Aktifkan Kunci Layar", { selector: "h2" })).toBeTruthy();
  });

  test("keduanya aktif: soal tampil; kunci lepas di tengah ujian: soal tersembunyi lagi", () => {
    let pinned = true;
    window.UjiinNative = {
      lockStatus: () =>
        JSON.stringify({ active: true, dndGranted: true, dndBlocking: true, pinned }),
    } as never;
    render(<NativeLockGate><p>SOAL</p></NativeLockGate>);
    const content = () => document.querySelector("[data-lock-content]") as HTMLElement;
    expect(content().style.display).toBe("block");

    pinned = false;
    act(() => { vi.advanceTimersByTime(1100); });
    expect(content().style.display).toBe("none");
    expect(screen.getByText("Aktifkan Kunci Layar", { selector: "h2" })).toBeTruthy();
  });

  test("APK versi lama tanpa lockStatus: langsung tampil", () => {
    window.UjiinNative = { isNativeApp: () => true } as never;
    render(<NativeLockGate><p>SOAL</p></NativeLockGate>);

    expect((document.querySelector("[data-lock-content]") as HTMLElement).style.display).toBe("block");
  });
});
