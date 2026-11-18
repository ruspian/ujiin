//! Ekspor tabel ke Excel (.xlsx) dan CSV langsung di komputer guru.

use crate::util::csv_cell;
use rust_xlsxwriter::{Format, FormatAlign, FormatBorder, Workbook};
use std::path::Path;

pub struct Sheet<'a> {
    pub title: &'a str,
    pub subtitle: &'a str,
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

pub fn write_xlsx(path: &Path, sheet: &Sheet) -> Result<(), String> {
    let mut wb = Workbook::new();
    let ws = wb.add_worksheet();
    let ws_name: String = sheet
        .title
        .chars()
        .filter(|c| !"[]:*?/\\".contains(*c))
        .take(31)
        .collect();
    ws.set_name(if ws_name.is_empty() { "Data" } else { &ws_name })
        .map_err(|e| e.to_string())?;

    let title = Format::new().set_bold().set_font_size(14);
    let sub = Format::new().set_italic();
    let head = Format::new()
        .set_bold()
        .set_border(FormatBorder::Thin)
        .set_align(FormatAlign::Center)
        .set_background_color(0xDDEEEE);
    let cell = Format::new().set_border(FormatBorder::Thin);

    ws.write_with_format(0, 0, sheet.title, &title)
        .map_err(|e| e.to_string())?;
    ws.write_with_format(1, 0, sheet.subtitle, &sub)
        .map_err(|e| e.to_string())?;

    for (c, h) in sheet.headers.iter().enumerate() {
        ws.write_with_format(3, c as u16, h.as_str(), &head)
            .map_err(|e| e.to_string())?;
        ws.set_column_width(c as u16, (h.chars().count() as f64 + 4.0).max(12.0))
            .map_err(|e| e.to_string())?;
    }
    for (r, row) in sheet.rows.iter().enumerate() {
        for (c, v) in row.iter().enumerate() {
            let (r, c) = (4 + r as u32, c as u16);
            // angka disimpan sebagai angka agar bisa dihitung di Excel
            match v.trim().replace(',', ".").parse::<f64>() {
                Ok(n) if !v.trim().is_empty() && !v.starts_with('0') || v.trim() == "0" => {
                    ws.write_number_with_format(r, c, n, &cell)
                        .map_err(|e| e.to_string())?;
                }
                _ => {
                    ws.write_string_with_format(r, c, v.as_str(), &cell)
                        .map_err(|e| e.to_string())?;
                }
            }
        }
    }
    wb.save(path).map_err(|e| e.to_string())
}

pub fn write_csv(path: &Path, sheet: &Sheet) -> Result<(), String> {
    let mut out = String::from("\u{FEFF}");
    out.push_str(
        &sheet
            .headers
            .iter()
            .map(|h| csv_cell(h))
            .collect::<Vec<_>>()
            .join(","),
    );
    out.push_str("\r\n");
    for row in &sheet.rows {
        out.push_str(
            &row.iter()
                .map(|v| csv_cell(v))
                .collect::<Vec<_>>()
                .join(","),
        );
        out.push_str("\r\n");
    }
    std::fs::write(path, out).map_err(|e| e.to_string())
}

/// Folder unduhan pengguna (fallback: folder home).
pub fn downloads_dir() -> std::path::PathBuf {
    dirs::download_dir()
        .or_else(dirs::home_dir)
        .unwrap_or_else(|| std::path::PathBuf::from("."))
}

pub fn safe_name(s: &str) -> String {
    let t: String = s
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();
    t.trim_matches('_').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Sheet<'static> {
        Sheet {
            title: "Nilai",
            subtitle: "Kelas X",
            headers: vec!["NISN".into(), "Nama".into(), "Nilai".into()],
            rows: vec![vec!["0012".into(), "Budi, S".into(), "85.5".into()]],
        }
    }

    #[test]
    fn xlsx_dan_csv_tertulis() {
        let dir = std::env::temp_dir().join(format!("ujiin-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let x = dir.join("a.xlsx");
        let c = dir.join("a.csv");
        write_xlsx(&x, &sample()).unwrap();
        write_csv(&c, &sample()).unwrap();
        assert!(std::fs::metadata(&x).unwrap().len() > 1000);
        let text = std::fs::read_to_string(&c).unwrap();
        assert!(text.starts_with('\u{FEFF}'));
        assert!(text.contains("\"Budi, S\""));
        let _ = std::fs::remove_dir_all(dir);
    }
}
