/**
 * Pra-muat gambar soal.
 *
 * Gambar di soal/opsi diunduh di latar belakang begitu ruang ujian terbuka,
 * dimulai dari soal yang sedang dibuka dan terus ke soal berikutnya. Jadi saat
 * jaringan siswa jelek atau putus, gambar sudah ada di cache browser dan tidak
 * muncul sebagai kotak kosong.
 */

const IMG_SRC = /<img\b[^>]*?\bsrc=\\?["']([^"'\\\s>]+)\\?["']/gi;

/** Ambil semua URL gambar (http/https/relatif) dari data apa pun, berurutan & unik. */
export function extractImageUrls(data: unknown): string[] {
  let text: string;
  try {
    text = typeof data === "string" ? data : JSON.stringify(data);
  } catch {
    return [];
  }
  const found = new Set<string>();
  for (const m of (text ?? "").matchAll(IMG_SRC)) {
    const url = m[1];
    if (/^data:|^blob:/i.test(url)) continue; // sudah ada di dalam halaman
    found.add(url);
  }
  return [...found];
}

const loaded = new Set<string>();
// referensi disimpan agar objek Image tidak dibuang sebelum selesai diunduh
const inFlight = new Map<string, HTMLImageElement>();

function loadOne(url: string, attempt = 0): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    inFlight.set(url, img);
    img.onload = () => {
      loaded.add(url);
      inFlight.delete(url);
      resolve();
    };
    img.onerror = () => {
      inFlight.delete(url);
      if (attempt >= 3) return resolve(); // menyerah; browser akan coba lagi saat gambar tampil
      setTimeout(
        () => void loadOne(url, attempt + 1).then(resolve),
        2000 * 2 ** attempt,
      );
    };
    img.decoding = "async";
    img.src = url;
  });
}

/**
 * Unduh daftar URL dengan jumlah paralel terbatas (hemat kuota/jaringan lemah).
 * @returns fungsi pembatal
 */
export function preloadImages(urls: string[], concurrency = 3): () => void {
  let cancelled = false;
  const queue = urls.filter((u) => !loaded.has(u));
  let next = 0;

  const worker = async () => {
    while (!cancelled && next < queue.length) {
      await loadOne(queue[next++]);
    }
  };
  for (let i = 0; i < Math.min(concurrency, queue.length); i++) void worker();

  return () => {
    cancelled = true;
  };
}

/** Untuk tes. */
export function _resetPreloadState() {
  loaded.clear();
  inFlight.clear();
}
