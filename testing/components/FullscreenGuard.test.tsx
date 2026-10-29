import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import FullscreenGuard, {
  FULLSCREEN_VIOLATION,
} from "@/components/layout/FullscreenGuard";

// jsdom tidak punya Fullscreen API: kita tiru
let fsElement: Element | null = null;
const setFullscreen = (on: boolean, fire = true) => {
  fsElement = on ? document.documentElement : null;
  if (fire) document.dispatchEvent(new Event("fullscreenchange"));
};

describe("FullscreenGuard - kunci layar penuh ujian", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fsElement = null;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fsElement,
    });
    document.documentElement.requestFullscreen = vi.fn(async () => {
      setFullscreen(true);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = () => {
    const onViolation = vi.fn();
    const utils = render(
      <FullscreenGuard onViolation={onViolation}>
        <p>Isi soal ujian</p>
      </FullscreenGuard>,
    );
    const content = () =>
      utils.container.querySelector<HTMLElement>("[data-fullscreen-content]");
    const enter = async () => {
      await act(async () => {
        fireEvent.click(utils.getByRole("button", { name: /Masuk Layar Penuh/i }));
      });
    };
    return { ...utils, onViolation, content, enter };
  };

  test("Sebelum masuk layar penuh, soal belum tampil dan belum ada pelanggaran", () => {
    const { queryByText, getByText, onViolation } = setup();
    expect(getByText("Siap Ujian?")).toBeInTheDocument();
    expect(queryByText("Isi soal ujian")).not.toBeInTheDocument();
    expect(onViolation).not.toHaveBeenCalled();
  });

  test("Setelah masuk layar penuh, soal tampil", async () => {
    const { content, enter, getByText } = setup();
    await enter();
    expect(getByText("Isi soal ujian")).toBeInTheDocument();
    expect(content()?.style.display).toBe("block");
  });

  test("Keluar layar penuh: soal disembunyikan tapi TIDAK dibongkar, dan pelanggaran dicatat sekali", async () => {
    const { content, enter, getByText, onViolation } = setup();
    await enter();

    await act(async () => {
      setFullscreen(false);
    });

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation).toHaveBeenCalledWith(FULLSCREEN_VIOLATION);
    // tetap terpasang di DOM (timer & sinkronisasi tetap hidup), tetapi tak terlihat
    expect(getByText("Isi soal ujian")).toBeInTheDocument();
    expect(content()?.style.display).toBe("none");
    expect(getByText("Anda Keluar Dari Layar Penuh")).toBeInTheDocument();
  });

  test("Event terlewat: polling tiap detik tetap mendeteksi keluar layar penuh", async () => {
    const { enter, onViolation, content } = setup();
    await enter();

    fsElement = null; // keluar TANPA event fullscreenchange
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(content()?.style.display).toBe("none");
  });

  test("Tidak menghitung ganda: event + polling untuk satu kali keluar = 1 pelanggaran", async () => {
    const { enter, onViolation } = setup();
    await enter();

    await act(async () => {
      setFullscreen(false);
      vi.advanceTimersByTime(3000);
    });

    expect(onViolation).toHaveBeenCalledTimes(1);
  });

  test("Kembali ke layar penuh menampilkan soal lagi; keluar kedua dihitung pelanggaran kedua", async () => {
    const { enter, onViolation, content, getByRole } = setup();
    await enter();

    await act(async () => {
      setFullscreen(false);
    });
    await act(async () => {
      fireEvent.click(getByRole("button", { name: /Kembali ke Ujian/i }));
    });
    expect(content()?.style.display).toBe("block");

    await act(async () => {
      setFullscreen(false);
    });
    expect(onViolation).toHaveBeenCalledTimes(2);
  });

  test("Perangkat tanpa Fullscreen API: ditolak dengan pesan jelas, ujian tidak dimulai", async () => {
    // @ts-expect-error simulasi iPhone Safari
    document.documentElement.requestFullscreen = undefined;
    const { enter, queryByText, getByRole } = setup();
    await enter();

    expect(getByRole("alert").textContent).toContain("tidak mendukung");
    expect(queryByText("Isi soal ujian")).not.toBeInTheDocument();
  });
});
