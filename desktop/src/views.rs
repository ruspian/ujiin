use crate::app::{App, Confirm, Tab};
use crate::export::{self, Sheet};
use crate::util::{self, bool_of, fmt_iso_wita, i64_of, path_text, strip_html, text};
use eframe::egui::{self, Color32, RichText};
use serde_json::{json, Value};
use std::sync::Arc;

use crate::theme::{self, AMBER, GRAY, GREEN, RED, TEAL};

// ───────────────────────── login ─────────────────────────

/// Kredit pembuat, digambar di tengah `rect` (hati digambar sendiri karena font bawaan tidak punya emoji).
fn credit_in(ui: &egui::Ui, rect: egui::Rect, color: Color32, size: f32) {
    let p = ui.painter();
    let font = egui::FontId::proportional(size);
    let a = p.layout_no_wrap("Dibuat dengan".into(), font.clone(), color);
    let b = p.layout_no_wrap("oleh Ruspian Majid".into(), font, color);
    let s = size * 0.3;
    let (gap, hw) = (size * 0.35, s * 3.5);
    let total = a.size().x + gap + hw + gap + b.size().x;
    let mut x = rect.center().x - total / 2.0;
    let y = rect.center().y;
    p.galley(egui::pos2(x, y - a.size().y / 2.0), a.clone(), color);
    x += a.size().x + gap;
    let orange = Color32::from_rgb(249, 115, 22);
    let (cx, cy) = (x + hw / 2.0, y - s * 0.9);
    p.circle_filled(egui::pos2(cx - s * 0.9, cy), s, orange);
    p.circle_filled(egui::pos2(cx + s * 0.9, cy), s, orange);
    p.add(egui::Shape::convex_polygon(
        vec![
            egui::pos2(cx - s * 1.78, cy + s * 0.35),
            egui::pos2(cx + s * 1.78, cy + s * 0.35),
            egui::pos2(cx, cy + s * 2.5),
        ],
        orange,
        egui::Stroke::NONE,
    ));
    x += hw + gap;
    p.galley(egui::pos2(x, y - b.size().y / 2.0), b, color);
}

fn credit(ui: &mut egui::Ui, color: Color32) {
    let (rect, _) =
        ui.allocate_exact_size(egui::vec2(ui.available_width(), 16.0), egui::Sense::hover());
    credit_in(ui, rect, color, 11.5);
}

pub fn login(app: &mut App, ui: &mut egui::Ui) {
    egui::CentralPanel::default_margins().show(ui, |ui| {
        let r = ui.max_rect();
        let strip = egui::Rect::from_center_size(
            egui::pos2(r.center().x, r.bottom() - 16.0),
            egui::vec2(r.width(), 16.0),
        );
        credit_in(ui, strip, GRAY, 12.0);
        ui.vertical_centered(|ui| {
            ui.add_space((ui.available_height() / 2.0 - 250.0).max(16.0));
            // logo sederhana
            let (rect, _) = ui.allocate_exact_size(egui::vec2(64.0, 64.0), egui::Sense::hover());
            ui.painter().rect_filled(rect, 18.0, TEAL);
            ui.painter().text(
                rect.center(),
                egui::Align2::CENTER_CENTER,
                "U",
                egui::FontId::proportional(38.0),
                Color32::WHITE,
            );
            ui.add_space(10.0);
            ui.label(
                RichText::new("Ujiin Guru")
                    .size(30.0)
                    .strong()
                    .color(theme::INK),
            );
            ui.label(RichText::new("Aplikasi desktop untuk guru & admin").color(GRAY));
            ui.add_space(18.0);
            ui.scope(|ui| {
                ui.set_max_width(380.0);
                theme::card(ui, |ui| {
                    ui.set_width(348.0);
                    ui.with_layout(egui::Layout::top_down(egui::Align::Min), |ui| {
                        field_label(ui, "Alamat server");
                        ui.add(
                            egui::TextEdit::singleline(&mut app.server)
                                .hint_text("mis. ujian.sekolah.sch.id")
                                .margin(egui::vec2(8.0, 7.0))
                                .desired_width(f32::INFINITY),
                        );
                        field_label(ui, "Username");
                        ui.add(
                            egui::TextEdit::singleline(&mut app.username)
                                .margin(egui::vec2(8.0, 7.0))
                                .desired_width(f32::INFINITY),
                        );
                        field_label(ui, "Password");
                        let pw = ui.add(
                            egui::TextEdit::singleline(&mut app.password)
                                .password(true)
                                .margin(egui::vec2(8.0, 7.0))
                                .desired_width(f32::INFINITY),
                        );
                        let enter =
                            pw.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter));
                        ui.add_space(10.0);
                        if app.logging_in {
                            ui.horizontal(|ui| {
                                ui.spinner();
                                ui.label("Masuk...");
                            });
                        } else if ui
                            .add_sized([ui.available_width(), 38.0], theme::primary("Masuk"))
                            .clicked()
                            || enter
                        {
                            app.start_login();
                        }
                        if !app.login_err.is_empty() {
                            ui.add_space(8.0);
                            egui::Frame::new()
                                .fill(Color32::from_rgb(254, 242, 242))
                                .corner_radius(egui::CornerRadius::same(8))
                                .inner_margin(egui::Margin::same(8))
                                .show(ui, |ui| {
                                    ui.set_width(ui.available_width());
                                    ui.colored_label(RED, &app.login_err);
                                });
                        }
                    });
                });
            });
        });
    });
}

fn field_label(ui: &mut egui::Ui, text: &str) {
    ui.add_space(4.0);
    ui.label(RichText::new(text).size(13.0).strong().color(GRAY));
}

// ───────────────────────── kerangka ─────────────────────────

