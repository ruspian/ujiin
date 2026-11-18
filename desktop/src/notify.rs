//! Notifikasi desktop (toast Windows, D-Bus di Linux). Di platform lain hanya mencatat ke log.

#[cfg(windows)]
pub fn toast(title: &str, body: &str) {
    use winrt_notification::{Duration, Sound, Toast};
    let _ = Toast::new(Toast::POWERSHELL_APP_ID)
        .title(title)
        .text1(body)
        .sound(Some(Sound::Default))
        .duration(Duration::Short)
        .show();
}

#[cfg(target_os = "linux")]
pub fn toast(title: &str, body: &str) {
    // Lewat D-Bus (org.freedesktop.Notifications); diam saja bila tidak ada daemon notifikasi.
    let (t, b) = (title.to_string(), body.to_string());
    std::thread::spawn(move || {
        let _ = notify_rust::Notification::new()
            .appname("Ujiin Guru")
            .summary(&t)
            .body(&b)
            .show();
    });
}

#[cfg(not(any(windows, target_os = "linux")))]
pub fn toast(title: &str, body: &str) {
    eprintln!("[notifikasi] {title}: {body}");
}
