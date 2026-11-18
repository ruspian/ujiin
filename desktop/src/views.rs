use crate::app::{App, Confirm, Tab};
use crate::export::{self, Sheet};
use crate::util::{self, bool_of, fmt_iso_wita, i64_of, path_text, strip_html, text};
use eframe::egui::{self, Color32, RichText};
use serde_json::{json, Value};
use std::sync::Arc;

const TEAL: Color32 = Color32::from_rgb(13, 148, 136);
const RED: Color32 = Color32::from_rgb(220, 38, 38);
const AMBER: Color32 = Color32::from_rgb(217, 119, 6);
const GREEN: Color32 = Color32::from_rgb(22, 163, 74);
const GRAY: Color32 = Color32::from_rgb(107, 114, 128);
const PAGE_SIZE: usize = 100;

// ───────────────────────── login ─────────────────────────

pub fn login(app: &mut App, ui: &mut egui::Ui) {
    egui::CentralPanel::default_margins().show(ui, |ui| {
        ui.vertical_centered(|ui| {
            ui.add_space((ui.available_height() / 2.0 - 190.0).max(20.0));
            ui.heading(RichText::new("Ujiin Guru").size(34.0).color(TEAL).strong());
            ui.label(RichText::new("Aplikasi desktop untuk guru & admin").color(GRAY));
            ui.add_space(18.0);
            ui.scope(|ui| {
                ui.set_max_width(360.0);
                ui.label("Alamat server");
                ui.add(
                    egui::TextEdit::singleline(&mut app.server)
                        .hint_text("mis. ujian.sekolah.sch.id")
                        .desired_width(360.0),
                );
                ui.label("Username");
                ui.add(egui::TextEdit::singleline(&mut app.username).desired_width(360.0));
                ui.label("Password");
                let pw = ui.add(
                    egui::TextEdit::singleline(&mut app.password)
                        .password(true)
                        .desired_width(360.0),
                );
                let enter = pw.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter));
                ui.add_space(8.0);
                if app.logging_in {
                    ui.horizontal(|ui| {
                        ui.spinner();
                        ui.label("Masuk...");
                    });
                } else if ui
                    .add_sized([360.0, 36.0], egui::Button::new(RichText::new("Masuk").strong()).fill(TEAL))
                    .clicked()
                    || enter
                {
                    app.start_login();
                }
                if !app.login_err.is_empty() {
                    ui.add_space(6.0);
                    ui.colored_label(RED, &app.login_err);
                }
            });
        });
    });
}

// ───────────────────────── kerangka ─────────────────────────