pub fn shell(app: &mut App, ui: &mut egui::Ui) {
    let name = app
        .user
        .as_ref()
        .map(|u| text(u, "name"))
        .unwrap_or_default();
    let role = app
        .user
        .as_ref()
        .map(|u| text(u, "role"))
        .unwrap_or_default();

    egui::Panel::left("nav")
        .resizable(false)
        .exact_size(224.0)
        .frame(
            egui::Frame::new()
                .fill(theme::SIDEBAR)
                .inner_margin(egui::Margin::same(14)),
        )
        .show(ui, |ui| {
            ui.add_space(4.0);
            ui.horizontal(|ui| {
                let (rect, _) =
                    ui.allocate_exact_size(egui::vec2(34.0, 34.0), egui::Sense::hover());
                ui.painter().rect_filled(rect, 10.0, TEAL);
                ui.painter().text(
                    rect.center(),
                    egui::Align2::CENTER_CENTER,
                    "U",
                    egui::FontId::proportional(21.0),
                    Color32::WHITE,
                );
                ui.vertical(|ui| {
                    ui.spacing_mut().item_spacing.y = 0.0;
                    ui.label(
                        RichText::new("Ujiin")
                            .size(18.0)
                            .strong()
                            .color(Color32::WHITE),
                    );
                    ui.label(
                        RichText::new("Aplikasi Guru")
                            .size(12.0)
                            .color(theme::SIDEBAR_TEXT),
                    );
                });
            });
            ui.add_space(14.0);
            // profil singkat
            egui::Frame::new()
                .fill(theme::SIDEBAR_HOVER)
                .corner_radius(egui::CornerRadius::same(10))
                .inner_margin(egui::Margin::symmetric(10, 8))
                .show(ui, |ui| {
                    ui.set_width(ui.available_width());
                    ui.spacing_mut().item_spacing.y = 1.0;
                    ui.label(RichText::new(&name).strong().color(Color32::WHITE));
                    ui.label(
                        RichText::new(if role == "ADMIN" {
                            "Administrator"
                        } else {
                            "Guru"
                        })
                        .size(12.5)
                        .color(theme::SIDEBAR_TEXT),
                    );
                });
            ui.add_space(6.0);
            ui.spacing_mut().item_spacing.y = 1.0;
            let bottom_h = 2.0 * 36.0 + 34.0;
            egui::ScrollArea::vertical()
                .auto_shrink(false)
                .max_height((ui.available_height() - bottom_h).max(120.0))
                .show(ui, |ui| {
                    let mut section = "";
                    for t in app.tabs() {
                        let group = tab_group(t);
                        if group != section {
                            section = group;
                            ui.add_space(8.0);
                            ui.label(
                                RichText::new(group)
                                    .size(11.0)
                                    .strong()
                                    .color(Color32::from_rgb(100, 125, 135)),
                            );
                            ui.add_space(2.0);
                        }
                        if nav_item(ui, t.title(), app.tab == t) {
                            app.change_tab(t);
                        }
                    }
                });
            ui.add_space((ui.available_height() - bottom_h + 10.0).max(4.0));
            if nav_item(ui, "Buka versi web", false) {
                if let Some(n) = &app.net {
                    n.open_web("/dashboard");
                }
            }
            if nav_item(ui, "Keluar", false) {
                app.logout();
            }
            ui.add_space(6.0);
            credit(ui, theme::SIDEBAR_TEXT);
        });

    egui::CentralPanel::default()
        .frame(
            egui::Frame::new()
                .fill(theme::BG)
                .inner_margin(egui::Margin::symmetric(24, 18)),
        )
        .show(ui, |ui| {
            theme::page_header(ui, app.tab.title(), tab_hint(app.tab));
            if app.forms.soal.is_some() {
                return crate::forms::soal_form(app, ui);
            }
            if app.forms.jadwal.is_some() {
                return crate::forms::jadwal_form(app, ui);
            }
            if app.forms.mapel.is_some() {
                return crate::forms::mapel_form(app, ui);
            }
            if app.forms.koreksi.is_some() {
                return crate::forms::koreksi_form(app, ui);
            }
            match app.tab {
                Tab::Dashboard => crate::live::beranda(app, ui),
                Tab::Monitoring => monitoring(app, ui),
                Tab::Penilaian => penilaian(app, ui),
                Tab::BankSoal => bank_soal(app, ui),
                Tab::Jadwal => admin_table(app, ui, &JADWAL),
                Tab::Siswa => admin_table(app, ui, &SISWA),
                Tab::Kelas => admin_table(app, ui, &KELAS),
                Tab::Mapel => admin_table(app, ui, &MAPEL),
                Tab::JenisUjian => admin_table(app, ui, &JENIS_UJIAN),
                Tab::Agama => admin_table(app, ui, &AGAMA),
                Tab::TahunAjaran => admin_table(app, ui, &TAHUN),
                Tab::Pengguna => admin_table(app, ui, &PENGGUNA),
                Tab::Arsip => arsip(app, ui),
            }
        });
}

fn tab_group(t: Tab) -> &'static str {
    match t {
        Tab::Dashboard | Tab::Monitoring | Tab::Penilaian | Tab::BankSoal => "UJIAN",
        Tab::Jadwal
        | Tab::Siswa
        | Tab::Kelas
        | Tab::Mapel
        | Tab::JenisUjian
        | Tab::Agama
        | Tab::TahunAjaran => "DATA MASTER",
        Tab::Pengguna | Tab::Arsip => "ADMINISTRASI",
    }
}

fn tab_hint(t: Tab) -> &'static str {
    match t {
        Tab::Dashboard => "Ringkasan sekolah dan ujian Anda.",
        Tab::Monitoring => "Pantau siswa yang sedang mengerjakan secara langsung.",
        Tab::Penilaian => "Lihat nilai per ujian dan simpan rekap ke Excel.",
        Tab::BankSoal => "Soal yang Anda buat, per mata pelajaran.",
        Tab::Jadwal => "Jadwal ujian seluruh sekolah.",
        Tab::Siswa => "Data siswa aktif dan alumni.",
        Tab::Kelas => "Daftar kelas dan tingkatnya.",
        Tab::Mapel => "Mata pelajaran dan guru pengampu.",
        Tab::JenisUjian => "Jenis ujian seperti UH, PTS, PAS.",
        Tab::Agama => "Daftar agama untuk mapel agama.",
        Tab::TahunAjaran => "Tahun ajaran dan semester aktif.",
        Tab::Pengguna => "Akun guru dan admin.",
        Tab::Arsip => "Unduh cadangan data sebelum ganti tahun ajaran.",
    }
}

/// Satu baris menu samping; true bila diklik.
fn nav_item(ui: &mut egui::Ui, label: &str, selected: bool) -> bool {
    let (rect, resp) =
        ui.allocate_exact_size(egui::vec2(ui.available_width(), 31.0), egui::Sense::click());
    let hovered = resp.hovered();
    if selected || hovered {
        let fill = if selected { TEAL } else { theme::SIDEBAR_HOVER };
        ui.painter().rect_filled(rect, 9.0, fill);
    }
    let color = if selected {
        Color32::WHITE
    } else {
        theme::SIDEBAR_TEXT
    };
    ui.painter().text(
        rect.left_center() + egui::vec2(12.0, 0.0),
        egui::Align2::LEFT_CENTER,
        label,
        egui::FontId::proportional(14.5),
        color,
    );
    if hovered {
        ui.ctx().set_cursor_icon(egui::CursorIcon::PointingHand);
    }
    resp.clicked()
}

pub fn toasts(app: &App, ctx: &egui::Context) {
    if app.toasts.is_empty() {
        return;
    }
    egui::Area::new(egui::Id::unique("toasts"))
        .anchor(egui::Align2::RIGHT_BOTTOM, [-16.0, -16.0])
        .show(ctx, |ui| {
            for t in app.toasts.iter().rev().take(4) {
                egui::Frame::popup(ui.style()).show(ui, |ui| {
                    ui.set_max_width(380.0);
                    ui.colored_label(if t.ok { GREEN } else { RED }, &t.text);
                });
            }
        });
}

pub fn confirm_dialog(app: &mut App, ctx: &egui::Context) {
    let Some(c) = app.confirm.clone() else { return };
    let mut close = false;
    egui::Window::new("Konfirmasi")
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
        .show(ctx, |ui| {
            ui.label(&c.text);
            ui.add_space(8.0);
            ui.horizontal(|ui| {
                if ui.add(theme::danger("Ya, lanjutkan")).clicked() {
                    if let Some(n) = app.net.clone() {
                        n.rpc(&c.refresh.join("\n"), c.body.clone());
                    }
                    close = true;
                }
                if ui.button("Batal").clicked() {
                    close = true;
                }
            });
        });
    if close {
        app.confirm = None;
    }
}

pub(crate) fn ask(app: &mut App, text: &str, body: Value, refresh: &[&str]) {
    app.confirm = Some(Confirm {
        text: text.to_string(),
        body,
        refresh: refresh.iter().map(|s| s.to_string()).collect(),
    });
}

