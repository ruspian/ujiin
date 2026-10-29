package com.ujiin.exam;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.MimeTypeMap;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONObject;

/**
 * Satu-satunya Activity. Isinya WebView penuh ke website Ujiin (tetap online,
 * jadi guru bisa input soal & koreksi nilai langsung seperti di web).
 *
 * Saat URL berada di /ujian/... aplikasi masuk "mode ujian" (lihat ExamGuard).
 */
public class MainActivity extends Activity {

    private static final String APP_UA = "UjiinApp/" + BuildConfig.VERSION_NAME;
    private static final String OFFLINE_URL = "file:///android_asset/offline.html";
    private static final int REQ_FILE = 4101;

    private WebView webView;
    private ExamGuard guard;
    private String baseHost;
    private String lastOnlineUrl = BuildConfig.BASE_URL;
    private ValueCallback<Uri[]> filePathCallback;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        baseHost = Uri.parse(BuildConfig.BASE_URL).getHost();

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(webView);

        guard = new ExamGuard(this, webView);

        // Tidak bisa diinspeksi lewat chrome://inspect
        WebView.setWebContentsDebuggingEnabled(false);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);          // asset:// tetap boleh (offline.html)
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUserAgentString(s.getUserAgentString() + " " + APP_UA);

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, false);

        // Tahan-lama (pilih teks / menu konteks) dimatikan selama ujian
        webView.setOnLongClickListener(v -> guard.isActive());
        webView.setHapticFeedbackEnabled(false);

        webView.addJavascriptInterface(new NativeBridge(this, guard), "UjiinNative");
        webView.setWebViewClient(new UjiinClient());
        webView.setWebChromeClient(new UjiinChrome());
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, length) ->
                handleDownload(url, mimeType));

        webView.loadUrl(BuildConfig.BASE_URL);
    }

    // ------------------------------------------------------------ navigasi

    private boolean isOurHost(Uri uri) {
        return uri != null && baseHost != null && baseHost.equalsIgnoreCase(uri.getHost())
                && "https".equalsIgnoreCase(uri.getScheme());
    }

    private static boolean isExamPath(String url) {
        if (url == null) return false;
        String path = Uri.parse(url).getPath();
        return path != null && (path.equals("/ujian") || path.startsWith("/ujian/"));
    }

    /** Masuk/keluar mode ujian sesuai URL. Dipanggil setiap URL berubah (termasuk SPA). */
    private void syncExamMode(String url) {
        if (url != null && url.startsWith("https://") && isOurHost(Uri.parse(url))) {
            lastOnlineUrl = url;
        }
        if (isExamPath(url)) {
            if (!guard.isActive() && !guard.enter()) {
                // perangkat tidak memenuhi syarat: kembali ke dashboard siswa
                webView.loadUrl(BuildConfig.BASE_URL + "/siswa");
            }
        } else {
            guard.exit();
        }
    }

    void retryLoad() {
        webView.loadUrl(lastOnlineUrl);
    }

    private final class UjiinClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if ("file".equals(uri.getScheme()) && uri.toString().startsWith("file:///android_asset/")) {
                return false;
            }
            if (isOurHost(uri)) return false;
            // Jangan pernah membuka situs lain di dalam / di luar app saat ujian
            if (!guard.isActive()) {
                Toast.makeText(MainActivity.this,
                        "Tautan ke situs lain diblokir", Toast.LENGTH_SHORT).show();
            }
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            syncExamMode(url);
        }

        @Override
        public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
            syncExamMode(url);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            CookieManager.getInstance().flush();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                view.loadUrl(OFFLINE_URL);
            }
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            // WebView crash / dimatikan sistem: muat ulang, jawaban sudah tersimpan di server
            retryLoad();
            return true;
        }
    }

    private final class UjiinChrome extends WebChromeClient {
        @Override
        public void onPermissionRequest(PermissionRequest request) {
            request.deny(); // tidak ada kamera/mikrofon/lokasi
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                         FileChooserParams params) {
            if (guard.isActive()) { // tidak boleh membuka berkas saat ujian
                callback.onReceiveValue(null);
                return true;
            }
            if (filePathCallback != null) filePathCallback.onReceiveValue(null);
            filePathCallback = callback;
            try {
                startActivityForResult(params.createIntent(), REQ_FILE);
            } catch (Exception e) {
                filePathCallback = null;
                callback.onReceiveValue(null);
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE && filePathCallback != null) {
            filePathCallback.onReceiveValue(
                    WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            filePathCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    // ------------------------------------------------------------- unduhan

    /** Ekspor Word/Excel dari web berupa blob: URL -> ubah ke base64 lalu simpan via NativeBridge. */
    private void handleDownload(String url, String mimeType) {
        if (guard.isActive()) return;
        if (url == null || !url.startsWith("blob:")) {
            Toast.makeText(this, "Jenis unduhan ini tidak didukung di aplikasi", Toast.LENGTH_LONG).show();
            return;
        }
        String type = (mimeType == null || mimeType.isEmpty()) ? "application/octet-stream" : mimeType;
        String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(type);
        if (ext == null) ext = "bin";
        String name = "ujiin-" + System.currentTimeMillis() + "." + ext;

        String js = "(function(){var x=new XMLHttpRequest();x.open('GET'," + JSONObject.quote(url)
                + ",true);x.responseType='blob';x.onload=function(){var r=new FileReader();"
                + "r.onloadend=function(){var d=String(r.result).split(',')[1]||'';"
                + "UjiinNative.saveFile(" + JSONObject.quote(name) + "," + JSONObject.quote(type)
                + ",d);};r.readAsDataURL(x.response);};x.send();})();";
        webView.evaluateJavascript(js, null);
    }

    // ----------------------------------------------------------- lifecycle

    @Override
    public void onBackPressed() {
        if (guard.isActive()) return; // tombol back dimatikan selama ujian
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
        guard.onResume();
    }

    @Override
    protected void onPause() {
        guard.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
        // WebView sengaja TIDAK di-pause saat ujian agar timer & heartbeat web tetap jalan
        if (!guard.isActive()) webView.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        guard.onWindowFocusChanged(hasFocus);
    }

    @Override
    public void onMultiWindowModeChanged(boolean isInMultiWindowMode, Configuration newConfig) {
        super.onMultiWindowModeChanged(isInMultiWindowMode, newConfig);
        guard.onMultiWindowModeChanged(isInMultiWindowMode);
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        guard.onPictureInPictureModeChanged(isInPictureInPictureMode);
    }

    @Override
    protected void onDestroy() {
        guard.exit();
        if (webView != null) {
            webView.removeJavascriptInterface("UjiinNative");
            webView.destroy();
        }
        super.onDestroy();
    }
}