pub fn shell(app: &mut App, ui: &mut egui::Ui) {
    let name = app.user.as_ref().map(|u| text(u, "name")).unwrap_or_default();
    let role = app.user.as_ref().map(|u| text(u, "role")).unwrap_or_default();

    egui::Panel::left("nav").resizable(false).exact_size(205.0).show(ui, |ui| {
        ui.add_space(8.0);
        ui.heading(RichText::new("Ujiin").color(TEAL).strong());
        ui.label(RichText::new(&name).strong());
        ui.label(RichText::new(if role == "ADMIN" { "Admin" } else { "Guru" }).color(GRAY));
        ui.separator();
        egui::ScrollArea::vertical().show(ui, |ui| {
            for t in app.tabs() {
                let selected = app.tab == t;
                let label = RichText::new(t.title()).size(14.5);
                if ui.add_sized([ui.available_width(), 30.0], egui::Button::selectable(selected, label)).clicked() {
                    app.change_tab(t);
                }
            }
        });
        ui.with_layout(egui::Layout::bottom_up(egui::Align::Min), |ui| {
            ui.add_space(6.0);
            if ui.button("Keluar").clicked() {
                app.logout();
            }
            if ui.button("Buka versi web").clicked() {
                if let Some(n) = &app.net {
                    n.open_web("/dashboard");
                }
            }
        });
    });

    egui::CentralPanel::default_margins().show(ui, |ui| {
        ui.heading(app.tab.title());
        ui.separator();
        match app.tab {
            Tab::Dashboard => dashboard(app, ui),
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
                if ui.add(egui::Button::new(RichText::new("Ya, lanjutkan").color(Color32::WHITE)).fill(RED)).clicked() {
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

fn ask(app: &mut App, text: &str, body: Value, refresh: &[&str]) {
    app.confirm = Some(Confirm {
        text: text.to_string(),
        body,
        refresh: refresh.iter().map(|s| s.to_string()).collect(),
    });
}

// ───────────────────────── helper tampilan ─────────────────────────

/// Muat data + tampilkan status (memuat / offline / galat). None bila belum ada data.
fn load(app: &mut App, ui: &mut egui::Ui, path: &str, ttl: u64) -> Option<Arc<Value>> {
    app.ensure(path, ttl);
    let e = app.store.get(path)?;
    if e.offline {
        ui.colored_label(
            AMBER,
            format!(
                "Mode offline: menampilkan data tersimpan{}. {}",
                if e.saved_at.is_empty() { String::new() } else { format!(" ({})", e.saved_at) },
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
    ui.label(RichText::new(label).color(color).strong());
}

fn status_badge(ui: &mut egui::Ui, status: &str, offline: bool) {
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

fn arr(v: &Value) -> &[Value] {
    v.as_array().map(|a| a.as_slice()).unwrap_or(&[])
}

fn pick_save_name(base: &str, ext: &str) -> std::path::PathBuf {
    let mut p = export::downloads_dir();
    p.push(format!("{}.{}", export::safe_name(base), ext));
    p
}

// ───────────────────────── beranda ─────────────────────────

fn dashboard(app: &mut App, ui: &mut egui::Ui) {
    let Some(d) = load(app, ui, "dashboard", 30) else { return };
    let admin = app.is_admin();
    let mut cards: Vec<(&str, String)> = vec![
        ("Siswa aktif", path_text(&d, "siswaAktif")),
        ("Kelas", path_text(&d, "kelas")),
        ("Mata pelajaran", path_text(&d, "mapel")),
        ("Ujian terbit", path_text(&d, "ujianAktif")),
        ("Ujian yang saya awasi", path_text(&d, "ujianDiawasi")),
        ("Soal saya", path_text(&d, "soalSaya")),
    ];
    if admin {
        cards.push(("Guru", path_text(&d, "guru")));
    }
    ui.horizontal_wrapped(|ui| {
        for (label, value) in cards {
            egui::Frame::group(ui.style()).show(ui, |ui| {
                ui.vertical(|ui| {
                    ui.set_min_width(150.0);
                    ui.label(RichText::new(label).color(GRAY));
                    ui.label(RichText::new(value).size(30.0).strong().color(TEAL));
                });
            });
        }
    });
    ui.add_space(12.0);
    ui.label("Pilih menu di samping untuk memantau ujian, menilai, mengelola soal, dan lainnya.");
    ui.label(RichText::new("Data daftar tersimpan di komputer ini sehingga tetap bisa dilihat saat internet putus.").color(GRAY));
}

// ───────────────────────── monitoring ─────────────────────────

fn monitoring(app: &mut App, ui: &mut egui::Ui) {
    if let Some(id) = app.sel.clone() {
        monitoring_detail(app, ui, &id);
        return;
    }
    let Some(list) = load(app, ui, "monitoring", 20) else { return };
    let items = arr(&list);
    if items.is_empty() {
        ui.label("Belum ada ujian yang perlu diawasi.");
        return;
    }
    egui::ScrollArea::both().auto_shrink(false).show(ui, |ui| {
        egui::Grid::new("mon_list").striped(true).num_columns(7).show(ui, |ui| {
            for h in ["Ujian", "Mapel", "Kelas", "Mulai", "Status", "Peserta", ""] {
                ui.label(RichText::new(h).strong());
            }
            ui.end_row();
            for e in items {
                ui.label(RichText::new(text(e, "title")).strong());
                ui.label(path_text(e, "subject"));
                ui.label(path_text(e, "classes"));
                ui.label(fmt_iso_wita(&text(e, "startTime")));
                status_badge(ui, &text(e, "status"), false);
                ui.label(path_text(e, "attempts"));
                if ui.button("Pantau").clicked() {
                    app.sel = Some(text(e, "id"));
                }
                ui.end_row();
            }
        });
    });
}

fn monitoring_detail(app: &mut App, ui: &mut egui::Ui, id: &str) {
    let key = format!("monitoring/{id}");
    ui.horizontal(|ui| {
        if ui.button("Kembali").clicked() {
            app.sel = None;
        }
    });
    let Some(d) = load(app, ui, &key, 8) else { return };
    let rows = arr(d.get("rows").unwrap_or(&Value::Null));
    let ongoing = rows.iter().filter(|r| text(r, "status") == "ONGOING").count();
    let done = rows.iter().filter(|r| text(r, "status") == "SUBMITTED").count();
    let offline = rows.iter().filter(|r| bool_of(r, "offline")).count();
    let flagged = rows.iter().filter(|r| i64_of(r, "violationCount") > 0).count();

    ui.horizontal_wrapped(|ui| {
        ui.label(RichText::new(text(&d, "title")).size(18.0).strong());
        ui.label(RichText::new(text(&d, "subject")).color(GRAY));
        ui.label(format!(
            "• {} peserta • {} mengerjakan • {} selesai • {} terputus • {} melanggar",
            rows.len(),
            ongoing,
            done,
            offline,
            flagged
        ));
    });

    // token
    ui.horizontal(|ui| {
        ui.label("Token:");
        let token = text(&d, "token");
        ui.label(RichText::new(if token.is_empty() { "(belum ada)".into() } else { token.clone() }).monospace().size(18.0).strong());
        if ui.button("Buat token baru").clicked() {
            app.send_rpc(&[&key, "monitoring"], json!({"action":"generateExamToken","args":[id]}));
        }
        if !token.is_empty() && ui.button("Salin").clicked() {
            ui.ctx().copy_text(token);
        }
    });

    // pengumuman & tambah waktu
    ui.horizontal(|ui| {
        let f = app.form.entry("mon.text".into()).or_default();
        ui.add(egui::TextEdit::singleline(f).hint_text("Pengumuman ke layar siswa...").desired_width(340.0));
        let msg = f.clone();
        if ui.button("Kirim pengumuman").clicked() && !msg.trim().is_empty() {
            app.form.insert("mon.text".into(), String::new());
            app.send_rpc(&[], json!({"action":"kirimPengumumanUjian","args":[id, msg]}));
        }
        ui.separator();
        egui::ComboBox::from_id_salt("mnt")
            .selected_text(format!("+{} menit", app.minutes))
            .show_ui(ui, |ui| {
                for m in [5, 10, 15, 30] {
                    ui.selectable_value(&mut app.minutes, m, format!("+{m} menit"));
                }
            });
        if ui.button("Tambah waktu semua").clicked() {
            ask(
                app,
                &format!("Tambah {} menit untuk SEMUA siswa yang sedang mengerjakan?", app.minutes),
                json!({"action":"tambahWaktuUjian","args":[id, app.minutes, Value::Null]}),
                &[&key],
            );
        }
    });
    ui.separator();

    egui::ScrollArea::both().auto_shrink(false).show(ui, |ui| {
        egui::Grid::new("mon_detail").striped(true).num_columns(8).show(ui, |ui| {
            for h in ["Nama", "NISN", "Kelas", "Status", "Pelanggaran", "Nilai", "Waktu +", "Aksi"] {
                ui.label(RichText::new(h).strong());
            }
            ui.end_row();

            // yang perlu perhatian di atas
            let mut sorted: Vec<&Value> = rows.iter().collect();
            sorted.sort_by_key(|r| {
                let s = text(r, "status");
                if s == "CHEATED" {
                    1
                } else if bool_of(r, "offline") {
                    0
                } else if s == "ONGOING" && i64_of(r, "violationCount") > 0 {
                    2
                } else if s == "ONGOING" {
                    3
                } else if s == "NOT_STARTED" {
                    4
                } else {
                    5
                }
            });
            for r in sorted {
                let status = text(r, "status");
                let viol = i64_of(r, "violationCount");
                ui.label(RichText::new(text(r, "name")).strong());
                ui.label(text(r, "nisn"));
                ui.label(text(r, "className"));
                status_badge(ui, &status, bool_of(r, "offline"));
                ui.label(if viol > 0 { RichText::new(format!("{viol}")).color(RED).strong() } else { RichText::new("0") });
                ui.label(path_text(r, "score"));
                let extra = i64_of(r, "extraSeconds");
                ui.label(if extra > 0 { format!("+{} mnt", extra / 60) } else { String::new() });
                ui.horizontal(|ui| {
                    let sid = text(r, "studentId");
                    if status == "ONGOING" && ui.small_button("+ Waktu").clicked() {
                        app.send_rpc(&[&key], json!({"action":"tambahWaktuUjian","args":[id, app.minutes, sid.clone()]}));
                    }
                    if status != "NOT_STARTED" && ui.small_button("Reset sesi").clicked() {
                        ask(
                            app,
                            &format!("Reset sesi {}? Pengerjaannya akan dihapus dan siswa bisa mengulang.", text(r, "name")),
                            json!({"action":"resetSesiSiswa","form":{"examId":id,"studentId":sid}}),
                            &[&key],
                        );
                    }
                });
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
    let Some(list) = load(app, ui, "penilaian", 60) else { return };
    let items = arr(&list);
    if items.is_empty() {
        ui.label("Belum ada ujian pada tahun ajaran aktif.");
        return;
    }
    egui::ScrollArea::both().auto_shrink(false).show(ui, |ui| {
        egui::Grid::new("pen_list").striped(true).num_columns(7).show(ui, |ui| {
            for h in ["Ujian", "Mapel", "Jenis", "Kelas", "Mulai", "Peserta", ""] {
                ui.label(RichText::new(h).strong());
            }
            ui.end_row();
            for e in items {
                ui.label(RichText::new(text(e, "title")).strong());
                ui.label(path_text(e, "subject"));
                ui.label(path_text(e, "examType"));
                ui.label(path_text(e, "classes"));
                ui.label(fmt_iso_wita(&text(e, "startTime")));
                ui.label(path_text(e, "attempts"));
                if ui.button("Lihat nilai").clicked() {
                    app.sel = Some(text(e, "id"));
                }
                ui.end_row();
            }
        });
    });
}

fn penilaian_detail(app: &mut App, ui: &mut egui::Ui, id: &str) {
    let key = format!("penilaian/{id}");
    ui.horizontal(|ui| {
        if ui.button("Kembali").clicked() {
            app.sel = None;
        }
    });
    let Some(d) = load(app, ui, &key, 30) else { return };
    let rows = arr(d.get("rows").unwrap_or(&Value::Null));
    let title = text(&d, "title");
    let scores: Vec<f64> = rows
        .iter()
        .filter(|r| text(r, "status") != "ONGOING")
        .filter_map(|r| r.get("score").and_then(|s| s.as_f64()))
        .collect();
    let avg = if scores.is_empty() { 0.0 } else { scores.iter().sum::<f64>() / scores.len() as f64 };

    ui.horizontal_wrapped(|ui| {
        ui.label(RichText::new(&title).size(18.0).strong());
        ui.label(RichText::new(text(&d, "subject")).color(GRAY));
        ui.label(format!(
            "• {} peserta • rata-rata {:.1} • tertinggi {:.1} • terendah {:.1}",
            rows.len(),
            avg,
            scores.iter().cloned().fold(0.0, f64::max),
            if scores.is_empty() { 0.0 } else { scores.iter().cloned().fold(f64::MAX, f64::min) }
        ));
    });

    let sheet = Sheet {
        title: "Rekap Nilai",
        subtitle: &format!("{} | {} | {}", title, text(&d, "subject"), path_text(&d, "classes")),
        headers: ["No", "NISN", "Nama", "Kelas", "Status", "Pelanggaran", "Nilai"].iter().map(|s| s.to_string()).collect(),
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
        if ui.button("Simpan Excel (.xlsx)").clicked() {
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
        if ui.button("Koreksi esai / cetak di web").clicked() {
            if let Some(n) = &app.net {
                n.open_web("/guru/penilaian");
            }
        }
    });
    ui.separator();
    egui::ScrollArea::both().auto_shrink(false).show(ui, |ui| {
        egui::Grid::new("pen_detail").striped(true).num_columns(7).show(ui, |ui| {
            for h in ["No", "NISN", "Nama", "Kelas", "Status", "Pelanggaran", "Nilai"] {
                ui.label(RichText::new(h).strong());
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
                ui.end_row();
            }
        });
    });
}

// ───────────────────────── bank soal ─────────────────────────

fn bank_soal(app: &mut App, ui: &mut egui::Ui) {
    if let Some(sid) = app.sel.clone() {
        soal_list(app, ui, &sid);
        return;
    }
    let Some(list) = load(app, ui, "soal", 60) else { return };
    let items = arr(&list);
    if items.is_empty() {
        ui.label("Belum ada mata pelajaran yang Anda ampu.");
        return;
    }
    ui.horizontal(|ui| {
        if ui.button("Tambah / ubah soal di web").clicked() {
            if let Some(n) = &app.net {
                n.open_web("/guru/soal");
            }
        }
    });
    egui::Grid::new("soal_subjects").striped(true).num_columns(4).show(ui, |ui| {
        for h in ["Mata pelajaran", "Kelas", "Jumlah soal", ""] {
            ui.label(RichText::new(h).strong());
        }
        ui.end_row();
        for s in items {
            ui.label(RichText::new(text(s, "name")).strong());
            let classes: Vec<String> = arr(s.get("classes").unwrap_or(&Value::Null)).iter().map(|c| text(c, "name")).collect();
            ui.label(classes.join(", "));
            ui.label(path_text(s, "questionCount"));
            if ui.button("Buka").clicked() {
                app.sel = Some(text(s, "id"));
                app.page = 0;
                app.filter.clear();
            }
            ui.end_row();
        }
    });
}

fn soal_list(app: &mut App, ui: &mut egui::Ui, subject_id: &str) {
    ui.horizontal(|ui| {
        if ui.button("Kembali").clicked() {
            app.sel = None;
        }
        ui.add(egui::TextEdit::singleline(&mut app.filter).hint_text("Cari teks soal...").desired_width(260.0));
        if ui.button("Cari").clicked() {
            app.page = 0;
            let k = format!("soal/{subject_id}?q={}&page=1", urlenc(&app.filter));
            app.store.remove(&k);
        }
    });
    let key = format!("soal/{subject_id}?q={}&page={}", urlenc(&app.filter), app.page + 1);
    let Some(d) = load(app, ui, &key, 60) else { return };
    let total = i64_of(&d, "total");
    let page_size = i64_of(&d, "pageSize").max(1);
    let pages = ((total + page_size - 1) / page_size).max(1) as usize;
    ui.horizontal(|ui| {
        ui.label(format!("{total} soal • halaman {}/{pages}", app.page + 1));
        if app.page > 0 && ui.button("<").clicked() {
            app.page -= 1;
        }
        if app.page + 1 < pages && ui.button(">").clicked() {
            app.page += 1;
        }
    });
    egui::ScrollArea::both().auto_shrink(false).show(ui, |ui| {
        egui::Grid::new("soal_items").striped(true).num_columns(6).show(ui, |ui| {
            for h in ["Soal", "Jenis", "Skor", "Kunci", "Kelas", ""] {
                ui.label(RichText::new(h).strong());
            }
            ui.end_row();
            for q in arr(d.get("items").unwrap_or(&Value::Null)) {
                let plain = strip_html(&text(q, "text"));
                let short: String = plain.chars().take(110).collect();
                ui.label(if plain.chars().count() > 110 { format!("{short}...") } else { short }).on_hover_text(plain);
                ui.label(match text(q, "type").as_str() {
                    "MULTIPLE_CHOICE" => "Pilihan ganda",
                    "MULTIPLE_CHOICE_COMPLEX" => "PG kompleks",
                    "MATCHING" => "Menjodohkan",
                    "ESSAY" => "Esai",
                    "TRUE_FALSE" => "Benar/Salah",
                    _ => "-",
                });
                ui.label(path_text(q, "score"));
                let key_txt: String = strip_html(&text(q, "correctAnswer")).chars().take(24).collect();
                ui.label(key_txt);
                ui.label(path_text(q, "classes"));
                if ui.small_button("Hapus").clicked() {
                    ask(
                        app,
                        "Hapus soal ini? Tindakan ini tidak bisa dibatalkan.",
                        json!({"action":"deleteQuestion","args":[text(q, "id")]}),
                        &[&key, "soal"],
                    );
                }
                ui.end_row();
            }
        });
    });
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
    create: Option<(&'static str, &'static [Field])>,
    acts: &'static [Act],
    web: Option<(&'static str, &'static str)>,
}

const fn field(label: &'static str, name: &'static str) -> Field {
    Field { label, name, password: false, choices: &[] }
}

static KELAS: Spec = Spec {
    tab: "kelas",
    path: "admin/kelas",
    cols: &[("Nama", "name"), ("Tingkat", "level"), ("Jumlah siswa", "students")],
    searchable: false,
    create: Some(("createClass", &[field("Nama kelas", "name"), field("Tingkat (mis. 10)", "level")])),
    acts: &[Act { label: "Hapus", action: "deleteClass", kind: Kind::Arg, danger: true }],
    web: None,
};
static AGAMA: Spec = Spec {
    tab: "agama",
    path: "admin/agama",
    cols: &[("Nama", "name")],
    searchable: false,
    create: Some(("createReligion", &[field("Nama agama", "name")])),
    acts: &[Act { label: "Hapus", action: "deleteReligion", kind: Kind::Form, danger: true }],
    web: None,
};
static JENIS_UJIAN: Spec = Spec {
    tab: "jenis",
    path: "admin/jenis-ujian",
    cols: &[("Nama", "name"), ("Kode", "code")],
    searchable: false,
    create: Some(("createExamType", &[field("Nama jenis ujian", "name"), field("Kode (unik)", "code")])),
    acts: &[Act { label: "Hapus", action: "deleteExamType", kind: Kind::Form, danger: true }],
    web: None,
};
static TAHUN: Spec = Spec {
    tab: "tahun",
    path: "admin/tahun-ajaran",
    cols: &[("Tahun ajaran", "year"), ("Semester", "semester"), ("Aktif", "active")],
    searchable: false,
    create: Some((
        "createAcademicYear",
        &[field("Tahun (mis. 2026/2027)", "year"), Field { label: "Semester", name: "semester", password: false, choices: &["GANJIL", "GENAP"] }],
    )),
    acts: &[
        Act { label: "Jadikan aktif", action: "setActiveAcademicYear", kind: Kind::Form, danger: false },
        Act { label: "Hapus", action: "deleteAcademicYear", kind: Kind::Form, danger: true },
    ],
    web: None,
};
static PENGGUNA: Spec = Spec {
    tab: "pengguna",
    path: "admin/pengguna",
    cols: &[("Nama", "name"), ("Username", "username"), ("Peran", "role")],
    searchable: true,
    create: Some((
        "createUser",
        &[
            field("Nama lengkap", "name"),
            field("Username", "username"),
            Field { label: "Password (min. 8)", name: "password", password: true, choices: &[] },
            Field { label: "Peran", name: "role", password: false, choices: &["GURU", "ADMIN"] },
        ],
    )),
    acts: &[Act { label: "Hapus", action: "deleteUser", kind: Kind::Arg, danger: true }],
    web: None,
};
static MAPEL: Spec = Spec {
    tab: "mapel",
    path: "admin/mapel",
    cols: &[("Mata pelajaran", "name"), ("Agama", "religion"), ("Pengampu (kelas - guru)", "assignments")],
    searchable: true,
    create: None,
    acts: &[Act { label: "Hapus", action: "deleteSubject", kind: Kind::Arg, danger: true }],
    web: Some(("Tambah / atur pengampu di web", "/admin/master/mapel")),
};
static SISWA: Spec = Spec {
    tab: "siswa",
    path: "admin/siswa",
    cols: &[("NISN", "nisn"), ("Nama", "name"), ("Kelas", "class.name"), ("Status", "status"), ("Agama", "religion.name")],
    searchable: true,
    create: None,
    acts: &[Act { label: "Hapus", action: "deleteStudent", kind: Kind::Arg, danger: true }],
    web: Some(("Tambah / impor siswa di web", "/admin/master/siswa")),
};
static JADWAL: Spec = Spec {
    tab: "jadwal",
    path: "admin/jadwal",
    cols: &[
        ("Judul", "title"),
        ("Mapel", "subject"),
        ("Jenis", "examType"),
        ("Kelas", "classes"),
        ("Pengawas", "supervisor"),
        ("Mulai", "startTime"),
        ("Status", "status"),
        ("Token", "token"),
    ],
    searchable: true,
    create: None,
    acts: &[
        Act { label: "Buat token", action: "generateExamToken", kind: Kind::Arg, danger: false },
        Act { label: "Hapus", action: "deleteExam", kind: Kind::Form, danger: true },
    ],
    web: Some(("Buat / ubah jadwal di web", "/admin/jadwal")),
};

fn cell_text(row: &Value, path: &str) -> String {
    if path.ends_with("Time") {
        return fmt_iso_wita(&path_text(row, path));
    }
    match path_text(row, path).as_str() {
        "true" => "Ya".into(),
        "false" => "".into(),
        s => s.to_string(),
    }
}

fn admin_table(app: &mut App, ui: &mut egui::Ui, spec: &'static Spec) {
    let refresh = [spec.path];
    ui.horizontal(|ui| {
        if spec.searchable {
            ui.add(egui::TextEdit::singleline(&mut app.filter).hint_text("Cari...").desired_width(240.0));
        }
        if let Some((label, path)) = spec.web {
            if ui.button(label).clicked() {
                if let Some(n) = &app.net {
                    n.open_web(path);
                }
            }
        }
        if ui.button("Muat ulang").clicked() {
            app.fetch(spec.path);
        }
    });

    if let Some((action, fields)) = spec.create {
        ui.collapsing("Tambah baru", |ui| {
            for f in fields {
                ui.horizontal(|ui| {
                    ui.label(f.label);
                    let key = format!("{}.{}", spec.tab, f.name);
                    if f.choices.is_empty() {
                        let v = app.form.entry(key).or_default();
                        ui.add(egui::TextEdit::singleline(v).password(f.password).desired_width(240.0));
                    } else {
                        let v = app.form.entry(key).or_insert_with(|| f.choices[0].to_string());
                        egui::ComboBox::from_id_salt(format!("c-{}", f.name)).selected_text(v.clone()).show_ui(ui, |ui| {
                            for c in f.choices {
                                ui.selectable_value(v, c.to_string(), *c);
                            }
                        });
                    }
                });
            }
            if ui.button("Simpan").clicked() {
                let mut form = serde_json::Map::new();
                for f in fields {
                    let v = app.form.get(&format!("{}.{}", spec.tab, f.name)).cloned().unwrap_or_else(|| {
                        f.choices.first().map(|c| c.to_string()).unwrap_or_default()
                    });
                    form.insert(f.name.to_string(), Value::String(v));
                }
                app.send_rpc(&refresh, json!({"action": action, "form": form}));
                for f in fields.iter().filter(|f| f.choices.is_empty()) {
                    app.form.remove(&format!("{}.{}", spec.tab, f.name));
                }
            }
        });
    }
    ui.separator();

    let Some(d) = load(app, ui, spec.path, 60) else { return };
    let needle = app.filter.to_lowercase();
    let all = arr(&d);
    let filtered: Vec<&Value> = all
        .iter()
        .filter(|r| {
            needle.is_empty()
                || spec.cols.iter().any(|(_, p)| cell_text(r, p).to_lowercase().contains(&needle))
        })
        .collect();
    let pages = ((filtered.len() + PAGE_SIZE - 1) / PAGE_SIZE).max(1);
    if app.page >= pages {
        app.page = 0;
    }
    ui.horizontal(|ui| {
        ui.label(format!("{} data", filtered.len()));
        if pages > 1 {
            if app.page > 0 && ui.button("<").clicked() {
                app.page -= 1;
            }
            ui.label(format!("halaman {}/{pages}", app.page + 1));
            if app.page + 1 < pages && ui.button(">").clicked() {
                app.page += 1;
            }
        }
    });

    egui::ScrollArea::both().auto_shrink(false).show(ui, |ui| {
        egui::Grid::new(format!("grid-{}", spec.tab))
            .striped(true)
            .num_columns(spec.cols.len() + 1)
            .show(ui, |ui| {
                for (h, _) in spec.cols {
                    ui.label(RichText::new(*h).strong());
                }
                ui.label("");
                ui.end_row();
                for r in filtered.iter().skip(app.page * PAGE_SIZE).take(PAGE_SIZE) {
                    for (_, p) in spec.cols {
                        ui.label(cell_text(r, p));
                    }
                    ui.horizontal(|ui| {
                        let id = text(r, "id");
                        for a in spec.acts {
                            let label = RichText::new(a.label);
                            let label = if a.danger { label.color(RED) } else { label };
                            if ui.small_button(label).clicked() {
                                let body = match a.kind {
                                    Kind::Arg => json!({"action": a.action, "args": [id]}),
                                    Kind::Form => json!({"action": a.action, "form": {"id": id}}),
                                };
                                if a.danger {
                                    let name = cell_text(r, spec.cols[0].1);
                                    ask(app, &format!("{} \"{}\"? Tindakan ini tidak bisa dibatalkan.", a.label, name), body, &refresh);
                                } else {
                                    app.send_rpc(&refresh, body);
                                }
                            }
                        }
                    });
                    ui.end_row();
                }
            });
    });
}

// ───────────────────────── arsip ─────────────────────────

fn arsip(app: &mut App, ui: &mut egui::Ui) {
    ui.label("Unduh arsip sebelum meluluskan siswa atau berganti tahun ajaran. File disimpan ke folder Unduhan.");
    ui.add_space(6.0);
    let Some(years) = load(app, ui, "admin/tahun-ajaran", 120) else { return };
    let items = arr(&years);
    if app.sel.is_none() {
        app.sel = items.first().map(|y| text(y, "id"));
    }
    ui.horizontal(|ui| {
        let current = items
            .iter()
            .find(|y| Some(text(y, "id")) == app.sel)
            .map(|y| format!("{} - {}", text(y, "year"), text(y, "semester")))
            .unwrap_or_else(|| "Pilih tahun ajaran".into());
        egui::ComboBox::from_id_salt("arsip-year").selected_text(current).show_ui(ui, |ui| {
            for y in items {
                ui.selectable_value(&mut app.sel, Some(text(y, "id")), format!("{} - {}", text(y, "year"), text(y, "semester")));
            }
        });
        if ui.button("Unduh arsip nilai (CSV)").clicked() {
            if let (Some(id), Some(n)) = (app.sel.clone(), app.net.clone()) {
                n.download(&format!("/api/admin/arsip?type=nilai&yearId={id}"), pick_save_name("Arsip_Nilai", "csv"));
            }
        }
        if ui.button("Unduh daftar siswa (CSV)").clicked() {
            if let Some(n) = app.net.clone() {
                n.download("/api/admin/arsip?type=siswa", pick_save_name("Arsip_Daftar_Siswa", "csv"));
            }
        }
    });
    ui.add_space(14.0);
    ui.separator();
    ui.label(RichText::new("Kenaikan kelas & kelulusan").strong());
    ui.label("Proses ini memilih banyak siswa sekaligus, jadi dikerjakan di versi web.");
    if ui.button("Buka Kenaikan Kelas di web").clicked() {
        if let Some(n) = &app.net {
            n.open_web("/admin/kenaikan-kelas");
        }
    }
    let _ = util::text;
}
