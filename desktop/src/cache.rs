//! Cache data ke disk agar daftar tetap bisa dilihat saat internet putus.

use serde_json::Value;
use std::path::PathBuf;

fn dir(scope: &str) -> Option<PathBuf> {
    let mut p = dirs::cache_dir()?;
    p.push("ujiin-guru");
    p.push(sanitize(scope));
    std::fs::create_dir_all(&p).ok()?;
    Some(p)
}

fn sanitize(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' { c } else { '_' })
        .collect()
}

pub fn save(scope: &str, key: &str, value: &Value) {
    if let Some(mut p) = dir(scope) {
        p.push(format!("{}.json", sanitize(key)));
        if let Ok(text) = serde_json::to_string(value) {
            let _ = std::fs::write(p, text);
        }
    }
}

/// Mengembalikan (data, waktu tersimpan "dd/mm HH:MM" dari berkas).
pub fn load(scope: &str, key: &str) -> Option<(Value, String)> {
    let mut p = dir(scope)?;
    p.push(format!("{}.json", sanitize(key)));
    let text = std::fs::read_to_string(&p).ok()?;
    let value = serde_json::from_str(&text).ok()?;
    let when = std::fs::metadata(&p)
        .and_then(|m| m.modified())
        .ok()
        .map(crate::util::fmt_system_time)
        .unwrap_or_default();
    Some((value, when))
}

pub fn remember_server(url: &str) {
    if let Some(mut p) = dirs::config_dir() {
        p.push("ujiin-guru");
        if std::fs::create_dir_all(&p).is_ok() {
            p.push("server.txt");
            let _ = std::fs::write(p, url);
        }
    }
}

pub fn last_server() -> String {
    dirs::config_dir()
        .map(|mut p| {
            p.push("ujiin-guru");
            p.push("server.txt");
            p
        })
        .and_then(|p| std::fs::read_to_string(p).ok())
        .filter(|s| !s.trim().is_empty())
        .or_else(|| option_env!("UJIIN_DEFAULT_SERVER").map(str::to_string))
        .unwrap_or_default()
}
