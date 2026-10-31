package com.ujiin.exam;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
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
 *  - Screen pinning (startLockTask): tombol Home/Recents diblokir. Status
 *    pinning dipantau tiap detik: bila siswa melepasnya (Back+Recents) langsung
 *    dicatat sebagai pelanggaran dan pinning dipasang ulang.
 *  - Bila aplikasi dijadikan Device Owner (KioskAdminReceiver): mode kiosk penuh,
 *    tanpa dialog dan tanpa jalan keluar bagi siswa
 *  - Notifikasi DIBLOKIR (mode Jangan Ganggu "Tidak ada gangguan") selama ujian,
 *    sehingga pesan WhatsApp/SMS dari teman tidak muncul. Pengaturan lama
 *    dikembalikan setelah ujian. Siswa wajib memberi izin Jangan Ganggu dulu.
 *  - Sentuhan saat ada jendela lain di atas aplikasi (overlay) diabaikan
 *  - Mode immersive + layar selalu menyala
 *  - Deteksi: kehilangan fokus jendela (notifikasi/overlay), keluar aplikasi,
 *    split-screen, PiP, screenshot (Android 14+)
 */
final class ExamGuard {

    private static final long GRACE_MS = 4000;       // dialog screen pinning wajar mencuri fokus
    private static final long FOCUS_DEBOUNCE_MS = 450;
    private static final long DEDUPE_MS = 1500;
    private static final long PIN_POLL_MS = 1000;
    private static final long PIN_RETRY_MS = 6000;
    private static final long PIN_NEVER_WARN_MS = 12000;

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
    private boolean everPinned = false;
    private boolean warnedNoPin = false;
    private long lastPinRequest = 0;
    private long enteredAt = 0;
    private boolean dndApplied = false;
    private boolean pinStarted = false;
    private static final String PREFS = "ujiin_guard";
    private static final String PREF_DND = "dnd_saved";
    private Object screenCaptureCallback; // android.app.Activity.ScreenCaptureCallback (API 34)

    private final Runnable focusCheck = new Runnable() {
        @Override public void run() {
            if (active && resumed && !activity.hasWindowFocus()) {
                report("Aplikasi kehilangan fokus (notifikasi / jendela lain terbuka)");
            }
        }
    };