// ───────────────────────── helper tampilan ─────────────────────────

/// Muat data + tampilkan status (memuat / offline / galat). None bila belum ada data.
pub(crate) fn load(app: &mut App, ui: &mut egui::Ui, path: &str, ttl: u64) -> Option<Arc<Value>> {
    app.ensure(path, ttl);
    let e = app.store.get(path)?;
    if e.offline {
        ui.colored_label(
            AMBER,
            format!(
                "Mode offline: menampilkan data tersimpan{}. {}",
                if e.saved_at.is_empty() {
                    String::new()
                } else {
                    format!(" ({})", e.saved_at)
                },
                e.error.clone().unwrap_or_default()
            ),
        );
    }
    if !e.has_value {
        if e.loading {
            ui.horizontal(|ui| {
                ui.spinner();
                ui.label("Memuat...");
            });
        } else if let Some(err) = &e.error {
            ui.colored_label(RED, err);
            if ui.button("Coba lagi").clicked() {
                let p = path.to_string();
                app.fetch(&p);
            }
        }
        return None;
    }
    Some(e.value.clone())
}

fn badge(ui: &mut egui::Ui, label: &str, color: Color32) {
    theme::pill(ui, label, color);
}

pub(crate) fn status_badge(ui: &mut egui::Ui, status: &str, offline: bool) {
    match status {
        "ONGOING" if offline => badge(ui, "Terputus", AMBER),
        "ONGOING" => badge(ui, "Mengerjakan", TEAL),
        "SUBMITTED" => badge(ui, "Selesai", GREEN),
        "CHEATED" => badge(ui, "Diblokir", RED),
        "NOT_STARTED" => badge(ui, "Belum mulai", GRAY),
        "PUBLISHED" => badge(ui, "Terbit", GREEN),
        "DRAFT" => badge(ui, "Draf", GRAY),
        "COMPLETED" => badge(ui, "Selesai", GRAY),
        other => {
            ui.label(other);
        }
    }
}

pub(crate) fn arr(v: &Value) -> &[Value] {
    v.as_array().map(|a| a.as_slice()).unwrap_or(&[])
}

fn pick_save_name(base: &str, ext: &str) -> std::path::PathBuf {
    let mut p = export::downloads_dir();
    p.push(format!("{}.{}", export::safe_name(base), ext));
    p
}

// ───────────────────────── beranda ─────────────────────────

// ───────────────────────── monitoring ─────────────────────────

fn monitoring(app: &mut App, ui: &mut egui::Ui) {
    if let Some(id) = app.sel.clone() {
        crate::live::pantau(app, ui, &id);
        return;
    }
    let Some(list) = load(app, ui, "monitoring", 20) else {
        return;
    };
    let items = arr(&list);
    if items.is_empty() {
        ui.label("Belum ada ujian yang perlu diawasi.");
        return;
    }
    theme::card_scroll(ui, |ui| {
        egui::Grid::new("mon_list")
            .striped(true)
            .spacing(theme::GRID_SPACING)
            .num_columns(7)
            .show(ui, |ui| {
                for h in ["Ujian", "Mapel", "Kelas", "Mulai", "Status", "Peserta", ""] {
                    theme::th(ui, h);
                }
                ui.end_row();
                for e in items {
                    ui.label(RichText::new(text(e, "title")).strong());
                    ui.label(path_text(e, "subject"));
                    ui.label(path_text(e, "classes"));
                    ui.label(fmt_iso_wita(&text(e, "startTime")));
                    status_badge(ui, &text(e, "status"), false);
                    ui.label(path_text(e, "attempts"));
                    if theme::row_button(ui, "Pantau", false) {
                        app.sel = Some(text(e, "id"));
                    }
                    ui.end_row();
                }
            });
    });
}

// ───────────────────────── penilaian ─────────────────────────

fn penilaian(app: &mut App, ui: &mut egui::Ui) {
    if let Some(id) = app.sel.clone() {
        penilaian_detail(app, ui, &id);
        return;
    }
    theme::toolbar(ui, |ui| {
        year_filter(app, ui, "pen.year");
    });
    ui.add_space(8.0);
    let yp = year_param(app, "pen.year");
    let path = if yp.is_empty() {
        "penilaian".to_string()
    } else {
        format!("penilaian?{yp}")
    };
    let Some(list) = load(app, ui, &path, 60) else {
        return;
    };
    let items: Vec<&Value> = arr(&list).iter().collect();
    if items.is_empty() {
        crate::table::empty_state(
            ui,
            "Belum ada ujian",
            "Tidak ada ujian terbit pada tahun ajaran ini. Pilih tahun ajaran lain di atas.",
        );
        return;
    }
    use crate::table::{Cell, W};
    let cols = [
        ("Ujian", W::Fill(150.0)),
        ("Mapel", W::Fill(90.0)),
        ("Jenis", W::Px(80.0)),
        ("Kelas", W::Fill(70.0)),
        ("Tahun ajaran", W::Px(140.0)),
        ("Mulai", W::Px(150.0)),
        ("Peserta", W::Px(80.0)),
    ];
    let it = &items;
    crate::table::data_table(
        ui,
        "tbl-pen",
        &cols,
        items.len(),
        42.0,
        120.0,
        |i, c| {
            let e = it[i];
            match c {
                0 => Cell::Strong(text(e, "title")),
                1 => Cell::Text(path_text(e, "subject")),
                2 => Cell::Pill(path_text(e, "examType"), theme::BLUE),
                3 => Cell::Text(path_text(e, "classes")),
                4 => Cell::Muted(path_text(e, "year")),
                5 => Cell::Muted(fmt_iso_wita(&text(e, "startTime"))),
                _ => Cell::Text(path_text(e, "attempts")),
            }
        },
        |ui, i| {
            if theme::row_button(ui, "Lihat nilai", false) {
                app.sel = Some(text(it[i], "id"));
            }
        },
    );
}

