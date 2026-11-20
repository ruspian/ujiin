//! Impor Excel untuk pengguna dan soal (impor siswa ada di forms.rs).

use crate::app::App;
use crate::forms::{cell_string, pairs_of, pick, pick_file};
use crate::theme::{self, GRAY, RED};
use crate::views::load;
use eframe::egui::{self, RichText};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::path::PathBuf;

const MAX_BARIS_PENGGUNA: usize = 500;

fn sheet_rows(path: &std::path::Path) -> Result<Vec<(String, Vec<Vec<String>>)>, String> {
    use calamine::{open_workbook_auto, Reader};
    let mut wb =
        open_workbook_auto(path).map_err(|e| format!("Berkas Excel tidak bisa dibuka ({e})"))?;
    let names = wb.sheet_names().to_vec();
    let mut out = Vec::new();
    for n in names {
        let range = wb
            .worksheet_range(&n)
            .map_err(|e| format!("Lembar \"{n}\" tidak terbaca ({e})"))?;
        out.push((
            n,
            range
                .rows()
                .map(|r| r.iter().map(cell_string).collect())
                .collect(),
        ));
    }
    Ok(out)
}

// ───────────────────────── pengguna ─────────────────────────

#[derive(Default)]
pub struct PenggunaImport {
    pub file: Option<PathBuf>,
    /// Nama, Username, Password, Peran
    pub rows: Vec<[String; 4]>,
    pub error: Option<String>,
    pub busy: bool,
}

/// Kolom: Nama, Username, Password, Peran (Guru/Admin); baris pertama judul.
pub fn read_users(path: &std::path::Path) -> Result<Vec<[String; 4]>, String> {
    let sheets = sheet_rows(path)?;
    let (_, rows) = sheets
        .into_iter()
        .next()
        .ok_or("Berkas tidak punya lembar.")?;
    let out: Vec<[String; 4]> = rows
        .into_iter()
        .skip(1)
        .map(|r| {
            let g = |i: usize| r.get(i).cloned().unwrap_or_default();
            [g(0), g(1), g(2), g(3)]
        })
        .filter(|r| !r[1].is_empty() && !r[2].is_empty())
        .collect();
    if out.is_empty() {
        return Err(
            "Tidak ada data pengguna yang valid. Kolom Username dan Password wajib diisi.".into(),
        );
    }
    if out.len() > MAX_BARIS_PENGGUNA {
        return Err(format!(
            "Maksimal {MAX_BARIS_PENGGUNA} baris per impor (berkas berisi {}). Bagi menjadi beberapa berkas.",
            out.len()
        ));
    }
    Ok(out)
}

pub fn write_user_template(path: &std::path::Path) -> Result<(), String> {
    let mut wb = rust_xlsxwriter::Workbook::new();
    let ws = wb.add_worksheet();
    for (i, h) in ["Nama", "Username", "Password", "Peran"].iter().enumerate() {
        ws.write(0, i as u16, *h).map_err(|e| e.to_string())?;
    }
    // Baris contoh: kolom ketiga sengaja kosong; baris tanpa isian wajib dilewati saat impor.
    for (i, v) in ["Siti Aminah, S.Pd", "sitiaminah", "", "Guru"]
        .iter()
        .enumerate()
    {
        if !v.is_empty() {
            ws.write(1, i as u16, *v).map_err(|e| e.to_string())?;
        }
    }
    ws.set_column_width(0, 26).map_err(|e| e.to_string())?;
    ws.set_column_width(1, 20).map_err(|e| e.to_string())?;
    wb.save(path).map_err(|e| e.to_string())
}

impl PenggunaImport {
    pub fn load(&mut self, p: &std::path::Path) {
        match read_users(p) {
            Ok(r) => {
                self.rows = r;
                self.error = None;
                self.file = Some(p.to_path_buf());
            }
            Err(e) => {
                self.rows.clear();
                self.error = Some(e);
                self.file = None;
            }
        }
    }
}