    /** Memantau status screen pinning; dipasang ulang bila dilepas siswa. */
    private final Runnable pinCheck = new Runnable() {
        @Override public void run() {
            if (!active) return;
            if (resumed) {
                startLockIfReady();
                if (pinStarted) {
                    checkDnd();
                    checkPinned();
                }
            }
            main.postDelayed(this, PIN_POLL_MS);
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
        everPinned = false;
        warnedNoPin = false;
        enteredAt = SystemClock.elapsedRealtime();
        graceUntil = enteredAt + GRACE_MS;

        Window w = activity.getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_SECURE
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
        // Bar sistem yang muncul lagi (usap dari tepi layar) langsung disembunyikan
        activity.getWindow().getDecorView().setOnSystemUiVisibilityChangeListener(
                visibility -> { if (active) hideSystemBars(); });
        // Sentuhan saat ada jendela lain menutupi aplikasi diabaikan (anti tapjacking)
        webView.setFilterTouchesWhenObscured(true);

        pinStarted = false;
        startLockIfReady();
        main.removeCallbacks(pinCheck);
        main.postDelayed(pinCheck, PIN_POLL_MS);

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
        main.removeCallbacks(pinCheck);
        webView.setFilterTouchesWhenObscured(false);
        restoreNotifications();
        pinStarted = false;
        activity.getWindow().getDecorView().setOnSystemUiVisibilityChangeListener(null);

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

    // ------------------------------------------------------- notifikasi / DND

    private NotificationManager nm() {
        return (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
    }

    boolean isDndGranted() {
        try {
            NotificationManager n = nm();
            return n != null && n.isNotificationPolicyAccessGranted();
        } catch (Throwable t) {
            return false;
        }
    }

    private SharedPreferences prefs() {
        return activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Aktifkan "Tidak ada gangguan"; simpan pengaturan lama agar bisa dipulihkan. */
    private void blockNotifications() {
        try {
            NotificationManager n = nm();
            if (n == null || !n.isNotificationPolicyAccessGranted()) return;
            if (!dndApplied) {
                int before = n.getCurrentInterruptionFilter();
                if (before != NotificationManager.INTERRUPTION_FILTER_NONE
                        && before != NotificationManager.INTERRUPTION_FILTER_UNKNOWN) {
                    // disimpan permanen: bila aplikasi dimatikan paksa saat ujian,
                    // pengaturan dipulihkan saat aplikasi dibuka lagi
                    prefs().edit().putInt(PREF_DND, before).apply();
                }
            }
            n.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE);
            dndApplied = true;
        } catch (Throwable ignored) {
            // perangkat tidak mendukung
        }
    }

    /** Kembalikan pengaturan notifikasi semula. Aman dipanggil kapan saja. */
    void restoreNotifications() {
        try {
            SharedPreferences p = prefs();
            int saved = p.getInt(PREF_DND, -1);
            NotificationManager n = nm();
            if (saved >= 0 && n != null && n.isNotificationPolicyAccessGranted()) {
                n.setInterruptionFilter(saved);
            }
            p.edit().remove(PREF_DND).apply();
        } catch (Throwable ignored) {
            // abaikan
        }
        dndApplied = false;
    }

    /** Siswa mengubah mode Jangan Ganggu di tengah ujian: pasang lagi + catat. */
    private void checkDnd() {
        try {
            NotificationManager n = nm();
            if (n == null || !n.isNotificationPolicyAccessGranted()) {
                if (dndApplied) {
                    dndApplied = false;
                    report("Izin Jangan Ganggu dicabut");
                }
                return;
            }
            if (dndApplied
                    && n.getCurrentInterruptionFilter()
                    != NotificationManager.INTERRUPTION_FILTER_NONE) {
                report("Mengubah pengaturan notifikasi (Jangan Ganggu)");
            }
            blockNotifications();
        } catch (Throwable ignored) {
            // abaikan
        }
    }

    /** Buka layar izin "Akses Jangan Ganggu" (harus sebelum layar dikunci). */
    void openDndSettings() {
        // pindah ke Pengaturan resmi dari kita: jangan dihitung pelanggaran
        graceUntil = SystemClock.elapsedRealtime() + 60000;
        try {
            Intent i = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(i);
        } catch (Throwable t) {
            android.widget.Toast.makeText(activity,
                    "Buka Pengaturan > Notifikasi > Akses Jangan Ganggu, lalu izinkan Ujiin.",
                    android.widget.Toast.LENGTH_LONG).show();
        }
    }

    /**
     * Kunci layar dipasang setelah izin Jangan Ganggu ada. Layar yang sudah
     * dikunci tidak bisa membuka Pengaturan, jadi urutannya harus begini.
     */
    private void startLockIfReady() {
        if (pinStarted || !active) return;
        if (!isDndGranted()) return;
        pinStarted = true;
        long now = SystemClock.elapsedRealtime();
        enteredAt = now;
        graceUntil = now + GRACE_MS;
        blockNotifications();
        pinNow();
    }

    /** Status untuk halaman web (gerbang "kunci layar wajib aktif"). */
    String statusJson() {
        JSONObject o = new JSONObject();
        try {
            o.put("active", active);
            o.put("dndGranted", isDndGranted());
            o.put("dndBlocking", dndApplied);
            o.put("pinned", active && pinStarted && isPinned());
        } catch (Exception ignored) {
            // JSONObject.put tidak melempar untuk tipe ini
        }
        return o.toString();
    }

    /** Minta kunci layar lagi (tombol di halaman web). */
    void requestPin() {
        startLockIfReady();
        if (pinStarted) pinNow();
    }

    // ------------------------------------------------------------ screen pinning

    private void pinNow() {
        // Bila Device Owner: izinkan lock task tanpa dialog + matikan Home/Recents/notifikasi
        KioskAdminReceiver.prepare(activity);
        try {
            activity.startLockTask();
        } catch (Exception ignored) {
            // beberapa perangkat menolak; deteksi fokus tetap berjalan
        }
    }

    private boolean isPinned() {
        try {
            ActivityManager am = (ActivityManager) activity.getSystemService(Context.ACTIVITY_SERVICE);
            return am != null
                    && am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE;
        } catch (Throwable t) {
            return true; // tidak bisa diperiksa: jangan menghukum siswa
        }
    }

    private void checkPinned() {
        long now = SystemClock.elapsedRealtime();
        if (isPinned()) {
            everPinned = true;
            return;
        }
        if (everPinned) {
            // sebelumnya terkunci lalu dilepas = siswa sengaja keluar dari kunci
            everPinned = false;
            report("Melepas kunci layar (screen pinning)");
            pinNow();
        } else if (now - enteredAt > GRACE_MS) {
            // belum pernah terkunci: dialog ditolak / tidak didukung perangkat
            if (now - lastPinRequest > PIN_RETRY_MS) {
                lastPinRequest = now;
                pinNow(); // minta lagi; dialog muncul kembali
            }
            if (!warnedNoPin && now - enteredAt > PIN_NEVER_WARN_MS) {
                warnedNoPin = true;
                android.widget.Toast.makeText(activity,
                        "Izinkan kunci layar (Mengerti / Start) agar ujian aman.",
                        android.widget.Toast.LENGTH_LONG).show();
                report("Kunci layar (screen pinning) tidak diaktifkan");
            }
        }
    }

    /** Tombol Home ditekan / aplikasi akan ditinggalkan. */
    void onUserLeaveHint() {
        if (active) report("Menekan tombol Home / berpindah aplikasi");
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