fn penilaian_detail(app: &mut App, ui: &mut egui::Ui, id: &str) {
    let key = format!("penilaian/{id}");
    ui.horizontal(|ui| {
        if ui.button("Kembali").clicked() {
            app.sel = None;
        }
    });
    let Some(d) = load(app, ui, &key, 30) else {
        return;
    };
    let rows = arr(d.get("rows").unwrap_or(&Value::Null));
    let title = text(&d, "title");
    let scores: Vec<f64> = rows
        .iter()
        .filter(|r| text(r, "status") != "ONGOING")
        .filter_map(|r| r.get("score").and_then(|s| s.as_f64()))
        .collect();
    let avg = if scores.is_empty() {
        0.0
    } else {
        scores.iter().sum::<f64>() / scores.len() as f64
    };

    ui.horizontal_wrapped(|ui| {
        ui.label(RichText::new(&title).size(18.0).strong());
        ui.label(RichText::new(text(&d, "subject")).color(GRAY));
        ui.label(format!(
            "• {} peserta • rata-rata {:.1} • tertinggi {:.1} • terendah {:.1}",
            rows.len(),
            avg,
            scores.iter().cloned().fold(0.0, f64::max),
            if scores.is_empty() {
                0.0
            } else {
                scores.iter().cloned().fold(f64::MAX, f64::min)
            }
        ));
    });

    let sheet = Sheet {
        title: "Rekap Nilai",
        subtitle: &format!(
            "{} | {} | {}",
            title,
            text(&d, "subject"),
            path_text(&d, "classes")
        ),
        headers: [
            "No",
            "NISN",
            "Nama",
            "Kelas",
            "Status",
            "Pelanggaran",
            "Nilai",
        ]
        .iter()
        .map(|s| s.to_string())
        .collect(),
        rows: rows
            .iter()
            .enumerate()
            .map(|(i, r)| {
                vec![
                    (i + 1).to_string(),
                    text(r, "nisn"),
                    text(r, "name"),
                    text(r, "className"),
                    text(r, "status"),
                    path_text(r, "violationCount"),
                    path_text(r, "score"),
                ]
            })
            .collect(),
    };
    ui.horizontal(|ui| {
        if ui.add(theme::primary("Simpan Excel (.xlsx)")).clicked() {
            let p = pick_save_name(&format!("Nilai_{title}"), "xlsx");
            match export::write_xlsx(&p, &sheet) {
                Ok(()) => app.push_toast(format!("Tersimpan: {}", p.display()), true),
                Err(e) => app.push_toast(format!("Gagal menyimpan: {e}"), false),
            }
        }
        if ui.button("Simpan CSV").clicked() {
            let p = pick_save_name(&format!("Nilai_{title}"), "csv");
            match export::write_csv(&p, &sheet) {
                Ok(()) => app.push_toast(format!("Tersimpan: {}", p.display()), true),
                Err(e) => app.push_toast(format!("Gagal menyimpan: {e}"), false),
            }
        }
        if ui.button("Cetak di web").clicked() {
            if let Some(n) = &app.net {
                n.open_web("/guru/penilaian");
            }
        }
    });
    let is_guru = !app.is_admin();
    ui.separator();
    theme::card_scroll(ui, |ui| {
        egui::Grid::new("pen_detail")
            .striped(true)
            .spacing(theme::GRID_SPACING)
            .num_columns(8)
            .show(ui, |ui| {
                for h in [
                    "No",
                    "NISN",
                    "Nama",
                    "Kelas",
                    "Status",
                    "Pelanggaran",
                    "Nilai",
                    "",
                ] {
                    theme::th(ui, h);
                }
                ui.end_row();
                for (i, r) in rows.iter().enumerate() {
                    ui.label((i + 1).to_string());
                    ui.label(text(r, "nisn"));
                    ui.label(RichText::new(text(r, "name")).strong());
                    ui.label(text(r, "className"));
                    status_badge(ui, &text(r, "status"), false);
                    ui.label(path_text(r, "violationCount"));
                    ui.label(RichText::new(path_text(r, "score")).strong());
                    if is_guru && text(r, "status") != "ONGOING" {
                        if theme::row_button(ui, "Koreksi", false) {
                            app.forms.koreksi = Some(crate::forms::KoreksiForm {
                                attempt_id: text(r, "attemptId"),
                                ..Default::default()
                            });
                        }
                    } else {
                        ui.label("");
                    }
                    ui.end_row();
                }
            });
    });
}

// ───────────────────────── bank soal ─────────────────────────

/// Kunci daftar mapel di bank soal (ikut filter tahun ajaran).
fn soal_root(app: &App) -> String {
    let yp = year_param(app, "soal.year");
    if yp.is_empty() {
        "soal".into()
    } else {
        format!("soal?{yp}")
    }
}

/// Indikator total bobot paket soal (jenis ujian + kelas) agar guru mengatur total = 100.
fn total_bobot(app: &App, ui: &mut egui::Ui, d: &Value) {
    let dipilih = |k: &str| app.form.get(k).map(|v| !v.is_empty()).unwrap_or(false);
    if !(dipilih("soal.et") && dipilih("soal.cls")) {
        ui.label(
            RichText::new(
                "Pilih satu jenis ujian dan satu kelas untuk melihat total bobot (target 100).",
            )
            .size(12.5)
            .color(GRAY),
        );
        return;
    }
    let total = d
        .get("totalBobot")
        .and_then(|x| x.as_f64())
        .unwrap_or(0.0)
        .round() as i64;
    let jumlah = i64_of(d, "paketSoal");
    let selisih = 100 - total;
    let (warna, pesan) = if selisih == 0 {
        (GREEN, "Pas 100, siap dipakai".to_string())
    } else if selisih < 0 {
        (RED, format!("Kelebihan {} poin", -selisih))
    } else {
        (AMBER, format!("Kurang {selisih} poin"))
    };
    theme::card(ui, |ui| {
        ui.set_width(ui.available_width());
        ui.horizontal(|ui| {
            ui.label(
                RichText::new(format!("Total bobot: {total} / 100  ({jumlah} soal)"))
                    .strong()
                    .color(warna),
            );
            theme::pill(ui, &pesan, warna);
        });
        ui.add(
            egui::ProgressBar::new((total as f32 / 100.0).clamp(0.0, 1.0))
                .desired_height(8.0)
                .fill(warna),
        );
        ui.label(
            RichText::new(
                "Atur bobot tiap soal agar totalnya 100 (mis. 25 soal x 4). Nilai siswa tetap otomatis 0-100.",
            )
            .size(12.0)
            .color(GRAY),
        );
    });
}

fn bank_soal(app: &mut App, ui: &mut egui::Ui) {
    if let Some(sid) = app.sel.clone() {
        soal_list(app, ui, &sid);
        return;
    }
    let is_admin = app.is_admin();
    theme::toolbar(ui, |ui| {
        year_filter(app, ui, "soal.year");
        ui.label(
            RichText::new("Jumlah soal dihitung dari tanggal dibuat dalam tahun ajaran terpilih.")
                .size(13.0)
                .color(GRAY),
        );
    });
    ui.add_space(8.0);
    let root = soal_root(app);
    let Some(list) = load(app, ui, &root, 60) else {
        return;
    };
    let items: Vec<&Value> = arr(&list).iter().collect();
    if items.is_empty() {
        crate::table::empty_state(
            ui,
            "Belum ada mata pelajaran",
            "Anda belum mengampu mata pelajaran apa pun.",
        );
        return;
    }
    use crate::table::{Cell, W};
    let cols = [
        ("Mata pelajaran", W::Fill(200.0)),
        ("Kelas", W::Fill(160.0)),
        ("Jumlah soal", W::Px(120.0)),
    ];
    let it = &items;
    crate::table::data_table(
        ui,
        "tbl-soal-mapel",
        &cols,
        items.len(),
        44.0,
        if is_admin { 100.0 } else { 220.0 },
        |i, c| {
            let s = it[i];
            match c {
                0 => Cell::Strong(text(s, "name")),
                1 => Cell::Text(
                    arr(s.get("classes").unwrap_or(&Value::Null))
                        .iter()
                        .map(|c| text(c, "name"))
                        .collect::<Vec<_>>()
                        .join(", "),
                ),
                _ => Cell::Pill(path_text(s, "questionCount"), theme::TEAL),
            }
        },
        |ui, i| {
            let s = it[i];
            if !is_admin && ui.add(theme::primary("Tambah soal")).clicked() {
                app.forms.soal = Some(crate::forms::SoalForm::new(
                    &text(s, "id"),
                    &text(s, "name"),
                    None,
                ));
            }
            if theme::row_button(ui, "Buka", false) {
                app.sel = Some(text(s, "id"));
                app.page = 0;
                app.filter.clear();
                app.form.remove("soal.q");
            }
        },
    );
}

