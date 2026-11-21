//! Formulir bawaan: soal, jadwal ujian, mapel (pengampu), impor siswa, koreksi esai, kenaikan kelas.
//! Bagian pembuat/pembaca data dibuat sebagai fungsi murni agar mudah diuji.

use crate::app::App;
use crate::richtext;
use crate::theme::{self, GRAY, RED, TEAL};
use crate::util::{fmt_iso_wita, path_text, strip_html, text};
use crate::views::{arr, ask, load};
use eframe::egui::{self, Color32, RichText};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::path::PathBuf;

#[derive(Default)]
pub struct Forms {
    pub soal: Option<SoalForm>,
    pub jadwal: Option<JadwalForm>,
    pub mapel: Option<MapelForm>,
    pub import: Option<ImportState>,
    pub impuser: Option<crate::imports::PenggunaImport>,
    pub impsoal: Option<crate::imports::SoalImport>,
    pub koreksi: Option<KoreksiForm>,
    pub kenaikan: KenaikanState,
    pub master: Option<crate::master_edit::EditDlg>,
}

// ───────────────────────── umum ─────────────────────────

pub fn pick(
    ui: &mut egui::Ui,
    id: &str,
    cur: &mut String,
    items: &[(String, String)],
    placeholder: &str,
) {
    let shown = items
        .iter()
        .find(|(k, _)| k == cur)
        .map(|(_, v)| v.clone())
        .unwrap_or_else(|| placeholder.to_string());
    egui::ComboBox::from_id_salt(id)
        .selected_text(shown)
        .width(220.0)
        .show_ui(ui, |ui| {
            for (k, v) in items {
                ui.selectable_value(cur, k.clone(), v);
            }
        });
}

fn label(ui: &mut egui::Ui, t: &str) {
    ui.label(RichText::new(t).size(13.0).strong().color(GRAY));
}

pub fn pairs_of(v: &Value, key: &str, name: &str) -> Vec<(String, String)> {
    arr(v.get(key).unwrap_or(&Value::Null))
        .iter()
        .map(|x| (text(x, "id"), text(x, name)))
        .collect()
}

#[cfg(any(windows, target_os = "linux"))]
pub fn pick_file(title: &str, exts: &[&str]) -> Option<PathBuf> {
    rfd::FileDialog::new()
        .set_title(title)
        .add_filter("Berkas", exts)
        .pick_file()
}
#[cfg(not(any(windows, target_os = "linux")))]
pub fn pick_file(_title: &str, _exts: &[&str]) -> Option<PathBuf> {
    None
}

fn is_image(p: &std::path::Path) -> bool {
    matches!(
        p.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase())
            .as_deref(),
        Some("png" | "jpg" | "jpeg" | "gif" | "webp")
    )
}

/// Berkas yang diseret ke jendela: gambar -> editor soal aktif, Excel -> impor siswa.
pub fn on_files_dropped(app: &mut App, files: Vec<PathBuf>) {
    for p in files {
        if app.forms.soal.is_some() && is_image(&p) {
            start_upload(app, p);
        } else if let Some(imp) = app.forms.import.as_mut() {
            imp.load(&p);
        } else if let Some(imp) = app.forms.impuser.as_mut() {
            imp.load(&p);
        } else if let Some(imp) = app.forms.impsoal.as_mut() {
            imp.load(&p);
        } else {
            app.push_toast(
                "Berkas dilepas, tetapi tidak ada formulir yang menunggu berkas.",
                false,
            );
        }
    }
}

fn start_upload(app: &mut App, path: PathBuf) {
    let Some(f) = app.forms.soal.as_mut() else {
        return;
    };
    if f.uploading {
        return;
    }
    if let Some(n) = app.net.clone() {
        f.uploading = true;
        n.upload_image(path);
    }
}

/// Dipanggil App saat hasil unggah gambar tiba.
pub fn on_upload_done(app: &mut App, res: Result<String, String>) {
    let mut toast = None;
    if let Some(f) = app.forms.soal.as_mut() {
        f.uploading = false;
        match res {
            Ok(url) => {
                let tag = format!("<img src=\"{url}\">");
                let key = f.focus.clone();
                if let Some(t) = f.editor_mut(&key) {
                    if !t.is_empty() && !t.ends_with('\n') {
                        t.push('\n');
                    }
                    t.push_str(&tag);
                }
                toast = Some(("Gambar ditambahkan ke soal.".to_string(), true));
            }
            Err(e) => toast = Some((e, false)),
        }
    }
    if let Some((m, ok)) = toast {
        app.push_toast(m, ok);
    }
}

/// Kolom teks soal dengan tombol format. `focus` mencatat editor yang terakhir dipakai.
fn rich_editor(
    ui: &mut egui::Ui,
    key: &str,
    text: &mut String,
    rows: usize,
    focus: &mut String,
    want_pick: &mut bool,
    hint: &str,
) {
    let id = egui::Id::new(("rich", key));
    ui.horizontal(|ui| {
        for (lbl, open, close) in [
            ("B", "<b>", "</b>"),
            ("I", "<i>", "</i>"),
            ("U", "<u>", "</u>"),
            ("Sub", "<sub>", "</sub>"),
            ("Sup", "<sup>", "</sup>"),
        ] {
            if ui
                .add(
                    egui::Button::new(RichText::new(lbl).size(12.5).strong())
                        .min_size(egui::vec2(30.0, 24.0)),
                )
                .clicked()
            {
                wrap_selection(ui.ctx(), id, text, open, close);
                *focus = key.to_string();
            }
        }
        if ui
            .add(
                egui::Button::new(RichText::new("Gambar...").size(12.5))
                    .min_size(egui::vec2(30.0, 24.0)),
            )
            .clicked()
        {
            *focus = key.to_string();
            *want_pick = true;
        }
    });
    let r = ui.add(
        egui::TextEdit::multiline(text)
            .id(id)
            .desired_rows(rows)
            .desired_width(f32::INFINITY)
            .hint_text(hint)
            .margin(egui::vec2(8.0, 6.0)),
    );
    if r.has_focus() || r.changed() {
        *focus = key.to_string();
    }
    if !text.trim().is_empty() && (text.contains('<')) {
        egui::Frame::new()
            .fill(Color32::from_rgb(248, 250, 252))
            .corner_radius(egui::CornerRadius::same(8))
            .inner_margin(egui::Margin::same(8))
            .show(ui, |ui| {
                ui.label(RichText::new("Pratinjau").size(11.0).color(GRAY));
                let job = richtext::preview_job(text, theme::INK, 15.0, ui.available_width());
                ui.label(job);
            });
    }
}

fn wrap_selection(ctx: &egui::Context, id: egui::Id, text: &mut String, open: &str, close: &str) {
    let mut state = egui::TextEdit::load_state(ctx, id).unwrap_or_default();
    let (a, b) = match state.cursor.char_range() {
        Some(r) => (
            r.primary.index.0.min(r.secondary.index.0),
            r.primary.index.0.max(r.secondary.index.0),
        ),
        None => (text.chars().count(), text.chars().count()),
    };
    let byte = |ci: usize| {
        text.char_indices()
            .nth(ci)
            .map(|(i, _)| i)
            .unwrap_or(text.len())
    };
    let (ba, bb) = (byte(a), byte(b));
    text.insert_str(bb, close);
    text.insert_str(ba, open);
    let end = b + open.chars().count() + if a == b { 0 } else { close.chars().count() };
    let end = if a == b {
        a + open.chars().count()
    } else {
        end
    };
    state
        .cursor
        .set_char_range(Some(egui::text::CCursorRange::one(
            egui::text::CCursor::new(end),
        )));
    state.store(ctx, id);
}

// ───────────────────────── soal ─────────────────────────

#[derive(Clone, Default)]
pub struct Pair {
    pub left: String,
    pub right: String,
    pub point: String,
}

#[derive(Clone)]
pub struct SoalForm {
    pub id: Option<String>,
    pub subject_id: String,
    pub subject_name: String,
    pub kind: String,
    pub type_id: String,
    pub score: String,
    pub text: String,
    pub opts: [String; 5],
    pub single: usize,
    pub multi: [bool; 5],
    pub tf_true: bool,
    pub essay_key: String,
    pub pairs: Vec<Pair>,
    pub class_ids: Vec<String>,
    pub loaded: bool,
    pub busy: bool,
    pub uploading: bool,
    pub focus: String,
}

