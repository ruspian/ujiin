//! Halaman "hidup": Beranda (kabar, cincin progres, ujian diawasi) dan
//! halaman pengawas (denah kotak siswa, hitung mundur, aliran kejadian).

use crate::app::{App, Tab};
use crate::theme::{self, AMBER, BORDER, GRAY, GREEN, INK, RED, TEAL};
use crate::util::{bool_of, fmt_iso_wita, hhmm_wita, i64_of, iso_secs, text};
use crate::views::{arr, ask, load, status_badge};
use eframe::egui::{self, Color32, Pos2, RichText, Sense, Stroke, Vec2};
use serde_json::{json, Value};
use std::time::Duration;

fn tab_dari_nama(n: &str) -> Option<Tab> {
    Some(match n {
        "Monitoring" => Tab::Monitoring,
        "Penilaian" => Tab::Penilaian,
        "BankSoal" => Tab::BankSoal,
        "Jadwal" => Tab::Jadwal,
        "Mapel" => Tab::Mapel,
        "Tahun" => Tab::TahunAjaran,
        _ => return None,
    })
}

fn tone_color(t: &str) -> Color32 {
    match t {
        "good" => GREEN,
        "warn" => AMBER,
        _ => theme::BLUE,
    }
}

fn sapaan(now_iso: &str) -> &'static str {
    let h: i64 = hhmm_wita(now_iso)
        .split(':')
        .next()
        .and_then(|x| x.parse().ok())
        .unwrap_or(9);
    match h {
        4..=10 => "Selamat pagi",
        11..=14 => "Selamat siang",
        15..=17 => "Selamat sore",
        _ => "Selamat malam",
    }
}

/// Cincin progres: busur berwarna di atas lingkaran abu.
fn ring(ui: &mut egui::Ui, frac: f32, color: Color32, big: &str, label: &str) {
    ui.vertical(|ui| {
        ui.set_width(130.0);
        let (rect, _) = ui.allocate_exact_size(Vec2::splat(104.0), Sense::hover());
        let c = Pos2::new(ui.max_rect().center().x, rect.center().y);
        let r = 44.0;
        let p = ui.painter();
        p.circle_stroke(c, r, Stroke::new(10.0, BORDER));
        let frac = frac.clamp(0.0, 1.0);
        if frac > 0.0 {
            let n = ((frac * 90.0) as usize).max(2);
            let pts: Vec<Pos2> = (0..=n)
                .map(|i| {
                    let a = -std::f32::consts::FRAC_PI_2
                        + frac * std::f32::consts::TAU * (i as f32 / n as f32);
                    Pos2::new(c.x + r * a.cos(), c.y + r * a.sin())
                })
                .collect();
            p.add(egui::Shape::line(pts, Stroke::new(10.0, color)));
        }
        p.text(
            c,
            egui::Align2::CENTER_CENTER,
            big,
            egui::FontId::proportional(22.0),
            INK,
        );
        ui.vertical_centered(|ui| {
            ui.label(RichText::new(label).size(12.5).color(GRAY));
        });
    });
}

/// Hujan konfeti singkat (merayakan semua esai terkoreksi).
fn confetti(ui: &egui::Ui, t: f64) {
    let screen = ui.ctx().content_rect();
    let p = ui.ctx().layer_painter(egui::LayerId::new(
        egui::Order::Foreground,
        egui::Id::new("confetti"),
    ));
    let colors = [
        TEAL,
        AMBER,
        GREEN,
        RED,
        theme::BLUE,
        Color32::from_rgb(236, 72, 153),
    ];
    for i in 0..70u32 {
        let h = (i.wrapping_mul(2654435761)) as f64 / u32::MAX as f64;
        let h2 = (i.wrapping_mul(40503).wrapping_add(7)) as f64 % 1000.0 / 1000.0;
        let speed = 180.0 + 220.0 * h2;
        let y = (t * speed - 120.0 * h) as f32 - 20.0;
        if y > screen.height() {
            continue;
        }
        let x = screen.left()
            + screen.width() * (h as f32)
            + ((t * 3.0 + i as f64).sin() as f32) * 14.0;
        let fade = (1.0 - (t / 4.0)).clamp(0.0, 1.0) as f32;
        let c = colors[(i % 6) as usize].gamma_multiply(fade);
        p.rect_filled(
            egui::Rect::from_center_size(Pos2::new(x, y), Vec2::new(7.0, 11.0)),
            2.0,
            c,
        );
    }
}