fn file_name(p: &Option<PathBuf>) -> String {
    p.as_ref()
        .and_then(|p| p.file_name())
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default()
}

fn drop_hint(ui: &mut egui::Ui) {
    ui.label(
        RichText::new("atau seret berkas .xlsx ke jendela ini")
            .size(12.5)
            .color(GRAY),
    );
}

pub fn pengguna_panel(app: &mut App, ui: &mut egui::Ui) {
    let Some(mut st) = app.forms.impuser.take() else {
        return;
    };
    let mut keep = true;
    if let Some(ok) = app.take_rpc("@form:impuser") {
        st.busy = false;
        if ok {
            keep = false;
        }
    }
    theme::card(ui, |ui| {
        ui.set_width(ui.available_width());
        ui.horizontal(|ui| {
            ui.label(RichText::new("Impor pengguna dari Excel").strong());
            if ui.button("Tutup").clicked() {
                keep = false;
            }
        });
        ui.label(
            RichText::new("Kolom: Nama, Username, Password, Peran (Guru atau Admin). Baris pertama judul. Username minimal 5 karakter, password minimal 6; username yang sudah ada dilewati.")
                .size(12.5)
                .color(GRAY),
        );
        ui.horizontal(|ui| {
            if ui.button("Unduh template").clicked() {
                let mut p = crate::export::downloads_dir();
                p.push("Template_Impor_Pengguna.xlsx");
                match write_user_template(&p) {
                    Ok(_) => app.push_toast(format!("Template tersimpan: {}", p.display()), true),
                    Err(e) => app.push_toast(e, false),
                }
            }
            if ui.button("Pilih berkas Excel...").clicked() {
                if let Some(p) = pick_file("Pilih berkas Excel pengguna", &["xlsx", "xls"]) {
                    st.load(&p);
                } else if !cfg!(any(windows, target_os = "linux")) {
                    app.push_toast("Seret berkas .xlsx ke jendela aplikasi.", true);
                }
            }
            drop_hint(ui);
        });
        if let Some(e) = &st.error {
            ui.colored_label(RED, e);
        }
        if !st.rows.is_empty() {
            ui.add_space(6.0);
            ui.label(format!(
                "{} baris siap diimpor dari {}",
                st.rows.len(),
                file_name(&st.file)
            ));
            egui::Grid::new("imp-user-prev")
                .striped(true)
                .spacing(theme::GRID_SPACING)
                .show(ui, |ui| {
                    for h in ["Nama", "Username", "Peran"] {
                        theme::th(ui, h);
                    }
                    ui.end_row();
                    for r in st.rows.iter().take(8) {
                        ui.label(&r[0]);
                        ui.label(&r[1]);
                        ui.label(if r[3].to_lowercase().contains("admin") {
                            "Admin"
                        } else {
                            "Guru"
                        });
                        ui.end_row();
                    }
                });
            if st.rows.len() > 8 {
                ui.label(
                    RichText::new(format!("... dan {} baris lain", st.rows.len() - 8)).color(GRAY),
                );
            }
            ui.add_space(6.0);
            if st.busy {
                ui.horizontal(|ui| {
                    ui.spinner();
                    ui.label("Mengimpor...");
                });
            } else if ui
                .add(theme::primary(&format!("Impor {} pengguna", st.rows.len())))
                .clicked()
            {
                st.busy = true;
                let data: Vec<Value> = st
                    .rows
                    .iter()
                    .map(|r| {
                        json!({
                            "name": r[0], "username": r[1], "password": r[2],
                            "role": if r[3].to_lowercase().contains("admin") { "ADMIN" } else { "GURU" }
                        })
                    })
                    .collect();
                if let Some(n) = app.net.clone() {
                    n.rpc(
                        "@form:impuser\nadmin/pengguna",
                        json!({"action": "importUsersBulk", "args": [data]}),
                    );
                }
            }
        }
    });
    ui.add_space(10.0);
    app.forms.impuser = if keep { Some(st) } else { None };
}

// ───────────────────────── soal ─────────────────────────