impl SoalForm {
    pub fn new(subject_id: &str, subject_name: &str, edit_id: Option<String>) -> Self {
        Self {
            loaded: edit_id.is_none(),
            id: edit_id,
            subject_id: subject_id.into(),
            subject_name: subject_name.into(),
            kind: "MULTIPLE_CHOICE".into(),
            type_id: String::new(),
            score: "10".into(),
            text: String::new(),
            opts: Default::default(),
            single: 0,
            multi: [false; 5],
            tf_true: true,
            essay_key: String::new(),
            pairs: vec![
                Pair {
                    point: "5".into(),
                    ..Default::default()
                },
                Pair {
                    point: "5".into(),
                    ..Default::default()
                },
            ],
            class_ids: vec![],
            busy: false,
            uploading: false,
            focus: "text".into(),
        }
    }

    fn editor_mut(&mut self, key: &str) -> Option<&mut String> {
        match key {
            "text" => Some(&mut self.text),
            "key" => Some(&mut self.essay_key),
            k if k.len() == 1 && "ABCDE".contains(k) => {
                Some(&mut self.opts[(k.as_bytes()[0] - b'A') as usize])
            }
            k if k.starts_with("pl") => k[2..]
                .parse::<usize>()
                .ok()
                .and_then(|i| self.pairs.get_mut(i))
                .map(|p| &mut p.left),
            k if k.starts_with("pr") => k[2..]
                .parse::<usize>()
                .ok()
                .and_then(|i| self.pairs.get_mut(i))
                .map(|p| &mut p.right),
            _ => None,
        }
    }

    /// Isi formulir dari soal yang ada (hasil GET soal-item).
    pub fn fill_from(&mut self, q: &Value) {
        self.kind = text(q, "type");
        self.type_id = text(q, "typeId");
        self.score = path_text(q, "score");
        self.text = richtext::html_to_edit(&text(q, "text"));
        self.class_ids = arr(q.get("classIds").unwrap_or(&Value::Null))
            .iter()
            .filter_map(|c| c.as_str().map(String::from))
            .collect();
        let correct = text(q, "correctAnswer");
        match self.kind.as_str() {
            "MULTIPLE_CHOICE" | "MULTIPLE_CHOICE_COMPLEX" => {
                for o in arr(q.get("options").unwrap_or(&Value::Null)) {
                    if let Some(i) = "ABCDE"
                        .find(text(o, "id").as_str())
                        .filter(|_| text(o, "id").len() == 1)
                    {
                        self.opts[i] = richtext::html_to_edit(&text(o, "text"));
                    }
                }
                if self.kind == "MULTIPLE_CHOICE" {
                    self.single = "ABCDE"
                        .find(correct.as_str())
                        .filter(|_| correct.len() == 1)
                        .unwrap_or(0);
                } else {
                    for c in correct.split(',') {
                        if let Some(i) = "ABCDE".find(c.trim()).filter(|_| c.trim().len() == 1) {
                            self.multi[i] = true;
                        }
                    }
                }
            }
            "TRUE_FALSE" => self.tf_true = correct == "BENAR",
            "ESSAY" => self.essay_key = richtext::html_to_edit(&correct),
            "MATCHING" => {
                if let Ok(Value::Array(a)) = serde_json::from_str::<Value>(&correct) {
                    self.pairs = a
                        .iter()
                        .map(|p| Pair {
                            left: richtext::html_to_edit(&text(p, "left")),
                            right: richtext::html_to_edit(&text(p, "right")),
                            point: path_text(p, "point"),
                        })
                        .collect();
                }
            }
            _ => {}
        }
        self.loaded = true;
    }
}

fn shuffled(mut v: Vec<String>) -> Vec<String> {
    let mut seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(7)
        | 1;
    for i in (1..v.len()).rev() {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        v.swap(i, (seed % (i as u64 + 1)) as usize);
    }
    v
}

/// Susun muatan createQuestion/updateQuestion; galat berupa pesan untuk ditampilkan.
pub fn soal_payload(f: &SoalForm) -> Result<Value, String> {
    if richtext::is_blank(&f.text) {
        return Err("Teks pertanyaan wajib diisi!".into());
    }
    if f.class_ids.is_empty() {
        return Err("Pilih minimal satu kelas!".into());
    }
    if f.type_id.is_empty() {
        return Err("Pilih kategori ujian!".into());
    }
    let mut score: i64 = f
        .score
        .trim()
        .parse()
        .map_err(|_| "Bobot nilai harus angka!".to_string())?;
    let letters = ["A", "B", "C", "D", "E"];
    let filled: Vec<usize> = (0..5)
        .filter(|&i| !richtext::is_blank(&f.opts[i]))
        .collect();
    let (options, correct): (Value, String) = match f.kind.as_str() {
        "MULTIPLE_CHOICE" | "MULTIPLE_CHOICE_COMPLEX" => {
            if richtext::is_blank(&f.opts[0]) || richtext::is_blank(&f.opts[1]) {
                return Err("Minimal Opsi A dan B harus diisi!".into());
            }
            let opts: Vec<Value> = filled
                .iter()
                .map(|&i| json!({"id": letters[i], "text": richtext::edit_to_html(&f.opts[i])}))
                .collect();
            let ans = if f.kind == "MULTIPLE_CHOICE" {
                if !filled.contains(&f.single) {
                    return Err("Pilih kunci jawaban pada opsi yang terisi!".into());
                }
                letters[f.single].to_string()
            } else {
                let picked: Vec<&str> = filled
                    .iter()
                    .filter(|&&i| f.multi[i])
                    .map(|&i| letters[i])
                    .collect();
                if picked.is_empty() {
                    return Err("Pilih minimal 1 jawaban benar!".into());
                }
                picked.join(",")
            };
            (Value::Array(opts), ans)
        }
        "TRUE_FALSE" => (
            json!([]),
            if f.tf_true { "BENAR" } else { "SALAH" }.to_string(),
        ),
        "ESSAY" => {
            if richtext::is_blank(&f.essay_key) {
                return Err("Kunci jawaban / rubrik penilaian wajib diisi!".into());
            }
            (json!([]), richtext::edit_to_html(&f.essay_key))
        }
        "MATCHING" => {
            if f.pairs.is_empty()
                || f.pairs
                    .iter()
                    .any(|p| richtext::is_blank(&p.left) || richtext::is_blank(&p.right))
            {
                return Err("Semua baris menjodohkan harus diisi!".into());
            }
            let mut total = 0;
            let mut pairs = Vec::new();
            for p in &f.pairs {
                let pt: i64 = p
                    .point
                    .trim()
                    .parse()
                    .map_err(|_| "Poin pasangan harus angka!".to_string())?;
                if pt < 1 {
                    return Err("Poin pasangan minimal 1!".into());
                }
                total += pt;
                pairs.push(json!({"left": richtext::edit_to_html(&p.left), "right": richtext::edit_to_html(&p.right), "point": pt}));
            }
            score = total;
            let lefts: Vec<String> = f
                .pairs
                .iter()
                .map(|p| richtext::edit_to_html(&p.left))
                .collect();
            let rights: Vec<String> = f
                .pairs
                .iter()
                .map(|p| richtext::edit_to_html(&p.right))
                .collect();
            (
                json!({"left": lefts, "right": shuffled(rights)}),
                serde_json::to_string(&pairs).unwrap_or_default(),
            )
        }
        _ => return Err("Jenis soal tidak dikenal.".into()),
    };
    if score < 1 {
        return Err("Bobot nilai minimal 1!".into());
    }
    Ok(json!({
        "subjectId": f.subject_id,
        "classIds": f.class_ids,
        "typeId": f.type_id,
        "type": f.kind,
        "score": score,
        "text": richtext::edit_to_html(&f.text),
        "options": options,
        "correctAnswer": correct,
    }))
}

const KINDS: [(&str, &str); 5] = [
    ("MULTIPLE_CHOICE", "Pilihan Ganda"),
    ("MULTIPLE_CHOICE_COMPLEX", "Pilihan Ganda Kompleks"),
    ("TRUE_FALSE", "Benar / Salah"),
    ("MATCHING", "Menjodohkan"),
    ("ESSAY", "Esai"),
];

