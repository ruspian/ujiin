import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractImageUrls,
  preloadImages,
  _resetPreloadState,
} from "@/lib/preload-images";

describe("extractImageUrls", () => {
  test("mengambil gambar dari HTML soal, opsi, dan pasangan, berurutan & unik", () => {
    const q = {
      content: '<p>Lihat</p><img src="https://x.id/a.png" class="c">',
      options: [
        { text: "<img class='z' src='https://x.id/b.png'>" },
        { text: '<img src="https://x.id/a.png">' },
      ],
      pairs: [{ left: '<img src="/uploads/c.jpg">' }],
    };
    expect(extractImageUrls(q)).toEqual([
      "https://x.id/a.png",
      "https://x.id/b.png",
      "/uploads/c.jpg",
    ]);
  });

  test("melewati data: dan blob:, dan aman untuk data tanpa gambar", () => {
    expect(
      extractImageUrls('<img src="data:image/png;base64,AAA"><img src="blob:x">'),
    ).toEqual([]);
    expect(extractImageUrls({ a: 1 })).toEqual([]);
    expect(extractImageUrls(null)).toEqual([]);
  });
});

describe("preloadImages", () => {
  const created: { src: string; onload?: () => void; onerror?: () => void }[] = [];

  beforeEach(() => {
    _resetPreloadState();
    created.length = 0;
    vi.stubGlobal(
      "Image",
      class {
        onload?: () => void;
        onerror?: () => void;
        decoding = "";
        _src = "";
        constructor() {
          created.push(this as never);
        }
        set src(v: string) {
          this._src = v;
        }
        get src() {
          return this._src;
        }
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  test("membatasi unduhan paralel lalu melanjutkan antrean", async () => {
    preloadImages(["/1", "/2", "/3", "/4", "/5"], 2);
    expect(created).toHaveLength(2);
    created[0].onload?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(created).toHaveLength(3);
  });

  test("gambar yang sudah dimuat tidak diunduh lagi", async () => {
    preloadImages(["/1"], 1);
    created[0].onload?.();
    await Promise.resolve();
    preloadImages(["/1"], 1);
    expect(created).toHaveLength(1);
  });

  test("pembatalan menghentikan antrean", async () => {
    const cancel = preloadImages(["/1", "/2", "/3"], 1);
    cancel();
    created[0].onload?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(created).toHaveLength(1);
  });
});
