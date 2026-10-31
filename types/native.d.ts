/**
 * Jembatan ke aplikasi Android Ujiin (WebView). Hanya ada di dalam APK;
 * di browser biasa `window.UjiinNative` bernilai undefined.
 */
export interface UjiinNativeBridge {
  isNativeApp(): boolean;
  getVersion(): string;
  /** Web memberi tahu native: halaman ujian siap menerima event pelanggaran. */
  examReady(): void;
  /** Ambil (dan kosongkan) pelanggaran native yang terjadi sebelum web siap. JSON array string. */
  drainViolations(): string;
  saveFile(filename: string, mime: string, base64: string): void;
  retry(): void;
  /** JSON string: { active, dndGranted, dndBlocking, pinned } */
  lockStatus?(): string;
  /** Buka layar izin Jangan Ganggu (hanya bisa sebelum layar dikunci). */
  openDndSettings?(): void;
  /** Minta kunci layar (screen pinning) lagi. */
  requestPin?(): void;
}

declare global {
  interface Window {
    UjiinNative?: UjiinNativeBridge;
  }
}