pub fn soal_form(app: &mut App, ui: &mut egui::Ui) {
    let Some(mut f) = app.forms.soal.take() else {
        return;
    };
    let mut keep = true;
    if let Some(ok) = app.take_rpc("@form:soal") {
        f.busy = false;
        if ok {
            keep = false;
        }
    }
    let mut want_pick = false;
    let mut save = false;

    ui.horizontal(|ui| {
        if ui.button("Kembali").clicked() {
            keep = false;
        }
        ui.label(
            RichText::new(format!(
                "{} soal · {}",
                if f.id.is_some() { "Ubah" } else { "Buat" },
                f.subject_name
            ))
            .strong(),
        );
    });
    ui.add_space(6.0);

    if f.id.is_some() && !f.loaded {
        if let Some(q) = load(
            app,
            ui,
            &format!("soal-item/{}", f.id.clone().unwrap_or_default()),
            5,
        ) {
            f.fill_from(&q);
        }
        app.forms.soal = if keep { Some(f) } else { None };
        return;
    }
    let Some(meta) = load(app, ui, &format!("soal-form/{}", f.subject_id), 120) else {
        app.forms.soal = if keep { Some(f) } else { None };
        return;
    };
    let classes = pairs_of(&meta, "classes", "name");
    let types = pairs_of(&meta, "examTypes", "name");
    if f.type_id.is_empty() {
        if let Some((id, _)) = types.first() {
            f.type_id = id.clone();
        }
    }
    if f.id.is_none() && f.class_ids.is_empty() && classes.len() == 1 {
        f.class_ids.push(classes[0].0.clone());
    }

    egui::ScrollArea::vertical()
        .auto_shrink(false)
        .show(ui, |ui| {
            theme::card(ui, |ui| {
                ui.horizontal_wrapped(|ui| {
                    ui.vertical(|ui| {
                        label(ui, "Jenis soal");
                        ui.add_enabled_ui(f.id.is_none(), |ui| {
                            let kinds: Vec<(String, String)> = KINDS
                                .iter()
                                .map(|(a, b)| (a.to_string(), b.to_string()))
                                .collect();
                            pick(ui, "soal-kind", &mut f.kind, &kinds, "Pilih");
                        });
                    });
                    ui.vertical(|ui| {
                        label(ui, "Kategori ujian");
                        pick(ui, "soal-type", &mut f.type_id, &types, "Pilih");
                    });
                    if f.kind != "MATCHING" {
                        ui.vertical(|ui| {
                            label(ui, "Bobot nilai");
                            ui.add(egui::TextEdit::singleline(&mut f.score).desired_width(80.0));
                            ui.label(
                                RichText::new("Total semua soal maksimal 100")
                                    .size(11.5)
                                    .color(crate::theme::GRAY),
                            );
                        });
                    }
                });
                ui.add_space(6.0);
                label(ui, "Untuk kelas");
                ui.horizontal_wrapped(|ui| {
                    for (id, name) in &classes {
                        let mut on = f.class_ids.contains(id);
                        if ui.checkbox(&mut on, name).changed() {
                            if on {
                                f.class_ids.push(id.clone());
                            } else {
                                f.class_ids.retain(|c| c != id);
                            }
                        }
                    }
                    if classes.is_empty() {
                        ui.colored_label(
                            RED,
                            "Anda belum ditugaskan mengampu mapel ini di kelas mana pun.",
                        );
                    }
                });
            });
            ui.add_space(10.0);
            theme::card(ui, |ui| {
                label(ui, "Teks soal");
                rich_editor(
                    ui,
                    "text",
                    &mut f.text,
                    5,
                    &mut f.focus,
                    &mut want_pick,
                    "Tulis pertanyaan di sini. Satu baris = satu paragraf.",
                );
                ui.add_space(10.0);
                match f.kind.as_str() {
                    "MULTIPLE_CHOICE" | "MULTIPLE_CHOICE_COMPLEX" => {
                        label(
                            ui,
                            if f.kind == "MULTIPLE_CHOICE" {
                                "Opsi jawaban (pilih satu kunci)"
                            } else {
                                "Opsi jawaban (centang semua yang benar)"
                            },
                        );
                        for i in 0..5 {
                            let letter = ["A", "B", "C", "D", "E"][i];
                            ui.horizontal(|ui| {
                                ui.vertical(|ui| {
                                    ui.add_space(26.0);
                                    if f.kind == "MULTIPLE_CHOICE" {
                                        ui.radio_value(&mut f.single, i, format!("{letter}"));
                                    } else {
                                        ui.checkbox(&mut f.multi[i], letter);
                                    }
                                });
                                ui.vertical(|ui| {
                                    let mut t = std::mem::take(&mut f.opts[i]);
                                    rich_editor(
                                        ui,
                                        letter,
                                        &mut t,
                                        2,
                                        &mut f.focus,
                                        &mut want_pick,
                                        if i < 2 { "Wajib diisi" } else { "Opsional" },
                                    );
                                    f.opts[i] = t;
                                });
                            });
                        }
                    }
                    "TRUE_FALSE" => {
                        label(ui, "Kunci jawaban");
                        ui.horizontal(|ui| {
                            ui.radio_value(&mut f.tf_true, true, "BENAR");
                            ui.radio_value(&mut f.tf_true, false, "SALAH");
                        });
                    }
                    "ESSAY" => {
                        label(ui, "Kunci jawaban / rubrik penilaian");
                        let mut t = std::mem::take(&mut f.essay_key);
                        rich_editor(
                            ui,
                            "key",
                            &mut t,
                            4,
                            &mut f.focus,
                            &mut want_pick,
                            "Ditampilkan ke guru saat koreksi.",
                        );
                        f.essay_key = t;
                    }
                    "MATCHING" => {
                        label(ui, "Pasangan menjodohkan");
                        let mut remove = None;
                        for i in 0..f.pairs.len() {
                            ui.horizontal(|ui| {
                                ui.label(RichText::new(format!("#{}", i + 1)).strong().color(TEAL));
                                ui.vertical(|ui| {
                                    ui.set_width(300.0);
                                    let mut l = std::mem::take(&mut f.pairs[i].left);
                                    rich_editor(
                                        ui,
                                        &format!("pl{i}"),
                                        &mut l,
                                        2,
                                        &mut f.focus,
                                        &mut want_pick,
                                        "Kiri",
                                    );
                                    f.pairs[i].left = l;
                                });
                                ui.vertical(|ui| {
                                    ui.set_width(300.0);
                                    let mut r = std::mem::take(&mut f.pairs[i].right);
                                    rich_editor(
                                        ui,
                                        &format!("pr{i}"),
                                        &mut r,
                                        2,
                                        &mut f.focus,
                                        &mut want_pick,
                                        "Pasangan",
                                    );
                                    f.pairs[i].right = r;
                                });
                                ui.vertical(|ui| {
                                    label(ui, "Poin");
                                    ui.add(
                                        egui::TextEdit::singleline(&mut f.pairs[i].point)
                                            .desired_width(50.0),
                                    );
                                    if f.pairs.len() > 1 && theme::row_button(ui, "Hapus", true) {
                                        remove = Some(i);
                                    }
                                });
                            });
                        }
                        if let Some(i) = remove {
                            f.pairs.remove(i);
                        }
                        if ui.button("+ Tambah pasangan").clicked() {
                            f.pairs.push(Pair {
                                point: "5".into(),
                                ..Default::default()
                            });
                        }
                    }
                    _ => {}
                }
            });
            ui.add_space(10.0);
            ui.horizontal(|ui| {
                if f.busy || f.uploading {
                    ui.spinner();
                    ui.label(if f.uploading {
                        "Mengunggah gambar..."
                    } else {
                        "Menyimpan..."
                    });
                } else if ui.add(theme::primary("Simpan soal")).clicked() {
                    save = true;
                }
                ui.label(
                    RichText::new("Tip: seret berkas gambar ke jendela ini untuk menyisipkannya.")
                        .size(12.0)
                        .color(GRAY),
                );
            });
        });

    if want_pick {
        if let Some(p) = pick_file("Pilih gambar", &["png", "jpg", "jpeg", "gif", "webp"]) {
            app.forms.soal = Some(f.clone());
            start_upload(app, p);
            f = app.forms.soal.take().unwrap_or(f);
        } else if !cfg!(any(windows, target_os = "linux")) {
            app.push_toast(
                "Seret berkas gambar ke jendela aplikasi untuk menyisipkannya.",
                true,
            );
        }
    }
    if save {
        match soal_payload(&f) {
            Ok(payload) => {
                let (action, args) = match &f.id {
                    Some(id) => ("updateQuestion", json!([id, payload])),
                    None => ("createQuestion", json!([payload])),
                };
                f.busy = true;
                let refresh = format!("@form:soal\nsoal/{}", f.subject_id);
                if let Some(n) = app.net.clone() {
                    n.rpc(&refresh, json!({"action": action, "args": args}));
                }
            }
            Err(e) => app.push_toast(e, false),
        }
    }
    app.forms.soal = if keep { Some(f) } else { None };
}

