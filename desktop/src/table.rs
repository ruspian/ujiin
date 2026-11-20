//! Tabel data yang rapi: kolom proporsional, judul berlatar, pil status, dan menu aksi per baris.
use crate::theme::{self, AMBER, BLUE, GRAY, GREEN, INK, TEAL};
use eframe::egui::{self, Color32, RichText, Vec2};
use egui_extras::{Column, TableBuilder};

/// Lebar kolom: tetap (px) atau mengisi sisa ruang (minimal px).
#[derive(Clone, Copy)]
pub enum W {
    Px(f32),
    Fill(f32),
}

pub enum Cell {
    Text(String),
    Strong(String),
    Muted(String),
    Mono(String),
    Pill(String, Color32),
    /// Beberapa baris dalam satu sel (mis. pengampu per guru); tinggi baris menyesuaikan.
    Lines(Vec<String>),
}

/// Label ramah & warna untuk nilai status/peran dari server. `None` = bukan nilai status.
pub fn status_pill(raw: &str) -> Option<(&'static str, Color32)> {
    Some(match raw {
        "ACTIVE" => ("Aktif", GREEN),
        "GRADUATED" => ("Lulus", TEAL),
        "DROPOUT" => ("Keluar", GRAY),
        "MUTATED" => ("Pindah", AMBER),
        "PUBLISHED" => ("Terbit", GREEN),
        "DRAFT" => ("Draf", GRAY),
        "COMPLETED" => ("Selesai", TEAL),
        "ADMIN" => ("Admin", BLUE),
        "GURU" => ("Guru", TEAL),
        "GANJIL" => ("Ganjil", BLUE),
        "GENAP" => ("Genap", AMBER),
        _ => return None,
    })
}

/// Teks panjang yang terpotong tetap bisa dibaca lewat tooltip.
fn tip(r: egui::Response, full: &str) {
    if full.chars().count() > 18 {
        r.on_hover_text(full);
    }
}

/// Tinggi baris: dasar, atau lebih tinggi bila ada sel bergaris banyak.
fn row_height(base: f32, cells: impl Iterator<Item = Cell>) -> f32 {
    cells
        .map(|c| match c {
            Cell::Lines(v) => (v.len().max(1) as f32 * 20.0 + 14.0).max(base),
            _ => base,
        })
        .fold(base, f32::max)
}

fn draw_cell(ui: &mut egui::Ui, c: Cell) {
    match c {
        Cell::Text(t) => {
            let full = t.clone();
            tip(ui.add(egui::Label::new(t).truncate()), &full);
        }
        Cell::Strong(t) => {
            let full = t.clone();
            tip(
                ui.add(egui::Label::new(RichText::new(t).strong().color(INK)).truncate()),
                &full,
            );
        }
        Cell::Muted(t) => {
            let full = t.clone();
            tip(
                ui.add(egui::Label::new(RichText::new(t).color(GRAY)).truncate()),
                &full,
            );
        }
        Cell::Lines(v) => {
            ui.vertical(|ui| {
                ui.spacing_mut().item_spacing.y = 2.0;
                for t in v {
                    let full = t.clone();
                    tip(ui.add(egui::Label::new(t).truncate()), &full);
                }
            });
        }
        Cell::Mono(t) => {
            ui.add(egui::Label::new(RichText::new(t).monospace().strong().color(INK)).truncate());
        }
        Cell::Pill(t, color) => {
            if t.is_empty() {
                return;
            }
            ui.horizontal(|ui| theme::pill(ui, &t, color));
        }
    }
}