/// Parameter filter tambahan untuk daftar soal.
fn soal_filter_params(app: &App) -> String {
    let mut s = String::new();
    let g = |k: &str| app.form.get(k).cloned().unwrap_or_default();
    let yp = year_param(app, "soal.year");
    if !yp.is_empty() {
        s.push('&');
        s.push_str(&yp);
    }
    for (k, name) in [
        ("soal.type", "type"),
        ("soal.et", "examTypeId"),
        ("soal.cls", "classId"),
    ] {
        let v = g(k);
        if !v.is_empty() {
            s.push_str(&format!("&{name}={}", urlenc(&v)));
        }
    }
    s
}

fn soal_list(app: &mut App, ui: &mut egui::Ui, subject_id: &str) {
    let is_admin = app.is_admin();
    let name = load_name(app, subject_id);
    ui.horizontal(|ui| {
        if ui.button("Kembali").clicked() {
            app.sel = None;
        }
        ui.label(RichText::new(&name).size(20.0).strong());
        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            if !is_admin && ui.add(theme::primary("Tambah soal")).clicked() {
                app.forms.soal = Some(crate::forms::SoalForm::new(subject_id, &name, None));
            }
        });
    });
    ui.add_space(6.0);
    let opts = options(app);
    theme::toolbar(ui, |ui| {
        let r = ui.add_sized(
            [220.0, 32.0],
            egui::TextEdit::singleline(&mut app.filter).hint_text("Cari teks soal..."),
        );
        let enter = r.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter));
        if ui.button("Cari").clicked() || enter {
            app.form.insert("soal.q".into(), app.filter.clone());
            app.page = 0;
        }
        let mut changed = year_filter(app, ui, "soal.year");
        let mut et = vec![(String::new(), "Semua jenis ujian".to_string())];
        et.extend(opt_pairs(&opts, "examTypes", "name"));
        let cur = app.form.entry("soal.et".into()).or_default();
        changed |= crate::table::combo(ui, "sf-et", "Jenis ujian", cur, &et, 150.0);
        let ty: Vec<(String, String)> = [
            ("", "Semua jenis soal"),
            ("MULTIPLE_CHOICE", "Pilihan ganda"),
            ("MULTIPLE_CHOICE_COMPLEX", "PG kompleks"),
            ("TRUE_FALSE", "Benar/Salah"),
            ("MATCHING", "Menjodohkan"),
            ("ESSAY", "Esai"),
        ]
        .iter()
        .map(|(a, b)| (a.to_string(), b.to_string()))
        .collect();
        let cur = app.form.entry("soal.type".into()).or_default();
        changed |= crate::table::combo(ui, "sf-ty", "Jenis soal", cur, &ty, 150.0);
        let mut cl = vec![(String::new(), "Semua kelas".to_string())];
        cl.extend(opt_pairs(&opts, "classes", "name"));
        let cur = app.form.entry("soal.cls".into()).or_default();
        changed |= crate::table::combo(ui, "sf-cl", "Kelas", cur, &cl, 120.0);
        if changed {
            app.page = 0;
        }
    });
    ui.add_space(8.0);
    let q = app.form.get("soal.q").cloned().unwrap_or_default();
    let key = format!(
        "soal/{subject_id}?q={}&page={}{}",
        urlenc(&q),
        app.page + 1,
        soal_filter_params(app)
    );
    let Some(d) = load(app, ui, &key, 60) else {
        return;
    };
    let total = i64_of(&d, "total");
    let page_size = i64_of(&d, "pageSize").max(1);
    let pages = ((total + page_size - 1) / page_size).max(1) as usize;
    ui.horizontal(|ui| {
        ui.label(
            RichText::new(format!("{total} soal  •  halaman {}/{pages}", app.page + 1))
                .size(13.0)
                .color(GRAY),
        );
        if app.page > 0 && ui.small_button("Sebelumnya").clicked() {
            app.page -= 1;
        }
        if app.page + 1 < pages && ui.small_button("Berikutnya").clicked() {
            app.page += 1;
        }
    });
    ui.add_space(4.0);
    total_bobot(app, ui, &d);
    ui.add_space(4.0);
    let items: Vec<&Value> = arr(d.get("items").unwrap_or(&Value::Null)).iter().collect();
    if items.is_empty() {
        crate::table::empty_state(
            ui,
            "Tidak ada soal",
            "Tidak ada soal yang cocok dengan filter. Coba ganti tahun ajaran atau hapus filter.",
        );
        return;
    }
    use crate::table::{Cell, W};
    let cols = [
        ("Soal", W::Fill(200.0)),
        ("Jenis", W::Px(120.0)),
        ("Skor", W::Px(60.0)),
        ("Kunci", W::Px(110.0)),
        ("Kelas", W::Px(110.0)),
        ("Dibuat", W::Px(110.0)),
    ];
    let it = &items;
    let refresh_key = key.clone();
    let root = soal_root(app);
    crate::table::data_table(
        ui,
        "tbl-soal",
        &cols,
        items.len(),
        42.0,
        if is_admin { 100.0 } else { 170.0 },
        |i, c| {
            let q = it[i];
            match c {
                0 => Cell::Strong(strip_html(&text(q, "text")).chars().take(140).collect()),
                1 => Cell::Muted(
                    match text(q, "type").as_str() {
                        "MULTIPLE_CHOICE" => "Pilihan ganda",
                        "MULTIPLE_CHOICE_COMPLEX" => "PG kompleks",
                        "MATCHING" => "Menjodohkan",
                        "ESSAY" => "Esai",
                        "TRUE_FALSE" => "Benar/Salah",
                        _ => "-",
                    }
                    .into(),
                ),
                2 => Cell::Text(path_text(q, "score")),
                3 => Cell::Mono(
                    strip_html(&text(q, "correctAnswer"))
                        .chars()
                        .take(16)
                        .collect(),
                ),
                4 => Cell::Text(path_text(q, "classes")),
                _ => Cell::Muted(
                    fmt_iso_wita(&text(q, "createdAt"))
                        .chars()
                        .take(10)
                        .collect(),
                ),
            }
        },
        |ui, i| {
            let q = it[i];
            let qid = text(q, "id");
            if theme::row_button(ui, "Hapus", true) {
                ask(
                    app,
                    "Hapus soal ini? Tindakan ini tidak bisa dibatalkan.",
                    json!({"action":"deleteQuestion","args":[qid]}),
                    &[&refresh_key, &root],
                );
            }
            if !is_admin && theme::row_button(ui, "Ubah", false) {
                app.forms.soal = Some(crate::forms::SoalForm::new(
                    subject_id,
                    &load_name(app, subject_id),
                    Some(qid),
                ));
            }
        },
    );
}

fn load_name(app: &App, subject_id: &str) -> String {
    let root = soal_root(app);
    app.store
        .get(&root)
        .map(|e| {
            arr(&e.value)
                .iter()
                .find(|s| text(s, "id") == subject_id)
                .map(|s| text(s, "name"))
                .unwrap_or_default()
        })
        .unwrap_or_default()
}

fn urlenc(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' => (b as char).to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect()
}

// ───────────────────────── tabel admin generik ─────────────────────────

#[derive(Clone, Copy)]
pub enum Kind {
    Arg,
    Form,
}