// ───────────────────────── jadwal ─────────────────────────

#[derive(Clone, Default)]
pub struct JadwalForm {
    pub id: Option<String>,
    pub title: String,
    pub subject_id: String,
    pub type_id: String,
    pub year_id: String,
    pub date: String,
    pub start: String,
    pub end: String,
    pub duration: String,
    pub randomize: bool,
    pub shuffle: bool,
    pub show_result: bool,
    pub status: String,
    pub supervisor_id: String,
    pub class_ids: Vec<String>,
    pub loaded: bool,
    pub busy: bool,
}

impl JadwalForm {
    pub fn new(edit_id: Option<String>) -> Self {
        Self {
            loaded: edit_id.is_none(),
            id: edit_id,
            randomize: true,
            status: "PUBLISHED".into(),
            start: "07:30".into(),
            end: "09:30".into(),
            duration: "90".into(),
            ..Default::default()
        }
    }

    pub fn fill_from(&mut self, e: &Value) {
        self.title = text(e, "title");
        self.subject_id = text(e, "subjectId");
        self.type_id = text(e, "examTypeId");
        self.year_id = text(e, "academicYearId");
        let (d1, t1) = wita_parts(&text(e, "startTime"));
        let (_, t2) = wita_parts(&text(e, "endTime"));
        self.date = d1;
        self.start = t1;
        self.end = t2;
        self.duration = path_text(e, "duration");
        self.randomize = crate::util::bool_of(e, "randomizeQuestions");
        self.shuffle = crate::util::bool_of(e, "shuffleOptions");
        self.show_result = crate::util::bool_of(e, "showResult");
        self.status = text(e, "status");
        self.supervisor_id = text(e, "supervisorId");
        self.class_ids = arr(e.get("classIds").unwrap_or(&Value::Null))
            .iter()
            .filter_map(|c| c.as_str().map(String::from))
            .collect();
        self.loaded = true;
    }
}

/// "2026-11-18T03:00:00.000Z" -> ("2026-11-18", "11:00") dalam WITA.
pub fn wita_parts(iso: &str) -> (String, String) {
    let s = fmt_iso_wita(iso); // dd/mm/yyyy HH:MM
    let Some((d, t)) = s.split_once(' ') else {
        return (String::new(), String::new());
    };
    let mut p = d.split('/');
    match (p.next(), p.next(), p.next()) {
        (Some(dd), Some(mm), Some(yy)) => (format!("{yy}-{mm}-{dd}"), t.to_string()),
        _ => (String::new(), String::new()),
    }
}

fn valid_date(s: &str) -> bool {
    let p: Vec<&str> = s.split('-').collect();
    p.len() == 3
        && p[0].len() == 4
        && p[1].len() == 2
        && p[2].len() == 2
        && matches!(p[1].parse::<u32>(), Ok(1..=12))
        && matches!(p[2].parse::<u32>(), Ok(1..=31))
        && p[0].parse::<u32>().is_ok()
}

fn minutes_of(t: &str) -> Option<i64> {
    let (h, m) = t.split_once(':')?;
    let (h, m): (i64, i64) = (h.parse().ok()?, m.parse().ok()?);
    (h < 24 && m < 60 && t.len() == 5).then_some(h * 60 + m)
}

pub fn jadwal_payload(f: &JadwalForm) -> Result<Value, String> {
    if f.title.trim().is_empty() {
        return Err("Judul ujian wajib diisi!".into());
    }
    for (v, msg) in [
        (&f.subject_id, "Mata pelajaran wajib dipilih!"),
        (&f.type_id, "Jenis ujian wajib dipilih!"),
        (&f.year_id, "Tahun ajaran wajib dipilih!"),
    ] {
        if v.is_empty() {
            return Err(msg.into());
        }
    }
    if !valid_date(&f.date) {
        return Err("Tanggal harus berformat TTTT-BB-HH, mis. 2026-11-20.".into());
    }
    let (Some(a), Some(b)) = (minutes_of(&f.start), minutes_of(&f.end)) else {
        return Err("Jam harus berformat JJ:MM, mis. 07:30.".into());
    };
    if b <= a {
        return Err("Waktu selesai harus setelah waktu mulai!".into());
    }
    let duration: i64 = if f.duration.trim().is_empty() {
        b - a
    } else {
        f.duration
            .trim()
            .parse()
            .map_err(|_| "Durasi harus angka (menit)!".to_string())?
    };
    if duration < 1 {
        return Err("Durasi minimal 1 menit!".into());
    }
    if f.class_ids.is_empty() {
        return Err("Minimal pilih satu kelas!".into());
    }
    let mut v = json!({
        "title": f.title.trim(),
        "subjectId": f.subject_id,
        "examTypeId": f.type_id,
        "academicYearId": f.year_id,
        "startTime": format!("{}T{}:00+08:00", f.date, f.start),
        "endTime": format!("{}T{}:00+08:00", f.date, f.end),
        "duration": duration,
        "randomizeQuestions": f.randomize,
        "shuffleOptions": f.shuffle,
        "showResult": f.show_result,
        "status": if f.status.is_empty() { "PUBLISHED" } else { f.status.as_str() },
        "classes": f.class_ids,
    });
    if !f.supervisor_id.is_empty() {
        v["supervisorId"] = json!(f.supervisor_id);
    }
    if let Some(id) = &f.id {
        v["id"] = json!(id);
    }
    Ok(v)
}