#[derive(Default)]
pub struct SoalImport {
    pub subject_id: String,
    pub subject_name: String,
    pub type_id: String,
    pub class_ids: Vec<String>,
    pub file: Option<PathBuf>,
    /// Baris siap kirim (format sama dengan impor web: Tipe_Soal, Teks_Soal, Opsi_A..E, Kunci_Jawaban, Skor).
    pub questions: Vec<Value>,
    pub error: Option<String>,
    pub busy: bool,
}

impl SoalImport {
    pub fn new(subject_id: &str, subject_name: &str) -> Self {
        Self {
            subject_id: subject_id.into(),
            subject_name: subject_name.into(),
            ..Default::default()
        }
    }

    pub fn load(&mut self, p: &std::path::Path) {
        match read_questions(p) {
            Ok(q) => {
                self.questions = q;
                self.error = None;
                self.file = Some(p.to_path_buf());
            }
            Err(e) => {
                self.questions.clear();
                self.error = Some(e);
                self.file = None;
            }
        }
    }
}

const TIPE: [(&str, &str); 5] = [
    ("MULTIPLE_CHOICE", "Pilihan ganda"),
    ("MULTIPLE_CHOICE_COMPLEX", "PG kompleks"),
    ("MATCHING", "Menjodohkan"),
    ("ESSAY", "Esai"),
    ("TRUE_FALSE", "Benar/Salah"),
];

fn tipe_label(t: &str) -> &'static str {
    TIPE.iter()
        .find(|(k, _)| *k == t)
        .map(|(_, v)| *v)
        .unwrap_or("Pilihan ganda")
}

/// Tipe soal bawaan dari nama lembar (sama dengan impor web).
fn tipe_dari_lembar(name: &str) -> &'static str {
    let n = name.to_uppercase();
    if n.contains("KOMPLEKS") {
        "MULTIPLE_CHOICE_COMPLEX"
    } else if n.contains("JODOH") || n.contains("MATCHING") {
        "MATCHING"
    } else if n.contains("ESAI") || n.contains("URAIAN") {
        "ESSAY"
    } else if n.contains("BENAR") || n.contains("SALAH") {
        "TRUE_FALSE"
    } else {
        "MULTIPLE_CHOICE"
    }
}

/// Baca semua lembar; tiap lembar punya judul kolom di baris pertama (Teks_Soal, Opsi_A..E, Kunci_Jawaban, Skor).
pub fn read_questions(path: &std::path::Path) -> Result<Vec<Value>, String> {
    let mut out = Vec::new();
    for (name, rows) in sheet_rows(path)? {
        let Some(head) = rows.first() else { continue };
        let tipe = tipe_dari_lembar(&name);
        for r in rows.iter().skip(1) {
            let mut o = serde_json::Map::new();
            o.insert("Tipe_Soal".into(), json!(tipe));
            for (i, h) in head.iter().enumerate() {
                let h = h.trim();
                let v = r.get(i).cloned().unwrap_or_default();
                if h.is_empty() || v.is_empty() {
                    continue;
                }
                // Skor dikirim sebagai angka bila bisa
                if h == "Skor" {
                    if let Ok(n) = v.replace(',', ".").parse::<f64>() {
                        o.insert(h.into(), json!(n));
                        continue;
                    }
                }
                o.insert(h.into(), json!(v));
            }
            if o.get("Teks_Soal")
                .map(|t| t.as_str().unwrap_or("").trim().is_empty())
                .unwrap_or(true)
            {
                continue;
            }
            out.push(Value::Object(o));
        }
    }
    if out.is_empty() {
        return Err(
            "Tidak ada soal yang terbaca. Pastikan memakai template (kolom Teks_Soal terisi)."
                .into(),
        );
    }
    Ok(out)
}