pub struct Field {
    label: &'static str,
    name: &'static str,
    password: bool,
    choices: &'static [&'static str],
    /// Sumber pilihan dinamis dari `/options` ("classes" / "religions"); kosong = tidak dipakai.
    src: &'static str,
}

pub struct Act {
    label: &'static str,
    action: &'static str,
    kind: Kind,
    danger: bool,
}

pub struct Spec {
    tab: &'static str,
    path: &'static str,
    cols: &'static [(&'static str, &'static str)],
    searchable: bool,
    /// (aksi tambah, isian) — dipakai juga untuk form ubah.
    create: Option<(&'static str, &'static [Field])>,
    /// Aksi ubah; kosong = tidak ada tombol Ubah (jadwal & mapel punya form sendiri).
    update: &'static str,
    /// Teks tombol tambah, mis. "Tambah kelas".
    add: &'static str,
    acts: &'static [Act],
}

const fn field(label: &'static str, name: &'static str) -> Field {
    Field {
        label,
        name,
        password: false,
        choices: &[],
        src: "",
    }
}

const fn choice(
    label: &'static str,
    name: &'static str,
    choices: &'static [&'static str],
) -> Field {
    Field {
        label,
        name,
        password: false,
        choices,
        src: "",
    }
}

const fn source(label: &'static str, name: &'static str, src: &'static str) -> Field {
    Field {
        label,
        name,
        password: false,
        choices: &[],
        src,
    }
}

const fn secret(label: &'static str, name: &'static str) -> Field {
    Field {
        label,
        name,
        password: true,
        choices: &[],
        src: "",
    }
}

const HAPUS_ARG: Act = Act {
    label: "Hapus",
    action: "",
    kind: Kind::Arg,
    danger: true,
};

static KELAS: Spec = Spec {
    tab: "kelas",
    path: "admin/kelas",
    cols: &[
        ("Nama", "name"),
        ("Tingkat", "level"),
        ("Jumlah siswa", "students"),
    ],
    searchable: true,
    create: Some((
        "createClass",
        &[
            field("Nama kelas", "name"),
            field("Tingkat (mis. 10)", "level"),
        ],
    )),
    update: "updateClass",
    add: "Tambah kelas",
    acts: &[Act {
        action: "deleteClass",
        ..HAPUS_ARG
    }],
};
static AGAMA: Spec = Spec {
    tab: "agama",
    path: "admin/agama",
    cols: &[("Nama", "name")],
    searchable: false,
    create: Some(("createReligion", &[field("Nama agama", "name")])),
    update: "updateReligion",
    add: "Tambah agama",
    acts: &[Act {
        action: "deleteReligion",
        kind: Kind::Form,
        ..HAPUS_ARG
    }],
};
static JENIS_UJIAN: Spec = Spec {
    tab: "jenis",
    path: "admin/jenis-ujian",
    cols: &[("Nama", "name"), ("Kode", "code")],
    searchable: false,
    create: Some((
        "createExamType",
        &[
            field("Nama jenis ujian", "name"),
            field("Kode (unik, mis. UH)", "code"),
        ],
    )),
    update: "updateExamType",
    add: "Tambah jenis ujian",
    acts: &[Act {
        action: "deleteExamType",
        kind: Kind::Form,
        ..HAPUS_ARG
    }],
};
static TAHUN: Spec = Spec {
    tab: "tahun",
    path: "admin/tahun-ajaran",
    cols: &[
        ("Tahun ajaran", "year"),
        ("Semester", "semester"),
        ("Status", "active"),
    ],
    searchable: false,
    create: Some((
        "createAcademicYear",
        &[
            field("Tahun (mis. 2026/2027)", "year"),
            choice("Semester", "semester", &["GANJIL", "GENAP"]),
        ],
    )),
    update: "updateAcademicYear",
    add: "Tambah tahun ajaran",
    acts: &[
        Act {
            label: "Jadikan aktif",
            action: "setActiveAcademicYear",
            kind: Kind::Form,
            danger: false,
        },
        Act {
            action: "deleteAcademicYear",
            kind: Kind::Form,
            ..HAPUS_ARG
        },
    ],
};
static PENGGUNA: Spec = Spec {
    tab: "pengguna",
    path: "admin/pengguna",
    cols: &[
        ("Nama", "name"),
        ("Username", "username"),
        ("Peran", "role"),
    ],
    searchable: true,
    create: Some((
        "createUser",
        &[
            field("Nama lengkap", "name"),
            field("Username (min. 5 karakter)", "username"),
            secret("Password (min. 8)", "password"),
            choice("Peran", "role", &["GURU", "ADMIN"]),
        ],
    )),
    update: "updateUser",
    add: "Tambah pengguna",
    acts: &[Act {
        action: "deleteUser",
        ..HAPUS_ARG
    }],
};
static MAPEL: Spec = Spec {
    tab: "mapel",
    path: "admin/mapel",
    cols: &[
        ("Mata pelajaran", "name"),
        ("Agama", "religion"),
        ("Pengampu (kelas - guru)", "assignments"),
    ],
    searchable: true,
    create: None,
    update: "",
    add: "Tambah mapel",
    acts: &[Act {
        action: "deleteSubject",
        ..HAPUS_ARG
    }],
};
static SISWA: Spec = Spec {
    tab: "siswa",
    path: "admin/siswa",
    cols: &[
        ("NISN", "nisn"),
        ("Nama", "name"),
        ("Kelas", "class.name"),
        ("Agama", "religion.name"),
        ("Status", "status"),
    ],
    searchable: true,
    create: Some((
        "createStudent",
        &[
            field("NISN", "nisn"),
            field("Nama lengkap", "name"),
            source("Kelas", "classId", "classes"),
            source("Agama", "religionId", "religions"),
        ],
    )),
    update: "updateStudent",
    add: "Tambah siswa",
    acts: &[Act {
        action: "deleteStudent",
        ..HAPUS_ARG
    }],
};
static JADWAL: Spec = Spec {
    tab: "jadwal",
    path: "admin/jadwal",
    cols: &[
        ("Judul", "title"),
        ("Mapel", "subject"),
        ("Jenis", "examType"),
        ("Kelas", "classes"),
        ("Mulai", "startTime"),
        ("Status", "status"),
        ("Token", "token"),
    ],
    searchable: true,
    create: None,
    update: "",
    add: "Buat jadwal",
    acts: &[
        Act {
            label: "Buat token",
            action: "generateExamToken",
            kind: Kind::Arg,
            danger: false,
        },
        Act {
            action: "deleteExam",
            kind: Kind::Form,
            ..HAPUS_ARG
        },
    ],
};

fn cell_text(row: &Value, path: &str) -> String {
    if path.ends_with("Time") {
        return fmt_iso_wita(&path_text(row, path));
    }
    match path_text(row, path).as_str() {
        "true" => "Ya".into(),
        "false" => "".into(),
        "ACTIVE" => "Aktif".into(),
        "GRADUATED" => "Lulus".into(),
        "DROPOUT" => "Keluar".into(),
        "MUTATED" => "Pindah".into(),
        "ADMIN" => "Admin".into(),
        "GURU" => "Guru".into(),
        "GANJIL" => "Ganjil".into(),
        "GENAP" => "Genap".into(),
        s => s.to_string(),
    }
}