pub fn jadwal_form(app: &mut App, ui: &mut egui::Ui) {
    let Some(mut f) = app.forms.jadwal.take() else {
        return;
    };
    let mut keep = true;
    if let Some(ok) = app.take_rpc("@form:jadwal") {
        f.busy = false;
        if ok {
            keep = false;
        }
    }
    ui.horizontal(|ui| {
        if ui.button("Kembali").clicked() {
            keep = false;
        }
        ui.label(
            RichText::new(if f.id.is_some() {
                "Ubah jadwal ujian"
            } else {
                "Buat jadwal ujian"
            })
            .strong(),
        );
    });
    ui.add_space(6.0);
    if let (false, Some(id)) = (f.loaded, f.id.clone()) {
        if let Some(e) = load(app, ui, &format!("admin/jadwal-item/{id}"), 5) {
            f.fill_from(&e);
        }
        app.forms.jadwal = if keep { Some(f) } else { None };
        return;
    }
    let Some(o) = load(app, ui, "options", 120) else {
        app.forms.jadwal = if keep { Some(f) } else { None };
        return;
    };
    let subjects = pairs_of(&o, "subjects", "name");
    let types = pairs_of(&o, "examTypes", "name");
    let years: Vec<(String, String)> = arr(o.get("academicYears").unwrap_or(&Value::Null))
        .iter()
        .map(|y| {
            (
                text(y, "id"),
                format!(
                    "{} - {}",
                    text(y, "year"),
                    crate::views::semester_label(&text(y, "semester"))
                ),
            )
        })
        .collect();
    let teachers = pairs_of(&o, "teachers", "name");
    let classes = pairs_of(&o, "classes", "name");
    if f.id.is_none() && f.year_id.is_empty() {
        if let Some(y) = arr(o.get("academicYears").unwrap_or(&Value::Null))
            .iter()
            .find(|y| crate::util::bool_of(y, "active"))
        {
            f.year_id = text(y, "id");
        }
    }
    let mut save = false;
    egui::ScrollArea::vertical().auto_shrink(false).show(ui, |ui| {
        theme::card(ui, |ui| {
            label(ui, "Judul ujian");
            ui.add(egui::TextEdit::singleline(&mut f.title).hint_text("mis. PAS Matematika Ganjil").desired_width(f32::INFINITY).margin(egui::vec2(8.0, 6.0)));
            ui.add_space(6.0);
            ui.horizontal_wrapped(|ui| {
                ui.vertical(|ui| {
                    label(ui, "Mata pelajaran");
                    pick(ui, "j-subject", &mut f.subject_id, &subjects, "Pilih");
                });
                ui.vertical(|ui| {
                    label(ui, "Jenis ujian");
                    pick(ui, "j-type", &mut f.type_id, &types, "Pilih");
                });
                ui.vertical(|ui| {
                    label(ui, "Tahun ajaran");
                    pick(ui, "j-year", &mut f.year_id, &years, "Pilih");
                });
                ui.vertical(|ui| {
                    label(ui, "Pengawas");
                    let mut with_none = vec![(String::new(), "(belum ada)".to_string())];
                    with_none.extend(teachers.clone());
                    pick(ui, "j-sup", &mut f.supervisor_id, &with_none, "(belum ada)");
                });
            });
        });
        ui.add_space(10.0);
        theme::card(ui, |ui| {
            ui.horizontal_wrapped(|ui| {
                ui.vertical(|ui| {
                    label(ui, "Tanggal (TTTT-BB-HH)");
                    ui.add(egui::TextEdit::singleline(&mut f.date).hint_text("2026-11-20").desired_width(130.0));
                });
                ui.vertical(|ui| {
                    label(ui, "Mulai (JJ:MM)");
                    ui.add(egui::TextEdit::singleline(&mut f.start).desired_width(70.0));
                });
                ui.vertical(|ui| {
                    label(ui, "Selesai (JJ:MM)");
                    ui.add(egui::TextEdit::singleline(&mut f.end).desired_width(70.0));
                });
                ui.vertical(|ui| {
                    label(ui, "Durasi (menit)");
                    ui.add(egui::TextEdit::singleline(&mut f.duration).desired_width(70.0));
                });
            });
            ui.label(RichText::new("Waktu dalam WITA. Siswa mulai kapan saja di antara jam mulai dan selesai.").size(12.0).color(GRAY));
            ui.add_space(6.0);
            ui.checkbox(&mut f.randomize, "Acak urutan soal");
            ui.checkbox(&mut f.shuffle, "Acak urutan pilihan jawaban");
            ui.checkbox(&mut f.show_result, "Tampilkan nilai ke siswa setelah selesai");
            ui.add_space(4.0);
            label(ui, "Status");
            let st: Vec<(String, String)> = [("DRAFT", "Draf"), ("PUBLISHED", "Terbit"), ("COMPLETED", "Selesai")].iter().map(|(a, b)| (a.to_string(), b.to_string())).collect();
            pick(ui, "j-status", &mut f.status, &st, "Terbit");
        });
        ui.add_space(10.0);
        theme::card(ui, |ui| {
            label(ui, "Kelas peserta");
            ui.horizontal_wrapped(|ui| {
                for (id, name) in &classes {
                    let mut on = f.class_ids.contains(id);
                    if ui.checkbox(&mut on, name).changed() {
                        if on {
                            f.class_ids.push(id.clone());
                        } else {
                            f.class_ids.retain(|c| c != id);
                        }
                    }
                }
            });
            ui.label(RichText::new("Soal diambil otomatis dari Bank Soal sesuai mapel, jenis ujian, dan kelas.").size(12.0).color(GRAY));
        });
        ui.add_space(10.0);
        if f.busy {
            ui.horizontal(|ui| {
                ui.spinner();
                ui.label("Menyimpan...");
            });
        } else if ui.add(theme::primary("Simpan jadwal")).clicked() {
            save = true;
        }
    });
    if save {
        match jadwal_payload(&f) {
            Ok(p) => {
                f.busy = true;
                let action = if f.id.is_some() {
                    "updateExam"
                } else {
                    "createExam"
                };
                if let Some(n) = app.net.clone() {
                    n.rpc(
                        "@form:jadwal\nadmin/jadwal",
                        json!({"action": action, "args": [p]}),
                    );
                }
            }
            Err(e) => app.push_toast(e, false),
        }
    }
    app.forms.jadwal = if keep { Some(f) } else { None };
}

// ───────────────────────── mapel ─────────────────────────

#[derive(Clone, Default)]
pub struct MapelForm {
    pub id: Option<String>,
    pub name: String,
    pub religion_id: String,
    pub rows: Vec<(String, String)>,
    pub busy: bool,
}

impl MapelForm {
    pub fn new(row: Option<&Value>) -> Self {
        match row {
            None => Self {
                rows: vec![(String::new(), String::new())],
                ..Default::default()
            },
            Some(r) => {
                let mut rows: Vec<(String, String)> = arr(r.get("plot").unwrap_or(&Value::Null))
                    .iter()
                    .map(|p| (text(p, "classId"), text(p, "teacherId")))
                    .collect();
                if rows.is_empty() {
                    rows.push((String::new(), String::new()));
                }
                Self {
                    id: Some(text(r, "id")),
                    name: text(r, "name"),
                    religion_id: text(r, "religionId"),
                    rows,
                    busy: false,
                }
            }
        }
    }
}

/// Muatan formulir untuk createSubject/updateSubject.
pub fn mapel_form_body(f: &MapelForm) -> Result<Value, String> {
    if f.name.trim().is_empty() {
        return Err("Nama mata pelajaran wajib diisi!".into());
    }
    let mut seen = HashSet::new();
    let mut plot = Vec::new();
    for (c, t) in &f.rows {
        if c.is_empty() || t.is_empty() {
            return Err("Setiap baris harus memilih kelas dan guru!".into());
        }
        if !seen.insert(c.clone()) {
            return Err("Satu kelas hanya boleh punya satu guru untuk mapel ini!".into());
        }
        plot.push(json!({"classId": c, "teacherId": t}));
    }
    if plot.is_empty() {
        return Err("Minimal satu pengampu!".into());
    }
    let mut form = json!({"name": f.name.trim(), "religionId": f.religion_id, "assignments": serde_json::to_string(&plot).unwrap_or_default()});
    if let Some(id) = &f.id {
        form["id"] = json!(id);
    }
    Ok(
        json!({"action": if f.id.is_some() { "updateSubject" } else { "createSubject" }, "form": form}),
    )
}

pub fn mapel_form(app: &mut App, ui: &mut egui::Ui) {
    let Some(mut f) = app.forms.mapel.take() else {
        return;
    };
    let mut keep = true;
    if let Some(ok) = app.take_rpc("@form:mapel") {
        f.busy = false;
        if ok {
            keep = false;
        }
    }
    ui.horizontal(|ui| {
        if ui.button("Kembali").clicked() {
            keep = false;
        }
        ui.label(
            RichText::new(if f.id.is_some() {
                "Ubah mata pelajaran"
            } else {
                "Tambah mata pelajaran"
            })
            .strong(),
        );
    });
    ui.add_space(6.0);
    let Some(o) = load(app, ui, "options", 120) else {
        app.forms.mapel = if keep { Some(f) } else { None };
        return;
    };
    let classes = pairs_of(&o, "classes", "name");
    let teachers = pairs_of(&o, "teachers", "name");
    let mut religions = vec![(String::new(), "Umum (semua siswa)".to_string())];
    religions.extend(pairs_of(&o, "religions", "name"));
    let mut save = false;
    egui::ScrollArea::vertical()
        .auto_shrink(false)
        .show(ui, |ui| {
            theme::card(ui, |ui| {
                label(ui, "Nama mata pelajaran");
                ui.add(
                    egui::TextEdit::singleline(&mut f.name)
                        .desired_width(360.0)
                        .margin(egui::vec2(8.0, 6.0)),
                );
                ui.add_space(6.0);
                label(ui, "Khusus agama");
                pick(
                    ui,
                    "m-rel",
                    &mut f.religion_id,
                    &religions,
                    "Umum (semua siswa)",
                );
            });
            ui.add_space(10.0);
            theme::card(ui, |ui| {
                label(ui, "Guru pengampu per kelas");
                let mut remove = None;
                let n = f.rows.len();
                for (i, (c, t)) in f.rows.iter_mut().enumerate() {
                    ui.horizontal(|ui| {
                        pick(ui, &format!("m-c{i}"), c, &classes, "Pilih kelas");
                        pick(ui, &format!("m-t{i}"), t, &teachers, "Pilih guru");
                        if n > 1 && theme::row_button(ui, "Hapus", true) {
                            remove = Some(i);
                        }
                    });
                }
                if let Some(i) = remove {
                    f.rows.remove(i);
                }
                if ui.button("+ Tambah baris").clicked() {
                    f.rows.push((String::new(), String::new()));
                }
            });
            ui.add_space(10.0);
            if f.busy {
                ui.horizontal(|ui| {
                    ui.spinner();
                    ui.label("Menyimpan...");
                });
            } else if ui.add(theme::primary("Simpan")).clicked() {
                save = true;
            }
        });
    if save {
        match mapel_form_body(&f) {
            Ok(body) => {
                f.busy = true;
                if let Some(n) = app.net.clone() {
                    n.rpc("@form:mapel\nadmin/mapel", body);
                }
            }
            Err(e) => app.push_toast(e, false),
        }
    }
    app.forms.mapel = if keep { Some(f) } else { None };
}

