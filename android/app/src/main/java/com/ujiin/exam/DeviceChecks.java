package com.ujiin.exam;

import android.content.Context;
import android.os.Build;
import android.provider.Settings;

import java.io.File;

/** Pemeriksaan perangkat sebelum ujian dimulai. */
final class DeviceChecks {

    private static final String[] SU_PATHS = {
            "/system/bin/su", "/system/xbin/su", "/sbin/su", "/su/bin/su",
            "/system/sd/xbin/su", "/data/local/xbin/su", "/data/local/bin/su",
            "/system/app/Superuser.apk", "/system/bin/.ext/.su"
    };

    private DeviceChecks() {}

    /**
     * @return alasan yang memblokir ujian, atau null jika perangkat boleh dipakai.
     */
    static String blockingProblem(Context context) {
        if (!BuildConfig.STRICT_DEVICE_CHECK) return null;

        try {
            int adb = Settings.Global.getInt(
                    context.getContentResolver(), Settings.Global.ADB_ENABLED, 0);
            if (adb == 1) return "USB debugging aktif";
        } catch (Exception ignored) {
            // abaikan: jangan blokir siswa hanya karena pengecekan gagal
        }

        if (isRooted()) return "perangkat ter-root";
        return null;
    }

    private static boolean isRooted() {
        String tags = Build.TAGS;
        if (tags != null && tags.contains("test-keys")) return true;
        for (String path : SU_PATHS) {
            if (new File(path).exists()) return true;
        }
        return false;
    }
}