/// Template sama dengan Template_Soal.xlsx di web: lima lembar.
pub fn write_question_template(path: &std::path::Path) -> Result<(), String> {
    let mut wb = rust_xlsxwriter::Workbook::new();
    let head_pg = [
        "Teks_Soal",
        "Opsi_A",
        "Opsi_B",
        "Opsi_C",
        "Opsi_D",
        "Opsi_E",
        "Kunci_Jawaban",
        "Skor",
    ];
    let head_j = [
        "Teks_Soal",
        "Opsi_A",
        "Opsi_B",
        "Opsi_C",
        "Opsi_D",
        "Opsi_E",
    ];
    type Sheet<'a> = (&'a str, &'a [&'a str], Vec<Vec<String>>);
    let s = |v: &[&str]| v.iter().map(|x| x.to_string()).collect::<Vec<_>>();
    let sheets: Vec<Sheet> = vec![
        (
            "PG",
            &head_pg,
            vec![s(&[
                "Ibukota negara Indonesia adalah?",
                "Jakarta",
                "Bandung",
                "Surabaya",
                "Medan",
                "Bali",
                "A",
                "2",
            ])],
        ),
        (
            "PG Kompleks",
            &head_pg,
            vec![s(&[
                "Yang termasuk bahasa pemrograman web adalah?",
                "Word",
                "Photoshop",
                "PHP",
                "CorelDraw",
                "JavaScript",
                "C,E",
                "2",
            ])],
        ),
        (
            "Menjodohkan",
            &head_j,
            vec![s(&[
                "Pasangkan dengan tepat!",
                "Indonesia | Jakarta | 10",
                "Malaysia | Kuala Lumpur | 5",
                "Jepang | Tokyo | 15",
            ])],
        ),
        (
            "Esai",
            &head_pg,
            vec![s(&[
                "Jelaskan visi dan misi desa Banuroja!",
                "",
                "",
                "",
                "",
                "",
                "Visi: Maju bersama... Misi: 1. ... 2. ...",
                "10",
            ])],
        ),
        (
            "Benar Salah",
            &head_pg,
            vec![
                s(&[
                    "Javascript adalah bahasa pemrograman",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "BENAR",
                    "10",
                ]),
                s(&[
                    "Ibukota negara Indonesia saat ini adalah Bandung",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "SALAH",
                    "10",
                ]),
            ],
        ),
    ];
    for (name, head, rows) in sheets {
        let ws = wb.add_worksheet();
        ws.set_name(name).map_err(|e| e.to_string())?;
        for (i, h) in head.iter().enumerate() {
            ws.write(0, i as u16, *h).map_err(|e| e.to_string())?;
        }
        for (ri, r) in rows.iter().enumerate() {
            for (ci, v) in r.iter().enumerate() {
                if v.is_empty() {
                    continue;
                }
                let row = (ri + 1) as u32;
                if head[ci] == "Skor" {
                    if let Ok(n) = v.parse::<f64>() {
                        ws.write(row, ci as u16, n).map_err(|e| e.to_string())?;
                        continue;
                    }
                }
                ws.write(row, ci as u16, v.as_str())
                    .map_err(|e| e.to_string())?;
            }
        }
        ws.set_column_width(0, 44).map_err(|e| e.to_string())?;
    }
    wb.save(path).map_err(|e| e.to_string())
}