// ───────────────────────── impor siswa ─────────────────────────

#[derive(Default)]
pub struct ImportState {
    pub file: Option<PathBuf>,
    pub rows: Vec<[String; 4]>,
    pub error: Option<String>,
    pub busy: bool,
}

pub fn cell_string(c: &calamine::Data) -> String {
    use calamine::Data;
    match c {
        Data::Empty => String::new(),
        Data::String(s) => s.trim().to_string(),
        Data::Float(f) if f.fract() == 0.0 => format!("{}", *f as i64),
        Data::Float(f) => f.to_string(),
        Data::Int(i) => i.to_string(),
        other => other.to_string().trim().to_string(),
    }
}

/// Baca xlsx: kolom NISN, Nama, Kelas, Agama; baris pertama judul. Baris tanpa NISN/Nama/Kelas dilewati.
pub fn read_students(path: &std::path::Path) -> Result<Vec<[String; 4]>, String> {
    use calamine::{open_workbook_auto, Reader};
    let mut wb =
        open_workbook_auto(path).map_err(|e| format!("Berkas Excel tidak bisa dibuka ({e})"))?;
    let name = wb
        .sheet_names()
        .first()
        .cloned()
        .ok_or("Berkas tidak punya lembar.")?;
    let range = wb
        .worksheet_range(&name)
        .map_err(|e| format!("Lembar tidak terbaca ({e})"))?;
    let rows: Vec<[String; 4]> = range
        .rows()
        .skip(1)
        .map(|r| {
            let g = |i: usize| r.get(i).map(cell_string).unwrap_or_default();
            [g(0), g(1), g(2), g(3)]
        })
        .filter(|r| !r[0].is_empty() && !r[1].is_empty() && !r[2].is_empty())
        .collect();
    if rows.is_empty() {
        return Err(
            "Tidak ada data siswa yang valid. Pastikan kolom NISN, Nama, dan Kelas terisi.".into(),
        );
    }
    Ok(rows)
}

pub fn write_template(path: &std::path::Path) -> Result<(), String> {
    let mut wb = rust_xlsxwriter::Workbook::new();
    let ws = wb.add_worksheet();
    for (i, h) in ["NISN", "Nama", "Kelas", "Agama"].iter().enumerate() {
        ws.write(0, i as u16, *h).map_err(|e| e.to_string())?;
    }
    for (i, v) in ["0012345678", "Budi Santoso", "X RPL 1", "Islam"]
        .iter()
        .enumerate()
    {
        ws.write(1, i as u16, *v).map_err(|e| e.to_string())?;
    }
    ws.set_column_width(1, 28).map_err(|e| e.to_string())?;
    wb.save(path).map_err(|e| e.to_string())
}

