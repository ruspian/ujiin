package com.ujiin.exam;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.widget.Toast;

import android.webkit.JavascriptInterface;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/** Jembatan JavaScript -> Android. Tersedia di web sebagai window.UjiinNative. */
final class NativeBridge {

    private final MainActivity activity;
    private final ExamGuard guard;

    NativeBridge(MainActivity activity, ExamGuard guard) {
        this.activity = activity;
        this.guard = guard;
    }

    @JavascriptInterface
    public boolean isNativeApp() {
        return true;
    }

    @JavascriptInterface
    public String getVersion() {
        return BuildConfig.VERSION_NAME;
    }

    @JavascriptInterface
    public void examReady() {
        guard.setWebReady(true);
    }

    @JavascriptInterface
    public String drainViolations() {
        // setelah web mengambil antrean, event berikutnya dikirim langsung
        String json = guard.drain();
        guard.setWebReady(true);
        return json;
    }

    /** JSON: {active, dndGranted, dndBlocking, pinned}. Dipakai gerbang kunci layar di web. */
    @JavascriptInterface
    public String lockStatus() {
        return guard.statusJson();
    }

    @JavascriptInterface
    public void openDndSettings() {
        activity.runOnUiThread(guard::openDndSettings);
    }

    @JavascriptInterface
    public void requestPin() {
        activity.runOnUiThread(guard::requestPin);
    }

    @JavascriptInterface
    public void retry() {
        activity.runOnUiThread(activity::retryLoad);
    }

    /** Menyimpan file hasil ekspor (Word/Excel) dari web ke folder Download. */
    @JavascriptInterface
    public void saveFile(String filename, String mime, String base64) {
        try {
            byte[] data = Base64.decode(base64, Base64.DEFAULT);
            String safeName = (filename == null || filename.trim().isEmpty() ? "file" : filename)
                    .replaceAll("[\\\\/:*?\"<>|]", "_");
            String type = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
            String where = write(safeName, type, data);
            toast("Tersimpan di " + where + ": " + safeName);
        } catch (Exception e) {
            toast("Gagal menyimpan file");
        }
    }

    private String write(String name, String mime, byte[] data) throws Exception {
        if (Build.VERSION.SDK_INT >= 29) {
            ContentResolver resolver = activity.getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, name);
            values.put(MediaStore.Downloads.MIME_TYPE, mime);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("insert gagal");
            try (OutputStream out = resolver.openOutputStream(uri)) {
                if (out == null) throw new IllegalStateException("stream null");
                out.write(data);
            }
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            resolver.update(uri, values, null, null);
            return "folder Download";
        }
        File dir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) throw new IllegalStateException("tidak ada penyimpanan");
        File file = new File(dir, name);
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(data);
        }
        return file.getParent();
    }

    private void toast(String text) {
        activity.runOnUiThread(() ->
                Toast.makeText(activity, text, Toast.LENGTH_LONG).show());
    }
}
