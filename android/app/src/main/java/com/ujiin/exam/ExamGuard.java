package com.ujiin.exam;

import android.app.Activity;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Mengunci perangkat selama siswa berada di halaman ujian (/ujian/...) dan
 * melaporkan pelanggaran ke halaman web. Web yang mencatatnya ke server
 * (menghitung ke batas auto-kick) memakai sesi login siswa.
 *
 * Yang dilakukan:
 *  - FLAG_SECURE: screenshot & perekam layar menghasilkan layar hitam
 *  - Screen pinning (startLockTask): tombol Home/Recents diblokir
 *  - Mode immersive + layar selalu menyala
 *  - Deteksi: kehilangan fokus jendela (notifikasi/overlay), keluar aplikasi,
 *    split-screen, PiP, screenshot (Android 14+)
 */
final class ExamGuard {

    private static final long GRACE_MS = 4000;       // dialog screen pinning wajar mencuri fokus
    private static final long FOCUS_DEBOUNCE_MS = 450;
    private static final long DEDUPE_MS = 1500;

    private final Activity activity;
    private final WebView webView;
    private final Handler main = new Handler(Looper.getMainLooper());

    private final List<String> pending = new ArrayList<>();
    private boolean active = false;
    private boolean webReady = false;
    private boolean resumed = true;
    private long graceUntil = 0;
    private long pausedAt = 0;
    private String lastJenis = "";
    private long lastAt = 0;
    private Object screenCaptureCallback; // android.app.Activity.ScreenCaptureCallback (API 34)

    private final Runnable focusCheck = new Runnable() {
        @Override public void run() {
            if (active && resumed && !activity.hasWindowFocus()) {
                report("Aplikasi kehilangan fokus (notifikasi / jendela lain terbuka)");
            }
        }
    };

    ExamGuard(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    boolean isActive() {
        return active;
    }

    // ---------------------------------------------------------------- mode ujian

    /** @return false bila perangkat tidak memenuhi syarat (ujian tidak boleh dimulai). */
    boolean enter() {
        if (active) return true;

        String problem = DeviceChecks.blockingProblem(activity);
        if (problem != null) {
            android.widget.Toast.makeText(activity,
                    "Ujian diblokir: " + problem + ". Nonaktifkan lalu coba lagi.",
                    android.widget.Toast.LENGTH_LONG).show();
            return false;
        }

        synchronized (this) {
            pending.clear();
            webReady = false;
        }
        active = true;
        graceUntil = SystemClock.elapsedRealtime() + GRACE_MS;

        Window w = activity.getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_SECURE
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();

        try {
            activity.startLockTask();
        } catch (Exception ignored) {
            // beberapa perangkat menolak; deteksi fokus tetap berjalan
        }

        registerScreenCapture();

        if (activity.isInMultiWindowMode()) {
            report("Mode layar terbagi (split-screen) terdeteksi");
        }
        return true;
    }

    void exit() {
        if (!active) return;
        active = false;
        main.removeCallbacks(focusCheck);

        unregisterScreenCapture();
        try {
            activity.stopLockTask();
        } catch (Exception ignored) {
            // belum dalam mode pinning
        }

        Window w = activity.getWindow();
        w.clearFlags(WindowManager.LayoutParams.FLAG_SECURE
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);

        synchronized (this) {
            pending.clear();
            webReady = false;
        }
    }

    @SuppressWarnings("deprecation")
    void hideSystemBars() {
        activity.getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    // ----------------------------------------------------------------- lifecycle

    void onResume() {
        resumed = true;
        if (!active) return;
        hideSystemBars();
        if (pausedAt > 0) {
            long seconds = Math.max(1, (SystemClock.elapsedRealtime() - pausedAt) / 1000);
            pausedAt = 0;
            if (SystemClock.elapsedRealtime() > graceUntil) {
                report("Meninggalkan aplikasi ujian selama " + seconds + " detik");
            }
        }
        flush();
    }

    void onPause() {
        resumed = false;
        if (active) pausedAt = SystemClock.elapsedRealtime();
    }

    void onWindowFocusChanged(boolean hasFocus) {
        if (!active) return;
        main.removeCallbacks(focusCheck);
        if (hasFocus) {
            hideSystemBars();
        } else {
            // tunda sebentar: dialog sistem sesaat tidak dihitung
            main.postDelayed(focusCheck, FOCUS_DEBOUNCE_MS);
        }
    }

    void onMultiWindowModeChanged(boolean inMultiWindow) {
        if (active && inMultiWindow) {
            report("Mode layar terbagi (split-screen) terdeteksi");
        }
    }

    void onPictureInPictureModeChanged(boolean inPip) {
        if (active && inPip) {
            report("Mode jendela mengambang (PiP) terdeteksi");
        }
    }

    // --------------------------------------------------------------- screenshot

    private void registerScreenCapture() {
        if (Build.VERSION.SDK_INT < 34) return;
        try {
            android.app.Activity.ScreenCaptureCallback cb =
                    () -> report("Mencoba melakukan Screenshot");
            activity.registerScreenCaptureCallback(activity.getMainExecutor(), cb);
            screenCaptureCallback = cb;
        } catch (Throwable ignored) {
            // izin tidak diberikan / tidak didukung
        }
    }

    private void unregisterScreenCapture() {
        if (Build.VERSION.SDK_INT < 34 || screenCaptureCallback == null) return;
        try {
            activity.unregisterScreenCaptureCallback(
                    (android.app.Activity.ScreenCaptureCallback) screenCaptureCallback);
        } catch (Throwable ignored) {
            // abaikan
        }
        screenCaptureCallback = null;
    }

    // ------------------------------------------------------- pelaporan ke web

    void report(String jenis) {
        if (!active) return;
        long now = SystemClock.elapsedRealtime();
        if (now < graceUntil) return;
        if (jenis.equals(lastJenis) && now - lastAt < DEDUPE_MS) return;
        lastJenis = jenis;
        lastAt = now;

        synchronized (this) {
            pending.add(jenis);
        }
        flush();
    }

    /** Kirim antrean ke halaman web bila web sudah siap dan app di foreground. */
    private void flush() {
        main.post(new Runnable() {
            @Override public void run() {
                List<String> toSend;
                synchronized (ExamGuard.this) {
                    if (!webReady || !resumed || pending.isEmpty()) return;
                    toSend = new ArrayList<>(pending);
                    pending.clear();
                }
                for (String jenis : toSend) {
                    String js = "window.dispatchEvent(new CustomEvent('ujiin-native-violation',"
                            + "{detail:{jenis:" + JSONObject.quote(jenis) + "}}));";
                    webView.evaluateJavascript(js, null);
                }
            }
        });
    }

    /** Dipanggil dari web (thread JavaScript) saat halaman ujian siap. */
    synchronized void setWebReady(boolean ready) {
        webReady = ready;
    }

    /** Dipanggil dari web: ambil pelanggaran yang terjadi sebelum web siap. */
    synchronized String drain() {
        JSONArray arr = new JSONArray();
        for (String s : pending) arr.put(s);
        pending.clear();
        return arr.toString();
    }
}
