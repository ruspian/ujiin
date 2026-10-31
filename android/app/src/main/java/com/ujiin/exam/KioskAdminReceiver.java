package com.ujiin.exam;

import android.app.Activity;
import android.app.admin.DeviceAdminReceiver;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;

/**
 * Penerima admin perangkat. Bila aplikasi dijadikan Device Owner (lihat
 * android/README.md), ujian berjalan dalam mode kiosk penuh: tanpa dialog
 * screen pinning, dan siswa TIDAK bisa melepas kunci lewat Back+Recents,
 * Home, atau panel notifikasi. Tanpa Device Owner aplikasi tetap jalan memakai
 * screen pinning biasa.
 */
public class KioskAdminReceiver extends DeviceAdminReceiver {

    static ComponentName component(Context context) {
        return new ComponentName(context, KioskAdminReceiver.class);
    }

    /** @return true bila aplikasi ini adalah Device Owner perangkat. */
    static boolean isDeviceOwner(Context context) {
        try {
            DevicePolicyManager dpm =
                    (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            return dpm != null && dpm.isDeviceOwnerApp(context.getPackageName());
        } catch (Throwable t) {
            return false;
        }
    }

    /**
     * Izinkan aplikasi ini masuk lock task tanpa dialog dan matikan semua
     * fitur sistem selama terkunci (Home, Recents, notifikasi, dll).
     * @return true bila mode kiosk siap dipakai.
     */
    static boolean prepare(Activity activity) {
        if (!isDeviceOwner(activity)) return false;
        try {
            DevicePolicyManager dpm = (DevicePolicyManager)
                    activity.getSystemService(Context.DEVICE_POLICY_SERVICE);
            ComponentName admin = component(activity);
            dpm.setLockTaskPackages(admin, new String[]{activity.getPackageName()});
            if (android.os.Build.VERSION.SDK_INT >= 28) {
                dpm.setLockTaskFeatures(admin, DevicePolicyManager.LOCK_TASK_FEATURE_NONE);
            }
            return true;
        } catch (Throwable t) {
            return false;
        }
    }
}