/// Gambar tabel di dalam kartu. `cell(baris, kolom)` mengisi sel, `actions` menggambar tombol di kolom terakhir.
pub fn data_table(
    ui: &mut egui::Ui,
    id: &str,
    cols: &[(&str, W)],
    rows: usize,
    row_h: f32,
    actions_w: f32,
    cell: impl Fn(usize, usize) -> Cell,
    mut actions: impl FnMut(&mut egui::Ui, usize),
) {
    egui::Frame::new()
        .fill(theme::CARD)
        .stroke(egui::Stroke::new(1.0, theme::BORDER))
        .corner_radius(egui::CornerRadius::same(12))
        .inner_margin(egui::Margin::symmetric(4, 4))
        .show(ui, |ui| {
            ui.set_width(ui.available_width());
            let mut t = TableBuilder::new(ui)
                .id_salt(id)
                .striped(true)
                .resizable(false)
                .vscroll(true)
                .auto_shrink([false, false])
                .cell_layout(egui::Layout::left_to_right(egui::Align::Center));
            for (_, w) in cols {
                t = t.column(match *w {
                    W::Px(p) => Column::exact(p),
                    W::Fill(m) => Column::remainder().at_least(m).clip(true),
                });
            }
            if actions_w > 0.0 {
                t = t.column(Column::exact(actions_w));
            }
            t.header(34.0, |mut h| {
                for (title, _) in cols {
                    h.col(|ui| {
                        ui.add_space(8.0);
                        theme::th(ui, title);
                    });
                }
                if actions_w > 0.0 {
                    h.col(|_| {});
                }
            })
            .body(|body| {
                let ncol = cols.len();
                let heights: Vec<f32> = (0..rows)
                    .map(|i| row_height(row_h, (0..ncol).map(|c| cell(i, c))))
                    .collect();
                body.heterogeneous_rows(heights.into_iter(), |mut row| {
                    let i = row.index();
                    for c in 0..cols.len() {
                        row.col(|ui| {
                            ui.add_space(8.0);
                            draw_cell(ui, cell(i, c));
                        });
                    }
                    if actions_w > 0.0 {
                        row.col(|ui| {
                            ui.with_layout(
                                egui::Layout::right_to_left(egui::Align::Center),
                                |ui| {
                                    ui.add_space(8.0);
                                    actions(ui, i);
                                },
                            );
                        });
                    }
                });
            });
        });
}

/// Pilihan dropdown berlabel. Mengembalikan true bila nilai berubah.
pub fn combo(
    ui: &mut egui::Ui,
    id: &str,
    label: &str,
    cur: &mut String,
    items: &[(String, String)],
    width: f32,
) -> bool {
    let before = cur.clone();
    let shown = items
        .iter()
        .find(|(k, _)| k == cur)
        .map(|(_, v)| v.clone())
        .unwrap_or_default();
    // label + pilihan dibungkus satu unit supaya tidak terpisah saat baris membungkus
    // label di atas, kotak pilihan di bawah (hemat lebar). Ukuran tetap supaya
    // baris toolbar membungkus rapi alih-alih memeras kotak.
    ui.allocate_ui(Vec2::new(width + 8.0, 50.0), |ui| {
        ui.vertical(|ui| {
            ui.spacing_mut().item_spacing.y = 3.0;
            ui.label(RichText::new(label).size(12.0).color(GRAY));
            egui::ComboBox::from_id_salt(id)
                .selected_text(shown)
                .truncate()
                .width(width)
                .show_ui(ui, |ui| {
                    for (k, v) in items {
                        ui.selectable_value(cur, k.clone(), v);
                    }
                });
        });
    });
    *cur != before
}

/// Kotak pencarian berlabel (label di atas). Mengembalikan true bila Enter ditekan atau tombol Cari diklik.
pub fn search_box(ui: &mut egui::Ui, text: &mut String, label: &str, with_button: bool) -> bool {
    let mut go = false;
    ui.allocate_ui(
        Vec2::new(if with_button { 240.0 } else { 240.0 }, 50.0),
        |ui| {
            ui.vertical(|ui| {
                ui.spacing_mut().item_spacing.y = 3.0;
                ui.label(RichText::new(label).size(12.0).color(GRAY));
                ui.horizontal(|ui| {
                    let w = if with_button { 160.0 } else { 240.0 };
                    let r = ui.add_sized(
                        [w, 30.0],
                        egui::TextEdit::singleline(text).hint_text("Ketik lalu Enter"),
                    );
                    if r.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter)) {
                        go = true;
                    }
                    if with_button
                        && ui
                            .add_sized([60.0, 30.0], egui::Button::new("Cari"))
                            .clicked()
                    {
                        go = true;
                    }
                });
            });
        },
    );
    go
}

/// Kartu keadaan kosong.
pub fn empty_state(ui: &mut egui::Ui, title: &str, hint: &str) {
    theme::card(ui, |ui| {
        ui.set_width(ui.available_width());
        ui.vertical_centered(|ui| {
            ui.add_space(24.0);
            ui.label(RichText::new(title).size(17.0).strong());
            ui.label(RichText::new(hint).color(GRAY));
            ui.add_space(24.0);
        });
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn pill_status_dikenal() {
        assert_eq!(status_pill("ACTIVE").unwrap().0, "Aktif");
        assert_eq!(status_pill("PUBLISHED").unwrap().0, "Terbit");
        assert!(status_pill("Informatika").is_none());
    }
}