fn col_w(path: &str) -> crate::table::W {
    use crate::table::W;
    match path {
        "level" | "students" | "active" | "semester" | "role" | "status" => W::Px(96.0),
        "token" | "code" => W::Px(84.0),
        "nisn" => W::Px(110.0),
        "startTime" => W::Px(130.0),
        "name" | "title" => W::Fill(110.0),
        _ => W::Fill(70.0),
    }
}

fn cell_for(r: &Value, path: &str, first: bool) -> crate::table::Cell {
    use crate::table::{status_pill, Cell};
    let raw = path_text(r, path);
    if path == "active" {
        return if raw == "true" {
            Cell::Pill("Aktif".into(), GREEN)
        } else {
            Cell::Muted(String::new())
        };
    }
    if path.ends_with("Time") {
        return Cell::Muted(fmt_iso_wita(&raw));
    }
    if let Some((label, color)) = status_pill(&raw) {
        return Cell::Pill(label.into(), color);
    }
    if path == "token" {
        return if raw.is_empty() {
            Cell::Muted("-".into())
        } else {
            Cell::Mono(raw)
        };
    }
    if first {
        Cell::Strong(cell_text(r, path))
    } else {
        Cell::Text(cell_text(r, path))
    }
}

/// Pilihan umum dari server (kelas, agama, tahun ajaran, jenis ujian). `None` selama belum termuat.
pub(crate) fn options(app: &mut App) -> Option<Arc<Value>> {
    app.ensure("options", 300);
    app.store
        .get("options")
        .filter(|e| e.has_value)
        .map(|e| e.value.clone())
}

/// Daftar (id, label) dari kunci `key` pada `options`, mis. "classes".
fn opt_pairs(opts: &Option<Arc<Value>>, key: &str, name: &str) -> Vec<(String, String)> {
    opts.as_ref()
        .map(|o| {
            arr(o.get(key).unwrap_or(&Value::Null))
                .iter()
                .map(|x| (text(x, "id"), text(x, name)))
                .collect()
        })
        .unwrap_or_default()
}

/// Dropdown tahun ajaran. Nilai tersimpan di `app.form[key]`: "" = tahun ajaran aktif, "all" = semua, selain itu id.
pub(crate) fn year_filter(app: &mut App, ui: &mut egui::Ui, key: &str) -> bool {
    let opts = options(app);
    let mut items = vec![
        (String::new(), "Tahun ajaran aktif".to_string()),
        ("all".to_string(), "Semua tahun ajaran".to_string()),
    ];
    if let Some(o) = &opts {
        for y in arr(o.get("academicYears").unwrap_or(&Value::Null)) {
            let mut l = format!(
                "{} {}",
                text(y, "year"),
                semester_label(&text(y, "semester"))
            );
            if bool_of(y, "active") {
                l.push_str(" (aktif)");
            }
            items.push((text(y, "id"), l));
        }
    }
    let cur = app.form.entry(key.to_string()).or_default();
    crate::table::combo(ui, &format!("yf-{key}"), "Tahun ajaran", cur, &items, 190.0)
}

/// Parameter `yearId=` untuk URL dari nilai filter ("" = bawaan server = tahun ajaran aktif).
fn year_param(app: &App, key: &str) -> String {
    match app.form.get(key).map(|s| s.as_str()).unwrap_or("") {
        "" => String::new(),
        v => format!("yearId={}", urlenc(v)),
    }
}

/// Buka dialog tambah/ubah untuk data master sederhana.
fn open_master(app: &mut App, spec: &'static Spec, row: Option<&Value>) {
    use crate::master_edit::{EField, EditDlg, Kind as K};
    let Some((create, fields)) = spec.create else {
        return;
    };
    let opts = options(app);
    let editing = row.is_some();
    let mut fs = Vec::new();
    for f in fields {
        let kind = if f.password {
            K::Password
        } else if !f.src.is_empty() {
            K::Choice(opt_pairs(&opts, f.src, "name"))
        } else if !f.choices.is_empty() {
            K::Choice(
                f.choices
                    .iter()
                    .map(|c| {
                        let l = crate::table::status_pill(c).map(|p| p.0).unwrap_or(c);
                        (c.to_string(), l.to_string())
                    })
                    .collect(),
            )
        } else {
            K::Text
        };
        let mut value = row.map(|r| text(r, f.name)).unwrap_or_default();
        if value.is_empty() {
            if let K::Choice(items) = &kind {
                if !editing || f.src.is_empty() {
                    value = items.first().map(|i| i.0.clone()).unwrap_or_default();
                }
            }
        }
        fs.push(EField {
            label: if editing && f.password {
                "Password baru (kosongkan jika tidak diubah)".into()
            } else {
                f.label.into()
            },
            name: f.name,
            kind,
            value,
        });
    }
    app.forms.master = Some(EditDlg {
        title: if editing {
            format!("Ubah {}", spec.add.trim_start_matches("Tambah "))
        } else {
            spec.add.to_string()
        },
        action: if editing { spec.update } else { create },
        refresh: spec.path,
        id: row.map(|r| text(r, "id")),
        fields: fs,
        saving: false,
        error: String::new(),
    });
}

/// Hanya untuk uji tampilan (env UJIIN_FORM): membuka dialog master dengan data contoh.
pub(crate) fn debug_master(app: &mut App, tab: &str, edit: bool) {
    let spec: &'static Spec = match tab {
        "siswa" => &SISWA,
        _ => &PENGGUNA,
    };
    let row = json!({"id":"g1","name":"Pak Guru","username":"pakguru","role":"GURU"});
    open_master(app, spec, if edit { Some(&row) } else { None });
}