pub fn beranda(app: &mut App, ui: &mut egui::Ui) {
    let focused = ui.ctx().input(|i| i.focused);
    let live = app
        .store
        .get("beranda")
        .and_then(|e| e.value.get("progress").map(|p| i64_of(p, "ujianLive") > 0))
        .unwrap_or(false);
    let ttl = if !focused {
        600
    } else if live {
        15
    } else {
        60
    };
    let Some(d) = load(app, ui, "beranda", ttl) else {
        return;
    };
    let now = text(&d, "now");
    let prog = d.get("progress").cloned().unwrap_or(Value::Null);
    let t_now = ui.ctx().input(|i| i.time);

    egui::ScrollArea::vertical()
        .auto_shrink([false, false])
        .show(ui, |ui| {
            ui.label(
                RichText::new(format!("{}, {}", sapaan(&now), text(&d, "name")))
                    .size(22.0)
                    .strong()
                    .color(INK),
            );
            ui.label(
                RichText::new(format!(
                    "{} WITA • Tahun ajaran {}",
                    fmt_iso_wita(&now),
                    text(&d, "tahunAjaran")
                ))
                .color(GRAY),
            );
            ui.add_space(12.0);

            // cincin progres
            let esai_total = i64_of(&prog, "esaiTotal");
            let esai_done = i64_of(&prog, "esaiSelesai");
            let diawasi = i64_of(&prog, "ujianDiawasi");
            let ujian_live = i64_of(&prog, "ujianLive");
            let semua_beres = esai_total > 0 && esai_done >= esai_total;
            theme::card(ui, |ui| {
                ui.set_width(ui.available_width());
                ui.horizontal_top(|ui| {
                    ui.spacing_mut().item_spacing.x = 28.0;
                    ring(
                        ui,
                        if esai_total > 0 {
                            esai_done as f32 / esai_total as f32
                        } else {
                            1.0
                        },
                        GREEN,
                        &format!("{esai_done}/{esai_total}"),
                        "Esai dinilai",
                    );
                    ring(
                        ui,
                        if diawasi > 0 {
                            ujian_live as f32 / diawasi as f32
                        } else {
                            0.0
                        },
                        TEAL,
                        &format!("{ujian_live}"),
                        "Ujian berlangsung",
                    );
                    ring(
                        ui,
                        (i64_of(&prog, "soalBaru") as f32 / 20.0).min(1.0),
                        theme::BLUE,
                        &format!("{}", i64_of(&prog, "soalBaru")),
                        "Soal baru (pekan ini)",
                    );
                    ui.vertical(|ui| {
                        ui.add_space(14.0);
                        if semua_beres {
                            ui.label(
                                RichText::new("Semua esai sudah dinilai. Mantap!")
                                    .size(16.0)
                                    .strong()
                                    .color(GREEN),
                            );
                        } else if esai_total > 0 {
                            ui.label(
                                RichText::new(format!(
                                    "{} esai menunggu dinilai",
                                    esai_total - esai_done
                                ))
                                .size(16.0)
                                .strong(),
                            );
                        } else {
                            ui.label(
                                RichText::new("Belum ada esai yang perlu dinilai.")
                                    .size(16.0)
                                    .strong(),
                            );
                        }
                        ui.label(
                            RichText::new(format!(
                                "Jumlah soal saya: {}",
                                i64_of(&prog, "soalSaya")
                            ))
                            .color(GRAY),
                        );
                    });
                });
            });

            // perayaan kecil, sekali per sesi
            if semua_beres && ujian_live == 0 {
                let key = "beranda.konfeti";
                let t0 = match app.form.get(key).and_then(|s| s.parse::<f64>().ok()) {
                    Some(t) => t,
                    None => {
                        app.form.insert(key.into(), t_now.to_string());
                        t_now
                    }
                };
                if t_now - t0 < 4.0 {
                    confetti(ui, t_now - t0);
                    ui.ctx().request_repaint();
                }
            }

            ui.add_space(14.0);
            ui.label(RichText::new("Kabar hari ini").size(16.0).strong());
            ui.add_space(4.0);
            let mut go: Option<(Tab, Option<String>)> = None;
            for k in arr(d.get("kabar").unwrap_or(&Value::Null)) {
                let color = tone_color(&text(k, "tone"));
                let tujuan = tab_dari_nama(&text(k, "tab"));
                let r = egui::Frame::new()
                    .fill(theme::CARD)
                    .stroke(Stroke::new(1.0, BORDER))
                    .corner_radius(egui::CornerRadius::same(10))
                    .inner_margin(egui::Margin {
                        left: 18,
                        right: 14,
                        top: 10,
                        bottom: 10,
                    })
                    .show(ui, |ui| {
                        ui.set_width(ui.available_width());
                        ui.horizontal(|ui| {
                            ui.label(RichText::new(text(k, "title")).strong());
                            let sc = match text(k, "scope").as_str() {
                                "guru" => "Guru",
                                "sistem" => "Sistem",
                                _ => "Siswa",
                            };
                            theme::pill(ui, sc, color);
                        });
                        ui.label(RichText::new(text(k, "text")).color(GRAY));
                    });
                let rect = r.response.rect;
                ui.painter().rect_filled(
                    egui::Rect::from_min_size(
                        rect.min + Vec2::new(0.0, 6.0),
                        Vec2::new(4.0, rect.height() - 12.0),
                    ),
                    2.0,
                    color,
                );
                if tujuan.is_some() {
                    let resp =
                        ui.interact(rect, ui.id().with(("kabar", text(k, "id"))), Sense::click());
                    if resp.hovered() {
                        ui.ctx().set_cursor_icon(egui::CursorIcon::PointingHand);
                    }
                    if resp.clicked() {
                        let sel = k.get("sel").and_then(|s| s.as_str()).map(String::from);
                        go = tujuan.map(|t| (t, sel));
                    }
                }
                ui.add_space(6.0);
            }
            if arr(d.get("kabar").unwrap_or(&Value::Null)).is_empty() {
                ui.label(RichText::new("Belum ada kabar. Tenang dulu hari ini.").color(GRAY));
            }

            // ujian yang saya awasi
            ui.add_space(12.0);
            ui.label(RichText::new("Ujian yang saya awasi").size(16.0).strong());
            ui.add_space(4.0);
            let list = arr(d.get("diawasi").unwrap_or(&Value::Null));
            if list.is_empty() {
                ui.label(RichText::new("Belum ada jadwal mengawas.").color(GRAY));
            }
            for e in list {
                let is_live = bool_of(e, "live");
                theme::card(ui, |ui| {
                    ui.set_width(ui.available_width());
                    ui.horizontal(|ui| {
                        ui.vertical(|ui| {
                            ui.horizontal(|ui| {
                                ui.label(RichText::new(text(e, "title")).strong());
                                if is_live {
                                    let a = 0.55 + 0.45 * (t_now * 3.0).sin().abs() as f32;
                                    theme::pill(ui, "LANGSUNG", RED.gamma_multiply(a));
                                }
                            });
                            let kelas: Vec<String> = arr(e.get("classes").unwrap_or(&Value::Null))
                                .iter()
                                .filter_map(|c| c.as_str().map(String::from))
                                .collect();
                            ui.label(
                                RichText::new(format!(
                                    "{} • {} • {}",
                                    text(e, "subject"),
                                    kelas.join(", "),
                                    fmt_iso_wita(&text(e, "startTime"))
                                ))
                                .color(GRAY),
                            );
                            ui.label(format!(
                            "{} peserta • {} mengerjakan • {} selesai • {} terputus • {} melanggar",
                            i64_of(e, "peserta"),
                            i64_of(e, "mengerjakan"),
                            i64_of(e, "selesai"),
                            i64_of(e, "terputus"),
                            i64_of(e, "melanggar")
                        ));
                        });
                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            if ui.add(theme::primary("Pantau")).clicked() {
                                go = Some((Tab::Monitoring, Some(text(e, "id"))));
                            }
                        });
                    });
                });
                ui.add_space(6.0);
            }

            if let Some((tab, sel)) = go {
                app.change_tab(tab);
                app.sel = sel;
            }
        });
}

