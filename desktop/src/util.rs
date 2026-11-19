use serde_json::Value;

/// Hapus tag HTML sederhana + entitas umum, untuk menampilkan teks soal.
pub fn strip_html(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut in_tag = false;
    for c in html.chars() {
        match c {
            '<' => in_tag = true,
            '>' => {
                in_tag = false;
                out.push(' ');
            }
            _ if !in_tag => out.push(c),
            _ => {}
        }
    }
    let out = out
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'");
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn text(v: &Value, key: &str) -> String {
    match v.get(key) {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Null) | None => String::new(),
        Some(other) => other.to_string(),
    }
}

/// Ambil nilai bersarang dengan jalur "a.b.c"; array string digabung koma.
pub fn path_text(v: &Value, path: &str) -> String {
    let mut cur = v;
    for part in path.split('.') {
        match cur.get(part) {
            Some(next) => cur = next,
            None => return String::new(),
        }
    }
    match cur {
        Value::String(s) => s.clone(),
        Value::Null => String::new(),
        Value::Array(a) => a
            .iter()
            .map(|x| match x {
                Value::String(s) => s.clone(),
                Value::Object(o) => o
                    .values()
                    .map(|v| match v {
                        Value::String(s) => s.clone(),
                        other => other.to_string(),
                    })
                    .collect::<Vec<_>>()
                    .join(" - "),
                o => o.to_string(),
            })
            .collect::<Vec<_>>()
            .join(", "),
        Value::Number(n) => {
            if let Some(f) = n.as_f64() {
                if f.fract() == 0.0 {
                    format!("{}", f as i64)
                } else {
                    format!("{f:.1}")
                }
            } else {
                n.to_string()
            }
        }
        other => other.to_string(),
    }
}

pub fn i64_of(v: &Value, key: &str) -> i64 {
    v.get(key).and_then(|x| x.as_i64()).unwrap_or(0)
}

pub fn bool_of(v: &Value, key: &str) -> bool {
    v.get(key).and_then(|x| x.as_bool()).unwrap_or(false)
}

/// "2026-11-18T03:00:00.000Z" -> "18/11/2026 11:00" (WITA, UTC+8).
pub fn fmt_iso_wita(iso: &str) -> String {
    let Some((date, rest)) = iso.split_once('T') else {
        return iso.to_string();
    };
    let mut d = date.split('-');
    let (Some(y), Some(m), Some(day)) = (d.next(), d.next(), d.next()) else {
        return iso.to_string();
    };
    let (Ok(y), Ok(m), Ok(day)) = (y.parse::<i64>(), m.parse::<i64>(), day.parse::<i64>()) else {
        return iso.to_string();
    };
    let mut t = rest.trim_end_matches('Z').split(':');
    let h = t.next().and_then(|x| x.parse::<i64>().ok()).unwrap_or(0);
    let min = t.next().and_then(|x| x.parse::<i64>().ok()).unwrap_or(0);
    let days = days_from_civil(y, m, day);
    let total_min = days * 1440 + h * 60 + min + 8 * 60;
    let (dd, rem) = (total_min.div_euclid(1440), total_min.rem_euclid(1440));
    let (yy, mm, d2) = civil_from_days(dd);
    format!("{d2:02}/{mm:02}/{yy} {:02}:{:02}", rem / 60, rem % 60)
}

pub fn fmt_system_time(t: std::time::SystemTime) -> String {
    let secs = t
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let total_min = secs.div_euclid(60) + 8 * 60;
    let (dd, rem) = (total_min.div_euclid(1440), total_min.rem_euclid(1440));
    let (yy, mm, d2) = civil_from_days(dd);
    format!("{d2:02}/{mm:02}/{yy} {:02}:{:02}", rem / 60, rem % 60)
}

/// "2026-11-18T03:00:00.000Z" -> detik sejak epoch (UTC).
pub fn iso_secs(iso: &str) -> Option<i64> {
    let (date, rest) = iso.split_once('T')?;
    let mut d = date.split('-');
    let (y, m, day) = (
        d.next()?.parse::<i64>().ok()?,
        d.next()?.parse::<i64>().ok()?,
        d.next()?.parse::<i64>().ok()?,
    );
    let mut t = rest.trim_end_matches('Z').split(':');
    let h = t.next()?.parse::<i64>().ok()?;
    let mi = t.next()?.parse::<i64>().ok()?;
    let s = t
        .next()
        .and_then(|x| x.split('.').next()?.parse::<i64>().ok())
        .unwrap_or(0);
    Some(days_from_civil(y, m, day) * 86400 + h * 3600 + mi * 60 + s)
}

/// Jam:menit WITA dari ISO.
pub fn hhmm_wita(iso: &str) -> String {
    match iso_secs(iso) {
        Some(s) => {
            let m = (s + 8 * 3600).rem_euclid(86400) / 60;
            format!("{:02}:{:02}", m / 60, m % 60)
        }
        None => String::new(),
    }
}

fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

fn civil_from_days(z: i64) -> (i64, i64, i64) {
    let z = z + 719468;
    let era = z.div_euclid(146097);
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (if m <= 2 { y + 1 } else { y }, m, d)
}

/// Sel CSV aman untuk Excel (netralkan rumus, kutip koma/kutip).
pub fn csv_cell(s: &str) -> String {
    let mut t = s.to_string();
    let numeric = t.parse::<f64>().is_ok();
    if !numeric && t.starts_with(['=', '+', '-', '@', '\t', '\r']) {
        t.insert(0, '\'');
    }
    if t.contains(['"', ',', '\n', '\r']) {
        format!("\"{}\"", t.replace('"', "\"\""))
    } else {
        t
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn html_dibersihkan() {
        assert_eq!(
            strip_html("<p>Halo&nbsp;<b>dunia</b> &amp; Rust</p>"),
            "Halo dunia & Rust"
        );
    }

    #[test]
    fn waktu_wita() {
        assert_eq!(fmt_iso_wita("2026-11-18T03:00:00.000Z"), "18/11/2026 11:00");
        // melewati tengah malam & pergantian bulan
        assert_eq!(fmt_iso_wita("2026-12-31T16:30:00.000Z"), "01/01/2027 00:30");
    }

    #[test]
    fn csv_aman() {
        assert_eq!(csv_cell("=1+1"), "'=1+1");
        assert_eq!(csv_cell("a,b"), "\"a,b\"");
        assert_eq!(csv_cell("-5"), "-5");
    }

    #[test]
    fn path_bersarang() {
        let v = serde_json::json!({"a": {"b": ["x", "y"]}, "n": 85.0});
        assert_eq!(path_text(&v, "a.b"), "x, y");
        assert_eq!(path_text(&v, "n"), "85");
    }
}