pub fn soal_panel(app: &mut App, ui: &mut egui::Ui) {
    let Some(mut st) = app.forms.impsoal.take() else {
        return;
    };
    let mut keep = true;
    if let Some(ok) = app.take_rpc("@form:impsoal") {
        st.busy = false;
        if ok {
            keep = false;
        }
    }
    ui.horizontal(|ui| {
        if ui.button("Kembali").clicked() {
            keep = false;
        }
        ui.label(
            RichText::new(format!("Impor soal · {}", st.subject_name))
                .size(18.0)
                .strong(),
        );
    });
    ui.add_space(6.0);
    let Some(meta) = load(app, ui, &format!("soal-form/{}", st.subject_id), 120) else {
        app.forms.impsoal = if keep { Some(st) } else { None };
        return;
    };
    let classes = pairs_of(&meta, "classes", "name");
    let types = pairs_of(&meta, "examTypes", "name");
    if st.type_id.is_empty() {
        if let Some((id, _)) = types.first() {
            st.type_id = id.clone();
        }
    }
    if st.class_ids.is_empty() && classes.len() == 1 {
        st.class_ids.push(classes[0].0.clone());
    }

    egui::ScrollArea::vertical().auto_shrink(false).show(ui, |ui| {
        theme::card(ui, |ui| {
            ui.set_width(ui.available_width());
            ui.label(RichText::new("1. Tujuan soal").strong());
            ui.add_space(4.0);
            ui.label(RichText::new("Kategori ujian").size(12.5).color(GRAY));
            pick(ui, "imp-type", &mut st.type_id, &types, "Pilih");
            ui.add_space(4.0);
            ui.label(RichText::new("Untuk kelas").size(12.5).color(GRAY));
            ui.horizontal_wrapped(|ui| {
                for (id, name) in &classes {
                    let mut on = st.class_ids.contains(id);
                    if ui.checkbox(&mut on, name).changed() {
                        if on {
                            st.class_ids.push(id.clone());
                        } else {
                            st.class_ids.retain(|c| c != id);
                        }
                    }
                }
                if classes.is_empty() {
                    ui.colored_label(RED, "Anda belum ditugaskan mengampu mapel ini di kelas mana pun.");
                }
            });
        });
        ui.add_space(8.0);
        theme::card(ui, |ui| {
            ui.set_width(ui.available_width());
            ui.label(RichText::new("2. Berkas Excel").strong());
            ui.label(
                RichText::new("Pakai template: lembar PG, PG Kompleks, Menjodohkan, Esai, Benar Salah. Menjodohkan: tiap opsi berbentuk \"kiri | kanan | poin\".")
                    .size(12.5)
                    .color(GRAY),
            );
            ui.horizontal(|ui| {
                if ui.button("Unduh template").clicked() {
                    let mut p = crate::export::downloads_dir();
                    p.push("Template_Soal.xlsx");
                    match write_question_template(&p) {
                        Ok(_) => app.push_toast(format!("Template tersimpan: {}", p.display()), true),
                        Err(e) => app.push_toast(e, false),
                    }
                }
                if ui.button("Pilih berkas Excel...").clicked() {
                    if let Some(p) = pick_file("Pilih berkas Excel soal", &["xlsx", "xls"]) {
                        st.load(&p);
                    } else if !cfg!(any(windows, target_os = "linux")) {
                        app.push_toast("Seret berkas .xlsx ke jendela aplikasi.", true);
                    }
                }
                drop_hint(ui);
            });
            if let Some(e) = &st.error {
                ui.colored_label(RED, e);
            }
            if !st.questions.is_empty() {
                ui.add_space(6.0);
                let mut ringkas: Vec<String> = Vec::new();
                for (k, label) in TIPE {
                    let n = st
                        .questions
                        .iter()
                        .filter(|q| q["Tipe_Soal"].as_str() == Some(k))
                        .count();
                    if n > 0 {
                        ringkas.push(format!("{label} {n}"));
                    }
                }
                ui.label(format!(
                    "{} soal siap diimpor dari {} ({})",
                    st.questions.len(),
                    file_name(&st.file),
                    ringkas.join(", ")
                ));
                egui::Grid::new("imp-soal-prev")
                    .striped(true)
                    .spacing(theme::GRID_SPACING)
                    .show(ui, |ui| {
                        for h in ["Jenis", "Soal", "Kunci", "Skor"] {
                            theme::th(ui, h);
                        }
                        ui.end_row();
                        for q in st.questions.iter().take(8) {
                            let g = |k: &str| match q.get(k) {
                                Some(Value::String(s)) => s.clone(),
                                Some(Value::Number(n)) => n.to_string(),
                                _ => String::new(),
                            };
                            ui.label(tipe_label(q["Tipe_Soal"].as_str().unwrap_or("")));
                            ui.add(egui::Label::new(g("Teks_Soal").chars().take(60).collect::<String>()).truncate());
                            ui.label(g("Kunci_Jawaban").chars().take(14).collect::<String>());
                            ui.label(g("Skor"));
                            ui.end_row();
                        }
                    });
                if st.questions.len() > 8 {
                    ui.label(
                        RichText::new(format!("... dan {} soal lain", st.questions.len() - 8)).color(GRAY),
                    );
                }
                ui.add_space(6.0);
                ui.label(
                    RichText::new("Setelah impor, cek kartu Total bobot di Bank Soal (target 100).")
                        .size(12.5)
                        .color(GRAY),
                );
                let siap = !st.class_ids.is_empty() && !st.type_id.is_empty();
                if st.busy {
                    ui.horizontal(|ui| {
                        ui.spinner();
                        ui.label("Mengimpor...");
                    });
                } else {
                    let btn = ui.add_enabled(
                        siap,
                        theme::primary(&format!("Impor {} soal", st.questions.len())),
                    );
                    if !siap {
                        btn.on_disabled_hover_text("Pilih kategori ujian dan minimal satu kelas.");
                    } else if btn.clicked() {
                        st.busy = true;
                        let payload = json!({
                            "subjectId": st.subject_id,
                            "classIds": st.class_ids.iter().cloned().collect::<HashSet<_>>().into_iter().collect::<Vec<_>>(),
                            "typeId": st.type_id,
                            "questions": st.questions,
                        });
                        if let Some(n) = app.net.clone() {
                            n.rpc(
                                &format!("@form:impsoal\nsoal/{}", st.subject_id),
                                json!({"action": "importQuestions", "args": [payload]}),
                            );
                        }
                    }
                }
            }
        });
    });
    app.forms.impsoal = if keep { Some(st) } else { None };
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("ujiin-imp2-{}", std::process::id()));
        std::fs::create_dir_all(&d).unwrap();
        d.join(name)
    }

    #[test]
    fn template_pengguna_dilewati_bila_belum_diisi() {
        let p = tmp("u.xlsx");
        write_user_template(&p).unwrap();
        // contoh di templat tanpa kolom wajib terisi tidak ikut terimpor
        assert!(read_users(&p).is_err());
    }

    #[test]
    fn baca_pengguna_terisi() {
        let p = tmp("u2.xlsx");
        let mut wb = rust_xlsxwriter::Workbook::new();
        let ws = wb.add_worksheet();
        let kunci = "x".repeat(8);
        for (i, h) in ["Nama", "Username", "Password", "Peran"].iter().enumerate() {
            ws.write(0, i as u16, *h).unwrap();
        }
        ws.write(1, 0, "Siti").unwrap();
        ws.write(1, 1, "sitiaminah").unwrap();
        ws.write(1, 2, kunci.as_str()).unwrap();
        ws.write(1, 3, "Guru").unwrap();
        wb.save(&p).unwrap();
        let rows = read_users(&p).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0][1], "sitiaminah");
        assert_eq!(rows[0][2], kunci);
    }

    #[test]
    fn template_soal_terbaca_semua_tipe() {
        let p = tmp("q.xlsx");
        write_question_template(&p).unwrap();
        let q = read_questions(&p).unwrap();
        assert_eq!(q.len(), 6);
        let tipe = |i: usize| q[i]["Tipe_Soal"].as_str().unwrap().to_string();
        assert_eq!(tipe(0), "MULTIPLE_CHOICE");
        assert_eq!(tipe(1), "MULTIPLE_CHOICE_COMPLEX");
        assert_eq!(tipe(2), "MATCHING");
        assert_eq!(tipe(3), "ESSAY");
        assert_eq!(tipe(4), "TRUE_FALSE");
        assert_eq!(q[0]["Skor"], json!(2.0));
        assert_eq!(q[0]["Kunci_Jawaban"], json!("A"));
        assert_eq!(q[2]["Opsi_A"], json!("Indonesia | Jakarta | 10"));
    }
}