impl ImportState {
    pub fn load(&mut self, p: &std::path::Path) {
        match read_students(p) {
            Ok(rows) => {
                self.rows = rows;
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

pub fn import_panel(app: &mut App, ui: &mut egui::Ui) {
    let Some(mut st) = app.forms.import.take() else {
        return;
    };
    let mut keep = true;
    if let Some(ok) = app.take_rpc("@form:import") {
        st.busy = false;
        if ok {
            keep = false;
        }
    }
    theme::card(ui, |ui| {
        ui.horizontal(|ui| {
            ui.label(RichText::new("Impor siswa dari Excel").strong());
            if ui.button("Tutup").clicked() {
                keep = false;
            }
        });
        ui.label(RichText::new("Kolom: NISN, Nama, Kelas, Agama (baris pertama judul). Nama kelas & agama harus sama dengan data di sistem.").size(12.5).color(GRAY));
        ui.horizontal(|ui| {
            if ui.button("Unduh template").clicked() {
                let mut p = crate::export::downloads_dir();
                p.push("Template_Impor_Siswa.xlsx");
                match write_template(&p) {
                    Ok(_) => app.push_toast(format!("Template tersimpan: {}", p.display()), true),
                    Err(e) => app.push_toast(e, false),
                }
            }
            if ui.button("Pilih berkas Excel...").clicked() {
                if let Some(p) = pick_file("Pilih berkas Excel siswa", &["xlsx", "xls"]) {
                    st.load(&p);
                } else if !cfg!(any(windows, target_os = "linux")) {
                    app.push_toast("Seret berkas .xlsx ke jendela aplikasi.", true);
                }
            }
            ui.label(
                RichText::new("atau seret berkas .xlsx ke jendela ini")
                    .size(12.5)
                    .color(GRAY),
            );
        });
        if let Some(e) = &st.error {
            ui.colored_label(RED, e);
        }
        if !st.rows.is_empty() {
            ui.add_space(6.0);
            ui.label(format!(
                "{} baris siap diimpor dari {}",
                st.rows.len(),
                st.file
                    .as_ref()
                    .and_then(|p| p.file_name())
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default()
            ));
            egui::Grid::new("imp-prev")
                .striped(true)
                .spacing(theme::GRID_SPACING)
                .show(ui, |ui| {
                    for h in ["NISN", "Nama", "Kelas", "Agama"] {
                        theme::th(ui, h);
                    }
                    ui.end_row();
                    for r in st.rows.iter().take(8) {
                        for c in r {
                            ui.label(c);
                        }
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
                .add(theme::primary(&format!("Impor {} siswa", st.rows.len())))
                .clicked()
            {
                st.busy = true;
                let data: Vec<Value> = st.rows.iter().map(|r| json!({"nisn": r[0], "name": r[1], "className": r[2], "religion": r[3]})).collect();
                if let Some(n) = app.net.clone() {
                    n.rpc(
                        "@form:import\nadmin/siswa\nadmin/kenaikan",
                        json!({"action": "importStudents", "args": [data]}),
                    );
                }
            }
        }
    });
    ui.add_space(10.0);
    app.forms.import = if keep { Some(st) } else { None };
}

// ───────────────────────── koreksi esai ─────────────────────────

#[derive(Clone, Default)]
pub struct KoreksiForm {
    pub attempt_id: String,
    pub scores: std::collections::HashMap<String, String>,
    pub loaded: bool,
    pub busy: bool,
}

/// Teks jawaban siswa yang mudah dibaca.
pub fn answer_text(v: Option<&Value>) -> String {
    match v {
        None | Some(Value::Null) => "(tidak dijawab)".into(),
        Some(Value::String(s)) => strip_html(s),
        Some(Value::Array(a)) => a
            .iter()
            .map(|x| x.as_str().map(strip_html).unwrap_or_else(|| x.to_string()))
            .collect::<Vec<_>>()
            .join(", "),
        Some(other) => other.to_string(),
    }
}

fn is_correct(kind: &str, key: &str, ans: Option<&Value>) -> Option<bool> {
    match (kind, ans) {
        ("MULTIPLE_CHOICE" | "TRUE_FALSE", Some(Value::String(s))) => Some(s == key),
        ("MULTIPLE_CHOICE_COMPLEX", Some(Value::Array(a))) => {
            let mut got: Vec<String> = a
                .iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect();
            let mut want: Vec<String> = key.split(',').map(|s| s.trim().to_string()).collect();
            got.sort();
            want.sort();
            Some(got == want)
        }
        ("MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_CHOICE_COMPLEX", None) => Some(false),
        _ => None,
    }
}

pub fn koreksi_form(app: &mut App, ui: &mut egui::Ui) {
    let Some(mut f) = app.forms.koreksi.take() else {
        return;
    };
    let mut keep = true;
    if let Some(ok) = app.take_rpc("@form:koreksi") {
        f.busy = false;
        if ok {
            keep = false;
        }
    }
    if ui.button("Kembali").clicked() {
        keep = false;
    }
    let path = format!("penilaian/attempt/{}", f.attempt_id);
    let Some(d) = load(app, ui, &path, 5) else {
        app.forms.koreksi = if keep { Some(f) } else { None };
        return;
    };
    if !f.loaded {
        if let Some(Value::Object(m)) = d.get("essayScores") {
            for (k, v) in m {
                f.scores
                    .insert(k.clone(), crate::util::path_text(&json!({"x": v}), "x"));
            }
        }
        f.loaded = true;
    }
    ui.label(
        RichText::new(format!(
            "{} · {} ({})",
            text(&d, "exam")
                .is_empty()
                .then(|| String::new())
                .unwrap_or_else(|| path_text(&d, "exam.title")),
            path_text(&d, "student.name"),
            path_text(&d, "student.className")
        ))
        .strong(),
    );
    ui.label(RichText::new(format!("Nilai saat ini: {}", path_text(&d, "score"))).color(GRAY));
    let answers = d.get("answers").cloned().unwrap_or(Value::Null);
    let mut save = false;
    egui::ScrollArea::vertical()
        .auto_shrink(false)
        .show(ui, |ui| {
            for (i, q) in arr(d.get("questions").unwrap_or(&Value::Null))
                .iter()
                .enumerate()
            {
                let (qid, kind) = (text(q, "id"), text(q, "type"));
                let ans = answers.get(&qid);
                theme::card(ui, |ui| {
                    ui.set_width(ui.available_width());
                    ui.horizontal(|ui| {
                        ui.label(
                            RichText::new(format!("Soal {}", i + 1))
                                .strong()
                                .color(TEAL),
                        );
                        ui.label(
                            RichText::new(format!("bobot {}", path_text(q, "score"))).color(GRAY),
                        );
                    });
                    ui.label(strip_html(&text(q, "text")));
                    ui.add_space(4.0);
                    ui.label(RichText::new("Jawaban siswa").size(12.0).color(GRAY));
                    ui.label(RichText::new(answer_text(ans)).strong());
                    if kind == "ESSAY" {
                        ui.label(RichText::new("Kunci / rubrik").size(12.0).color(GRAY));
                        ui.label(strip_html(&text(q, "correctAnswer")));
                        ui.horizontal(|ui| {
                            ui.label("Nilai:");
                            let e = f.scores.entry(qid.clone()).or_default();
                            ui.add(egui::TextEdit::singleline(e).desired_width(60.0));
                            ui.label(
                                RichText::new(format!("dari {}", path_text(q, "score")))
                                    .color(GRAY),
                            );
                        });
                    } else {
                        match is_correct(&kind, &text(q, "correctAnswer"), ans) {
                            Some(true) => theme::pill(ui, "Benar", theme::GREEN),
                            Some(false) => {
                                theme::pill(ui, "Salah", RED);
                                ui.label(
                                    RichText::new(format!("Kunci: {}", text(q, "correctAnswer")))
                                        .size(12.5)
                                        .color(GRAY),
                                );
                            }
                            None => {}
                        }
                    }
                });
                ui.add_space(8.0);
            }
            if f.busy {
                ui.horizontal(|ui| {
                    ui.spinner();
                    ui.label("Menyimpan...");
                });
            } else if ui.add(theme::primary("Simpan nilai")).clicked() {
                save = true;
            }
        });
    if save {
        let scores: serde_json::Map<String, Value> = f
            .scores
            .iter()
            .filter(|(_, v)| !v.trim().is_empty())
            .map(|(k, v)| (k.clone(), json!(v.trim().replace(',', "."))))
            .collect();
        let (subject, exam) = (path_text(&d, "exam.subjectId"), path_text(&d, "exam.id"));
        f.busy = true;
        if let Some(n) = app.net.clone() {
            n.rpc(
                &format!("@form:koreksi\npenilaian/{exam}\n{path}"),
                json!({"action": "simpanKoreksi", "args": [subject, exam, f.attempt_id, scores]}),
            );
        }
    }
    app.forms.koreksi = if keep { Some(f) } else { None };
}

// ───────────────────────── kenaikan kelas ─────────────────────────

#[derive(Default)]
pub struct KenaikanState {
    pub class_id: String,
    pub selected: HashSet<String>,
    pub graduate: bool,
    pub target: String,
}

pub fn kenaikan_body(ids: &[String], graduate: bool, target: &str) -> Result<Value, String> {
    if ids.is_empty() {
        return Err("Pilih siswa terlebih dahulu!".into());
    }
    if !graduate && target.is_empty() {
        return Err("Pilih kelas tujuan!".into());
    }
    Ok(
        json!({"action": "prosesKenaikanKelas", "args": [ids, if graduate { "LULUS" } else { "NAIK_KELAS" }, if graduate { Value::Null } else { json!(target) }]}),
    )
}

pub fn kenaikan(app: &mut App, ui: &mut egui::Ui) {
    let Some(d) = load(app, ui, "admin/kenaikan", 20) else {
        return;
    };
    let mut st = std::mem::take(&mut app.forms.kenaikan);
    if let Some(true) = app.take_rpc("@form:kenaikan") {
        st.selected.clear();
    }
    let classes = pairs_of(&d, "classes", "name");
    if st.class_id.is_empty() {
        if let Some((id, _)) = classes.first() {
            st.class_id = id.clone();
        }
    }
    let students: Vec<&Value> = arr(d.get("students").unwrap_or(&Value::Null))
        .iter()
        .filter(|s| text(s, "classId") == st.class_id)
        .collect();
    theme::card(ui, |ui| {
        ui.horizontal_wrapped(|ui| {
            ui.vertical(|ui| {
                label(ui, "Dari kelas");
                let before = st.class_id.clone();
                pick(ui, "k-from", &mut st.class_id, &classes, "Pilih kelas");
                if before != st.class_id {
                    st.selected.clear();
                }
            });
            ui.vertical(|ui| {
                label(ui, "Tindakan");
                ui.horizontal(|ui| {
                    ui.radio_value(&mut st.graduate, false, "Naik kelas");
                    ui.radio_value(&mut st.graduate, true, "Luluskan");
                });
            });
            if !st.graduate {
                ui.vertical(|ui| {
                    label(ui, "Kelas tujuan");
                    pick(ui, "k-to", &mut st.target, &classes, "Pilih kelas tujuan");
                });
            }
        });
        ui.label(
            RichText::new("Tip: unduh Arsip & Cadangan dulu sebelum meluluskan siswa.")
                .size(12.5)
                .color(GRAY),
        );
    });
    ui.add_space(10.0);
    theme::card(ui, |ui| {
        ui.horizontal(|ui| {
            let all = !students.is_empty()
                && students
                    .iter()
                    .all(|s| st.selected.contains(&text(s, "id")));
            let mut a = all;
            if ui
                .checkbox(&mut a, format!("Pilih semua ({} siswa)", students.len()))
                .changed()
            {
                for s in &students {
                    if a {
                        st.selected.insert(text(s, "id"));
                    } else {
                        st.selected.remove(&text(s, "id"));
                    }
                }
            }
            ui.label(RichText::new(format!("{} dipilih", st.selected.len())).color(GRAY));
        });
        egui::ScrollArea::vertical()
            .max_height(ui.available_height().max(160.0) - 70.0)
            .show(ui, |ui| {
                for s in &students {
                    let id = text(s, "id");
                    let mut on = st.selected.contains(&id);
                    if ui
                        .checkbox(
                            &mut on,
                            format!("{}  ·  {}", text(s, "name"), text(s, "nisn")),
                        )
                        .changed()
                    {
                        if on {
                            st.selected.insert(id);
                        } else {
                            st.selected.remove(&id);
                        }
                    }
                }
            });
    });
    ui.add_space(8.0);
    let label_btn = if st.graduate {
        format!("Luluskan {} siswa", st.selected.len())
    } else {
        format!("Naikkan {} siswa", st.selected.len())
    };
    let danger = st.graduate;
    let btn = if danger {
        theme::danger(&label_btn)
    } else {
        theme::primary(&label_btn)
    };
    if ui.add(btn).clicked() {
        let ids: Vec<String> = st.selected.iter().cloned().collect();
        match kenaikan_body(&ids, st.graduate, &st.target) {
            Ok(body) => {
                let msg = if st.graduate {
                    format!(
                        "Luluskan {} siswa? Siswa yang lulus tidak tampil di daftar aktif.",
                        ids.len()
                    )
                } else {
                    format!("Pindahkan {} siswa ke kelas tujuan?", ids.len())
                };
                ask(
                    app,
                    &msg,
                    body,
                    &[
                        "@form:kenaikan",
                        "admin/kenaikan",
                        "admin/siswa",
                        "admin/kelas",
                    ],
                );
            }
            Err(e) => app.push_toast(e, false),
        }
    }
    app.forms.kenaikan = st;
}

#[cfg(test)]
mod tests {
    use super::*;

    fn soal() -> SoalForm {
        let mut f = SoalForm::new("sub1", "Informatika", None);
        f.type_id = "t1".into();
        f.class_ids = vec!["c1".into()];
        f.text = "Apa itu <b>CPU</b>?".into();
        f
    }

    #[test]
    fn soal_pilihan_ganda() {
        let mut f = soal();
        f.opts[0] = "Otak komputer".into();
        f.opts[1] = "Layar".into();
        f.single = 1;
        let p = soal_payload(&f).unwrap();
        assert_eq!(p["correctAnswer"], "B");
        assert_eq!(p["options"].as_array().unwrap().len(), 2);
        assert_eq!(p["text"], "<p>Apa itu <b>CPU</b>?</p>");
        f.single = 3; // opsi D kosong
        assert!(soal_payload(&f).is_err());
    }

    #[test]
    fn soal_kompleks_tf_esai_menjodohkan() {
        let mut f = soal();
        f.kind = "MULTIPLE_CHOICE_COMPLEX".into();
        f.opts[0] = "a".into();
        f.opts[1] = "b".into();
        f.opts[2] = "c".into();
        assert!(soal_payload(&f).is_err());
        f.multi = [true, false, true, false, false];
        assert_eq!(soal_payload(&f).unwrap()["correctAnswer"], "A,C");

        f.kind = "TRUE_FALSE".into();
        f.tf_true = false;
        assert_eq!(soal_payload(&f).unwrap()["correctAnswer"], "SALAH");

        f.kind = "ESSAY".into();
        assert!(soal_payload(&f).is_err());
        f.essay_key = "Jawaban rubrik".into();
        assert_eq!(
            soal_payload(&f).unwrap()["correctAnswer"],
            "<p>Jawaban rubrik</p>"
        );

        f.kind = "MATCHING".into();
        f.pairs = vec![
            Pair {
                left: "1".into(),
                right: "satu".into(),
                point: "3".into(),
            },
            Pair {
                left: "2".into(),
                right: "dua".into(),
                point: "4".into(),
            },
        ];
        let p = soal_payload(&f).unwrap();
        assert_eq!(p["score"], 7);
        assert_eq!(p["options"]["right"].as_array().unwrap().len(), 2);
        let key: Value = serde_json::from_str(p["correctAnswer"].as_str().unwrap()).unwrap();
        assert_eq!(key[1]["point"], 4);
    }

    #[test]
    fn soal_validasi_dasar() {
        let mut f = soal();
        f.text = "  ".into();
        assert!(soal_payload(&f).is_err());
        let mut f = soal();
        f.class_ids.clear();
        assert!(soal_payload(&f).is_err());
    }

    #[test]
    fn soal_dimuat_lalu_dikirim_ulang() {
        let q = json!({"type":"MULTIPLE_CHOICE_COMPLEX","typeId":"t1","score":10,"text":"<p>Pilih <strong>dua</strong></p>",
            "classIds":["c1"],"correctAnswer":"A,C","options":[{"id":"A","text":"<p>x</p>"},{"id":"B","text":"<p>y</p>"},{"id":"C","text":"<p>z</p>"}]});
        let mut f = SoalForm::new("sub1", "M", Some("q1".into()));
        f.fill_from(&q);
        assert_eq!(f.text, "Pilih <b>dua</b>");
        assert_eq!(f.multi, [true, false, true, false, false]);
        let p = soal_payload(&f).unwrap();
        assert_eq!(p["correctAnswer"], "A,C");
        assert_eq!(p["options"][2]["text"], "<p>z</p>");
    }

    fn jadwal() -> JadwalForm {
        let mut f = JadwalForm::new(None);
        f.title = "PAS".into();
        f.subject_id = "s".into();
        f.type_id = "t".into();
        f.year_id = "y".into();
        f.date = "2026-11-20".into();
        f.class_ids = vec!["c".into()];
        f
    }

    #[test]
    fn jadwal_payload_wita_dan_validasi() {
        let p = jadwal_payload(&jadwal()).unwrap();
        assert_eq!(p["startTime"], "2026-11-20T07:30:00+08:00");
        assert_eq!(p["endTime"], "2026-11-20T09:30:00+08:00");
        assert_eq!(p["duration"], 90);
        assert!(p.get("supervisorId").is_none());
        let mut f = jadwal();
        f.date = "20-11-2026".into();
        assert!(jadwal_payload(&f).is_err());
        let mut f = jadwal();
        f.end = "07:00".into();
        assert!(jadwal_payload(&f).is_err());
        let mut f = jadwal();
        f.duration = String::new();
        assert_eq!(jadwal_payload(&f).unwrap()["duration"], 120);
        f.supervisor_id = "g1".into();
        f.id = Some("e1".into());
        let p = jadwal_payload(&f).unwrap();
        assert_eq!(p["supervisorId"], "g1");
        assert_eq!(p["id"], "e1");
    }

    #[test]
    fn jadwal_dimuat_dalam_wita() {
        let mut f = JadwalForm::new(Some("e1".into()));
        f.fill_from(&json!({"title":"UH","startTime":"2026-11-20T23:30:00.000Z","endTime":"2026-11-21T01:00:00.000Z","duration":60,"classIds":["c1"],"status":"PUBLISHED"}));
        assert_eq!(f.date, "2026-11-21");
        assert_eq!(f.start, "07:30");
        assert_eq!(f.end, "09:00");
    }

    #[test]
    fn mapel_plot() {
        let mut f = MapelForm::new(None);
        f.name = "Informatika".into();
        assert!(mapel_form_body(&f).is_err());
        f.rows = vec![("c1".into(), "g1".into()), ("c2".into(), "g1".into())];
        let b = mapel_form_body(&f).unwrap();
        assert_eq!(b["action"], "createSubject");
        let plot: Value = serde_json::from_str(b["form"]["assignments"].as_str().unwrap()).unwrap();
        assert_eq!(plot.as_array().unwrap().len(), 2);
        f.rows.push(("c1".into(), "g2".into()));
        assert!(mapel_form_body(&f).is_err());
    }

    #[test]
    fn kenaikan_muatan() {
        assert!(kenaikan_body(&[], true, "").is_err());
        assert!(kenaikan_body(&["a".into()], false, "").is_err());
        let b = kenaikan_body(&["a".into()], false, "c2").unwrap();
        assert_eq!(b["args"][1], "NAIK_KELAS");
        assert_eq!(b["args"][2], "c2");
        assert_eq!(
            kenaikan_body(&["a".into()], true, "").unwrap()["args"][1],
            "LULUS"
        );
    }

    #[test]
    fn impor_excel_dibaca() {
        let dir = std::env::temp_dir().join(format!("ujiin-imp-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let p = dir.join("s.xlsx");
        write_template(&p).unwrap();
        let rows = read_students(&p).unwrap();
        assert_eq!(
            rows,
            vec![[
                "0012345678".to_string(),
                "Budi Santoso".into(),
                "X RPL 1".into(),
                "Islam".into()
            ]]
        );
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn jawaban_dinilai() {
        assert_eq!(
            is_correct("MULTIPLE_CHOICE", "B", Some(&json!("B"))),
            Some(true)
        );
        assert_eq!(
            is_correct("MULTIPLE_CHOICE_COMPLEX", "A,C", Some(&json!(["C", "A"]))),
            Some(true)
        );
        assert_eq!(is_correct("MULTIPLE_CHOICE", "B", None), Some(false));
        assert_eq!(is_correct("ESSAY", "x", Some(&json!("y"))), None);
        assert_eq!(answer_text(Some(&json!(["A", "B"]))), "A, B");
    }
}
