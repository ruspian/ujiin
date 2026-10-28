/** True bila halaman berjalan di dalam aplikasi Android Ujiin (APK). */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.UjiinNative?.isNativeApp?.() === true ||
      /UjiinApp\//.test(navigator.userAgent)
    );
  } catch {
    return false;
  }
}
