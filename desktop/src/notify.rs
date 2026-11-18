//! Notifikasi desktop (toast Windows). Di platform lain tidak melakukan apa-apa.

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

#[cfg(not(windows))]
pub fn toast(title: &str, body: &str) {
    eprintln!("[notifikasi] {title}: {body}");
}