fn admin_table(app: &mut App, ui: &mut egui::Ui, spec: &'static Spec) {
    let refresh = [spec.path];
    let opts = options(app);

    // ── tombol aksi (kanan atas) ──
    let bar = egui::vec2(ui.available_width(), 34.0);
    ui.allocate_ui_with_layout(
        bar,
        egui::Layout::right_to_left(egui::Align::Center),
        |ui| {
            if ui.add(theme::primary(spec.add)).clicked() {
                match spec.tab {
                    "jadwal" => app.forms.jadwal = Some(crate::forms::JadwalForm::new(None)),
                    "mapel" => app.forms.mapel = Some(crate::forms::MapelForm::new(None)),
                    _ => open_master(app, spec, None),
                }
            }
            if spec.tab == "siswa" && ui.button("Impor Excel").clicked() {
                app.forms.import = Some(Default::default());
            }
            if ui.button("Muat ulang").clicked() {
                app.fetch(spec.path);
            }
        },
    );
    // ── pencarian & filter ──
    let has_filters = spec.searchable || matches!(spec.tab, "jadwal" | "siswa");
    if has_filters {
        theme::toolbar(ui, |ui| {
            if spec.searchable {
                ui.add_sized(
                    [240.0, 32.0],
                    egui::TextEdit::singleline(&mut app.filter).hint_text("Cari..."),
                );
            }
            match spec.tab {
                "jadwal" => {
                    year_filter(app, ui, "jadwal.year");
                    let st = vec![
                        (String::new(), "Semua status".to_string()),
                        ("DRAFT".into(), "Draf".into()),
                        ("PUBLISHED".into(), "Terbit".into()),
                        ("COMPLETED".into(), "Selesai".into()),
                    ];
                    let cur = app.form.entry("jadwal.status".into()).or_default();
                    crate::table::combo(ui, "jf-status", "Status", cur, &st, 130.0);
                }
                "siswa" => {
                    let mut cls = vec![(String::new(), "Semua kelas".to_string())];
                    cls.extend(opt_pairs(&opts, "classes", "name"));
                    let cur = app.form.entry("siswa.cls".into()).or_default();
                    crate::table::combo(ui, "sf-cls", "Kelas", cur, &cls, 140.0);
                    let st = vec![
                        (String::new(), "Semua status".to_string()),
                        ("ACTIVE".into(), "Aktif".into()),
                        ("GRADUATED".into(), "Lulus".into()),
                        ("DROPOUT".into(), "Keluar".into()),
                        ("MUTATED".into(), "Pindah".into()),
                    ];
                    let cur = app
                        .form
                        .entry("siswa.status".into())
                        .or_insert_with(|| "ACTIVE".into());
                    crate::table::combo(ui, "sf-st", "Status", cur, &st, 130.0);
                }
                _ => {}
            }
        });
    }
    if spec.tab == "siswa" && app.forms.import.is_some() {
        crate::forms::import_panel(app, ui);
    }
    ui.add_space(8.0);

    let Some(d) = load(app, ui, spec.path, 60) else {
        return;
    };
    let needle = app.filter.to_lowercase();
    let year_sel = app.form.get("jadwal.year").cloned().unwrap_or_default();
    let st_sel = app
        .form
        .get(&format!("{}.status", spec.tab))
        .cloned()
        .unwrap_or_else(|| {
            if spec.tab == "siswa" {
                "ACTIVE".into()
            } else {
                String::new()
            }
        });
    let cls_sel = app.form.get("siswa.cls").cloned().unwrap_or_default();
    let all = arr(&d);
    let rows: Vec<&Value> = all
        .iter()
        .filter(|r| {
            let by_text = needle.is_empty()
                || spec
                    .cols
                    .iter()
                    .any(|(_, p)| cell_text(r, p).to_lowercase().contains(&needle));
            let by_year = spec.tab != "jadwal"
                || match year_sel.as_str() {
                    "" => bool_of(r, "yearActive"),
                    "all" => true,
                    id => text(r, "yearId") == id,
                };
            let by_status = st_sel.is_empty()
                || !matches!(spec.tab, "jadwal" | "siswa")
                || text(r, "status") == st_sel;
            let by_class =
                cls_sel.is_empty() || spec.tab != "siswa" || text(r, "classId") == cls_sel;
            by_text && by_year && by_status && by_class
        })
        .collect();

    ui.label(
        RichText::new(format!("{} dari {} data", rows.len(), all.len()))
            .size(13.0)
            .color(GRAY),
    );
    ui.add_space(4.0);
    if rows.is_empty() {
        crate::table::empty_state(
            ui,
            "Tidak ada data yang cocok",
            if all.is_empty() {
                "Belum ada data. Tambahkan lewat tombol di kanan atas."
            } else {
                "Ubah filter atau kata pencarian untuk melihat data lain."
            },
        );
        return;
    }

    let cols: Vec<(&str, crate::table::W)> =
        spec.cols.iter().map(|(h, p)| (*h, col_w(p))).collect();
    let has_edit = !spec.update.is_empty() || matches!(spec.tab, "jadwal" | "mapel");
    let actions_w = if has_edit { 160.0 } else { 100.0 };
    let rows_ref = &rows;
    crate::table::data_table(
        ui,
        &format!("tbl-{}", spec.tab),
        &cols,
        rows.len(),
        42.0,
        actions_w,
        |i, c| cell_for(rows_ref[i], spec.cols[c].1, c == 0),
        |ui, i| {
            let r = rows_ref[i];
            let id = text(r, "id");
            // right_to_left: yang pertama digambar ada di paling kanan
            ui.menu_button("Lainnya", |ui| {
                for a in spec.acts {
                    let label = if a.danger {
                        RichText::new(a.label).color(RED)
                    } else {
                        RichText::new(a.label)
                    };
                    if ui.button(label).clicked() {
                        let body = match a.kind {
                            Kind::Arg => json!({"action": a.action, "args": [id]}),
                            Kind::Form => json!({"action": a.action, "form": {"id": id}}),
                        };
                        if a.danger {
                            let name = cell_text(r, spec.cols[0].1);
                            ask(
                                app,
                                &format!(
                                    "{} \"{}\"? Tindakan ini tidak bisa dibatalkan.",
                                    a.label, name
                                ),
                                body,
                                &refresh,
                            );
                        } else {
                            app.send_rpc(&refresh, body);
                        }
                        ui.close();
                    }
                }
            });
            if has_edit && theme::row_button(ui, "Ubah", false) {
                match spec.tab {
                    "jadwal" => {
                        app.forms.jadwal = Some(crate::forms::JadwalForm::new(Some(id.clone())))
                    }
                    "mapel" => app.forms.mapel = Some(crate::forms::MapelForm::new(Some(r))),
                    _ => open_master(app, spec, Some(r)),
                }
            }
        },
    );
}

// ───────────────────────── arsip ─────────────────────────

fn arsip(app: &mut App, ui: &mut egui::Ui) {
    let Some(years) = load(app, ui, "admin/tahun-ajaran", 120) else {
        return;
    };
    let items = arr(&years);
    if app.sel.is_none() {
        app.sel = items.first().map(|y| text(y, "id"));
    }
    theme::card(ui, |ui| {
        ui.label(RichText::new("Arsip nilai & daftar siswa").strong());
        ui.label(RichText::new("Unduh sebelum meluluskan siswa atau berganti tahun ajaran. File disimpan ke folder Unduhan.").color(GRAY));
        ui.add_space(4.0);
        ui.horizontal(|ui| {
            let current = items
                .iter()
                .find(|y| Some(text(y, "id")) == app.sel)
                .map(|y| format!("{} - {}", text(y, "year"), text(y, "semester")))
                .unwrap_or_else(|| "Pilih tahun ajaran".into());
            egui::ComboBox::from_id_salt("arsip-year")
                .selected_text(current)
                .show_ui(ui, |ui| {
                    for y in items {
                        ui.selectable_value(
                            &mut app.sel,
                            Some(text(y, "id")),
                            format!("{} - {}", text(y, "year"), text(y, "semester")),
                        );
                    }
                });
            if ui.add(theme::primary("Unduh arsip nilai (CSV)")).clicked() {
                if let (Some(id), Some(n)) = (app.sel.clone(), app.net.clone()) {
                    n.download(
                        &format!("/api/admin/arsip?type=nilai&yearId={id}"),
                        pick_save_name("Arsip_Nilai", "csv"),
                    );
                }
            }
            if ui.add(theme::primary("Unduh daftar siswa (CSV)")).clicked() {
                if let Some(n) = app.net.clone() {
                    n.download(
                        "/api/admin/arsip?type=siswa",
                        pick_save_name("Arsip_Daftar_Siswa", "csv"),
                    );
                }
            }
        });
    });
    ui.add_space(14.0);
    ui.label(RichText::new("Kenaikan kelas & kelulusan").strong());
    crate::forms::kenaikan(app, ui);
    let _ = util::text;
}

pub(crate) fn semester_label(s: &str) -> &str {
    match s {
        "GANJIL" => "Ganjil",
        "GENAP" => "Genap",
        o => o,
    }
}