// ───────────────────────── pengawas hidup ─────────────────────────

struct Gaya {
    fill: Color32,
    stroke: Color32,
    teks: Color32,
    label: &'static str,
    denyut: bool,
}

fn gaya(status: &str, offline: bool, viol: i64) -> Gaya {
    let soft = |r, g, b| Color32::from_rgb(r, g, b);
    match status {
        "CHEATED" => Gaya {
            fill: RED,
            stroke: RED,
            teks: Color32::WHITE,
            label: "Diblokir",
            denyut: false,
        },
        "SUBMITTED" => Gaya {
            fill: soft(220, 252, 231),
            stroke: GREEN,
            teks: INK,
            label: "Selesai",
            denyut: false,
        },
        "ONGOING" if offline => Gaya {
            fill: soft(254, 243, 199),
            stroke: AMBER,
            teks: INK,
            label: "Terputus",
            denyut: true,
        },
        "ONGOING" if viol > 0 => Gaya {
            fill: soft(254, 226, 226),
            stroke: RED,
            teks: INK,
            label: "Melanggar",
            denyut: true,
        },
        "ONGOING" => Gaya {
            fill: theme::TEAL_SOFT,
            stroke: TEAL,
            teks: INK,
            label: "Mengerjakan",
            denyut: true,
        },
        _ => Gaya {
            fill: soft(241, 245, 249),
            stroke: BORDER,
            teks: GRAY,
            label: "Belum masuk",
            denyut: false,
        },
    }
}

fn singkat(s: &str, n: usize) -> String {
    if s.chars().count() <= n {
        s.to_string()
    } else {
        format!("{}…", s.chars().take(n - 1).collect::<String>())
    }
}

fn hitung_mundur(d: &Value, fetched: Duration) -> (String, Color32) {
    let (Some(now), Some(end)) = (iso_secs(&text(d, "now")), iso_secs(&text(d, "endTime"))) else {
        return ("--:--:--".into(), GRAY);
    };
    let start = iso_secs(&text(d, "startTime")).unwrap_or(0);
    let now = now + fetched.as_secs() as i64;
    let fmt = |s: i64| format!("{:02}:{:02}:{:02}", s / 3600, (s % 3600) / 60, s % 60);
    if now < start {
        (format!("Mulai {}", fmt(start - now)), GRAY)
    } else if now >= end {
        ("Waktu habis".into(), GRAY)
    } else {
        let left = end - now;
        (fmt(left), if left < 300 { RED } else { INK })
    }
}

pub fn pantau(app: &mut App, ui: &mut egui::Ui, id: &str) {
    let key = format!("monitoring/{id}");
    let focused = ui.ctx().input(|i| i.focused);
    let (live, fetched) = match app.store.get(&key) {
        Some(e) if e.has_value => {
            let rows_live = arr(e.value.get("rows").unwrap_or(&Value::Null))
                .iter()
                .any(|r| text(r, "status") == "ONGOING");
            (rows_live, e.fetched.elapsed())
        }
        _ => (false, Duration::ZERO),
    };
    // segarkan otomatis hanya saat jendela terlihat dan ujian berjalan
    let ttl = if focused && live { 5 } else { 600 };

    if ui.button("Kembali").clicked() {
        app.sel = None;
        app.form.remove("mon.pick");
        return;
    }
    let Some(d) = load(app, ui, &key, ttl) else {
        return;
    };
    let rows = arr(d.get("rows").unwrap_or(&Value::Null));
    let events = arr(d.get("events").unwrap_or(&Value::Null));
    let t = ui.ctx().input(|i| i.time);

    let total = rows.len() as i64;
    let ongoing = rows
        .iter()
        .filter(|r| text(r, "status") == "ONGOING")
        .count() as i64;
    let done = rows
        .iter()
        .filter(|r| text(r, "status") == "SUBMITTED")
        .count() as i64;
    let offline = rows.iter().filter(|r| bool_of(r, "offline")).count() as i64;
    let flagged = rows
        .iter()
        .filter(|r| i64_of(r, "violationCount") > 0)
        .count() as i64;
    let blokir = rows
        .iter()
        .filter(|r| text(r, "status") == "CHEATED")
        .count() as i64;
    let masuk = rows
        .iter()
        .filter(|r| text(r, "status") != "NOT_STARTED")
        .count() as i64;

    egui::ScrollArea::vertical().auto_shrink([false, false]).show(ui, |ui| {
        // header + hitung mundur
        theme::card(ui, |ui| {
            ui.set_width(ui.available_width());
            ui.horizontal(|ui| {
                ui.vertical(|ui| {
                    ui.horizontal(|ui| {
                        ui.label(RichText::new(text(&d, "title")).size(20.0).strong());
                        if live {
                            let a = 0.55 + 0.45 * (t * 3.0).sin().abs() as f32;
                            theme::pill(ui, "LANGSUNG", RED.gamma_multiply(a));
                        }
                    });
                    ui.label(
                        RichText::new(format!(
                            "{} • {} – {} WITA",
                            text(&d, "subject"),
                            fmt_iso_wita(&text(&d, "startTime")),
                            hhmm_wita(&text(&d, "endTime"))
                        ))
                        .color(GRAY),
                    );
                    ui.add_space(4.0);
                    for (frac, color, label) in [
                        (masuk, TEAL, format!("Sudah masuk {masuk}/{total}")),
                        (done, GREEN, format!("Sudah selesai {done}/{total}")),
                    ] {
                        ui.horizontal(|ui| {
                            ui.add(
                                egui::ProgressBar::new(if total > 0 { frac as f32 / total as f32 } else { 0.0 })
                                    .desired_width(220.0)
                                    .desired_height(10.0)
                                    .fill(color),
                            );
                            ui.label(RichText::new(label).size(12.5).color(GRAY));
                        });
                    }
                });
                ui.with_layout(egui::Layout::right_to_left(egui::Align::TOP), |ui| {
                    let (s, c) = hitung_mundur(&d, fetched);
                    ui.vertical(|ui| {
                        ui.label(RichText::new(s).size(34.0).strong().monospace().color(c));
                        ui.label(RichText::new("sisa waktu ujian").color(GRAY));
                        ui.label(
                            RichText::new(format!("diperbarui {} dtk lalu", fetched.as_secs()))
                                .size(11.5)
                                .color(GRAY),
                        );
                    });
                });
            });
            ui.add_space(6.0);
            ui.horizontal_wrapped(|ui| {
                for (n, l, c) in [
                    (ongoing, "mengerjakan", TEAL),
                    (done, "selesai", GREEN),
                    (offline, "terputus", AMBER),
                    (flagged, "melanggar", RED),
                    (blokir, "diblokir", RED),
                ] {
                    theme::pill(ui, &format!("{n} {l}"), c);
                }
            });
        });
        ui.add_space(8.0);

        // kontrol: token, pengumuman, tambah waktu
        theme::card(ui, |ui| {
            ui.set_width(ui.available_width());
            ui.horizontal_wrapped(|ui| {
                ui.label("Token:");
                let token = text(&d, "token");
                ui.label(
                    RichText::new(if token.is_empty() { "(belum ada)".into() } else { token.clone() })
                        .monospace()
                        .size(18.0)
                        .strong(),
                );
                if ui.button("Buat token baru").clicked() {
                    app.send_rpc(&[&key, "monitoring"], json!({"action":"generateExamToken","args":[id]}));
                }
                if !token.is_empty() && ui.button("Salin").clicked() {
                    ui.ctx().copy_text(token);
                }
            });
            ui.horizontal_wrapped(|ui| {
                let f = app.form.entry("mon.text".into()).or_default();
                ui.add(
                    egui::TextEdit::singleline(f)
                        .hint_text("Pengumuman ke layar siswa...")
                        .desired_width(300.0),
                );
                let msg = f.clone();
                if ui.add(theme::primary("Kirim pengumuman")).clicked() && !msg.trim().is_empty() {
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
                if ui.add(theme::primary("Tambah waktu semua")).clicked() {
                    ask(
                        app,
                        &format!("Tambah {} menit untuk SEMUA siswa yang sedang mengerjakan?", app.minutes),
                        json!({"action":"tambahWaktuUjian","args":[id, app.minutes, Value::Null]}),
                        &[&key],
                    );
                }
            });
        });
        ui.add_space(8.0);

        // denah + aliran kejadian
        let lebar = ui.available_width();
        let samping = lebar >= 900.0;
        let feed_w = 290.0;
        let denah_w = if samping { lebar - feed_w - 12.0 } else { lebar };
        let pick = app.form.get("mon.pick").cloned().unwrap_or_default();
        let mut new_pick: Option<String> = None;

        let mut urut: Vec<&Value> = rows.iter().collect();
        urut.sort_by_key(|r| {
            let s = text(r, "status");
            let nama = text(r, "name");
            (
                match s.as_str() {
                    "CHEATED" => 0,
                    "ONGOING" if bool_of(r, "offline") => 1,
                    "ONGOING" if i64_of(r, "violationCount") > 0 => 2,
                    "ONGOING" => 3,
                    "NOT_STARTED" => 4,
                    _ => 5,
                },
                nama,
            )
        });

        ui.horizontal_top(|ui| {
            ui.allocate_ui_with_layout(
                Vec2::new(denah_w, 3000.0),
                egui::Layout::top_down(egui::Align::Min),
                |ui| {
                    ui.set_width(denah_w);
                    theme::card(ui, |ui| {
                        ui.set_width(ui.available_width());
                        ui.label(RichText::new("Denah ruang ujian").strong());
                        ui.label(RichText::new("Klik kotak siswa untuk aksi. Yang perlu perhatian ada di depan.").size(12.0).color(GRAY));
                        ui.add_space(6.0);
                        ui.spacing_mut().item_spacing = Vec2::splat(8.0);
                        ui.horizontal_wrapped(|ui| {
                            for r in &urut {
                                let st = text(r, "status");
                                let viol = i64_of(r, "violationCount");
                                let g = gaya(&st, bool_of(r, "offline"), viol);
                                let (rect, resp) = ui.allocate_exact_size(Vec2::new(132.0, 60.0), Sense::click());
                                let pulse = if g.denyut {
                                    0.45 + 0.55 * ((t * 2.6).sin() * 0.5 + 0.5) as f32
                                } else {
                                    1.0
                                };
                                let pilih = text(r, "studentId") == pick;
                                let p = ui.painter();
                                p.rect_filled(rect, 8.0, g.fill);
                                let w = if pilih { 3.0 } else { 1.0 + 1.5 * pulse };
                                p.rect_stroke(
                                    rect,
                                    8.0,
                                    Stroke::new(w, if pilih { INK } else { g.stroke.gamma_multiply(pulse) }),
                                    egui::StrokeKind::Inside,
                                );
                                p.text(
                                    rect.min + Vec2::new(8.0, 8.0),
                                    egui::Align2::LEFT_TOP,
                                    singkat(&text(r, "name"), 16),
                                    egui::FontId::proportional(13.0),
                                    g.teks,
                                );
                                p.text(
                                    rect.min + Vec2::new(8.0, 28.0),
                                    egui::Align2::LEFT_TOP,
                                    singkat(&text(r, "className"), 14),
                                    egui::FontId::proportional(11.0),
                                    g.teks.gamma_multiply(0.75),
                                );
                                p.text(
                                    rect.min + Vec2::new(8.0, 43.0),
                                    egui::Align2::LEFT_TOP,
                                    g.label,
                                    egui::FontId::proportional(11.0),
                                    if g.teks == Color32::WHITE { g.teks } else { g.stroke },
                                );
                                if viol > 0 {
                                    let c = Pos2::new(rect.right() - 14.0, rect.bottom() - 14.0);
                                    p.circle_filled(c, 10.0, RED);
                                    p.text(c, egui::Align2::CENTER_CENTER, format!("{viol}"), egui::FontId::proportional(12.0), Color32::WHITE);
                                }
                                if resp.hovered() {
                                    ui.ctx().set_cursor_icon(egui::CursorIcon::PointingHand);
                                }
                                if resp.clicked() {
                                    new_pick = Some(text(r, "studentId"));
                                }
                            }
                        });
                        ui.add_space(6.0);
                        ui.horizontal_wrapped(|ui| {
                            for (c, l) in [
                                (TEAL, "mengerjakan"),
                                (GREEN, "selesai"),
                                (AMBER, "terputus"),
                                (RED, "melanggar/diblokir"),
                                (GRAY, "belum masuk"),
                            ] {
                                let (r, _) = ui.allocate_exact_size(Vec2::splat(10.0), Sense::hover());
                                ui.painter().rect_filled(r, 3.0, c);
                                ui.label(RichText::new(l).size(11.5).color(GRAY));
                            }
                        });
                    });

                    // detail siswa terpilih
                    let pick_now = new_pick.clone().unwrap_or(pick.clone());
                    if let Some(r) = rows.iter().find(|r| text(r, "studentId") == pick_now) {
                        ui.add_space(8.0);
                        siswa_panel(app, ui, id, &key, r, events);
                    }
                },
            );
            if samping {
                ui.allocate_ui_with_layout(
                    Vec2::new(feed_w, 3000.0),
                    egui::Layout::top_down(egui::Align::Min),
                    |ui| feed(ui, events, None),
                );
            }
        });
        if !samping {
            ui.add_space(8.0);
            feed(ui, events, None);
        }
        if let Some(p) = new_pick {
            if p == pick {
                app.form.remove("mon.pick");
            } else {
                app.form.insert("mon.pick".into(), p);
            }
        }
    });
}

fn siswa_panel(app: &mut App, ui: &mut egui::Ui, id: &str, key: &str, r: &Value, events: &[Value]) {
    let status = text(r, "status");
    let sid = text(r, "studentId");
    theme::card(ui, |ui| {
        ui.set_width(ui.available_width());
        ui.horizontal(|ui| {
            ui.label(RichText::new(text(r, "name")).size(16.0).strong());
            status_badge(ui, &status, bool_of(r, "offline"));
            ui.label(
                RichText::new(format!(
                    "NISN {} • {}",
                    text(r, "nisn"),
                    text(r, "className")
                ))
                .color(GRAY),
            );
        });
        let viol = i64_of(r, "violationCount");
        let extra = i64_of(r, "extraSeconds");
        ui.label(format!(
            "Pelanggaran: {viol}{}{}{}",
            if extra > 0 {
                format!(" • waktu tambahan {} mnt", extra / 60)
            } else {
                String::new()
            },
            match r.get("silentSeconds").and_then(|x| x.as_i64()) {
                Some(s) if bool_of(r, "offline") => format!(" • tak ada sinyal {s} dtk"),
                _ => String::new(),
            },
            match r.get("score") {
                Some(v) if !v.is_null() =>
                    format!(" • nilai {}", crate::util::path_text(r, "score")),
                _ => String::new(),
            }
        ));
        ui.horizontal(|ui| {
            if status == "ONGOING"
                && ui
                    .add(theme::primary(&format!("+{} menit", app.minutes)))
                    .clicked()
            {
                app.send_rpc(
                    &[key],
                    json!({"action":"tambahWaktuUjian","args":[id, app.minutes, sid.clone()]}),
                );
            }
            if status != "NOT_STARTED" && theme::row_button(ui, "Reset sesi", true) {
                ask(
                    app,
                    &format!(
                        "Reset sesi {}? Pengerjaannya akan dihapus dan siswa bisa mengulang.",
                        text(r, "name")
                    ),
                    json!({"action":"resetSesiSiswa","form":{"examId":id,"studentId":sid.clone()}}),
                    &[key],
                );
            }
        });
        let mine: Vec<&Value> = events
            .iter()
            .filter(|e| text(e, "studentId") == sid)
            .collect();
        if !mine.is_empty() {
            ui.add_space(4.0);
            ui.label(RichText::new("Riwayat siswa ini").size(12.5).strong());
            for e in mine.iter().rev().take(6) {
                ui.label(
                    RichText::new(format!(
                        "{} {}",
                        hhmm_wita(&text(e, "at")),
                        text(e, "detail")
                    ))
                    .size(12.0)
                    .color(GRAY),
                );
            }
        }
    });
}

fn feed(ui: &mut egui::Ui, events: &[Value], _only: Option<&str>) {
    theme::card(ui, |ui| {
        ui.set_width(ui.available_width());
        ui.label(RichText::new("Aliran kejadian").strong());
        ui.add_space(4.0);
        let mut ev: Vec<&Value> = events.iter().collect();
        ev.sort_by(|a, b| text(b, "at").cmp(&text(a, "at")));
        if ev.is_empty() {
            ui.label(RichText::new("Belum ada kejadian.").color(GRAY));
        }
        egui::ScrollArea::vertical()
            .max_height(420.0)
            .id_salt("feed")
            .show(ui, |ui| {
                for e in ev.into_iter().take(60) {
                    let c = match text(e, "kind").as_str() {
                        "selesai" => GREEN,
                        "pelanggaran" => {
                            if bool_of(e, "tertunda") {
                                AMBER
                            } else {
                                RED
                            }
                        }
                        _ => TEAL,
                    };
                    ui.horizontal_top(|ui| {
                        let (r, _) = ui.allocate_exact_size(Vec2::new(10.0, 16.0), Sense::hover());
                        ui.painter().circle_filled(r.center(), 4.0, c);
                        ui.vertical(|ui| {
                            ui.label(
                                RichText::new(format!(
                                    "{}  {}",
                                    hhmm_wita(&text(e, "at")),
                                    text(e, "name")
                                ))
                                .size(12.5)
                                .strong(),
                            );
                            ui.label(RichText::new(text(e, "detail")).size(12.0).color(GRAY));
                        });
                    });
                }
            });
    });
}
