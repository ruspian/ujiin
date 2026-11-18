//! Tema tampilan: terang, bersih, aksen teal (selaras dengan versi web).
use eframe::egui::{self, Color32, CornerRadius, FontFamily, FontId, RichText, Stroke, TextStyle};

pub const TEAL: Color32 = Color32::from_rgb(13, 148, 136);
pub const TEAL_DARK: Color32 = Color32::from_rgb(15, 118, 110);
pub const TEAL_SOFT: Color32 = Color32::from_rgb(204, 251, 241);
pub const RED: Color32 = Color32::from_rgb(220, 38, 38);
pub const AMBER: Color32 = Color32::from_rgb(217, 119, 6);
pub const GREEN: Color32 = Color32::from_rgb(22, 163, 74);
pub const GRAY: Color32 = Color32::from_rgb(107, 114, 128);
pub const INK: Color32 = Color32::from_rgb(17, 24, 39);
pub const BG: Color32 = Color32::from_rgb(243, 246, 248);
pub const CARD: Color32 = Color32::WHITE;
pub const BORDER: Color32 = Color32::from_rgb(226, 232, 240);
pub const SIDEBAR: Color32 = Color32::from_rgb(15, 35, 42);
pub const SIDEBAR_HOVER: Color32 = Color32::from_rgb(30, 58, 66);
pub const SIDEBAR_TEXT: Color32 = Color32::from_rgb(203, 213, 225);
pub const GRID_SPACING: [f32; 2] = [22.0, 10.0];

pub fn apply(ctx: &egui::Context) {
    let mut v = egui::Visuals::light();
    v.panel_fill = BG;
    v.window_fill = CARD;
    v.extreme_bg_color = CARD; // latar kolom isian
    v.faint_bg_color = Color32::from_rgb(248, 250, 252); // garis selang-seling tabel
    v.override_text_color = Some(INK);
    v.window_stroke = Stroke::new(1.0, BORDER);
    v.window_corner_radius = CornerRadius::same(12);
    v.menu_corner_radius = CornerRadius::same(8);
    v.selection.bg_fill = TEAL_SOFT;
    v.selection.stroke = Stroke::new(1.0, TEAL_DARK);
    v.hyperlink_color = TEAL_DARK;

    let r = CornerRadius::same(8);
    v.widgets.noninteractive.bg_stroke = Stroke::new(1.0, BORDER);
    v.widgets.noninteractive.corner_radius = r;
    for w in [
        &mut v.widgets.inactive,
        &mut v.widgets.hovered,
        &mut v.widgets.active,
        &mut v.widgets.open,
    ] {
        w.corner_radius = r;
    }
    v.widgets.inactive.weak_bg_fill = Color32::from_rgb(241, 245, 249);
    v.widgets.inactive.bg_fill = Color32::from_rgb(241, 245, 249);
    v.widgets.inactive.bg_stroke = Stroke::new(1.0, BORDER);
    v.widgets.hovered.weak_bg_fill = TEAL_SOFT;
    v.widgets.hovered.bg_fill = TEAL_SOFT;
    v.widgets.hovered.bg_stroke = Stroke::new(1.0, TEAL);
    v.widgets.active.weak_bg_fill = Color32::from_rgb(153, 246, 228);
    v.widgets.active.bg_stroke = Stroke::new(1.0, TEAL_DARK);
    v.widgets.hovered.fg_stroke = Stroke::new(1.5, TEAL_DARK);
    v.widgets.active.fg_stroke = Stroke::new(1.5, TEAL_DARK);
    ctx.set_visuals(v);

    let mut style = (*ctx.global_style()).clone();
    style.spacing.item_spacing = egui::vec2(10.0, 8.0);
    style.spacing.button_padding = egui::vec2(14.0, 6.0);
    style.spacing.interact_size.y = 30.0;
    style.spacing.text_edit_width = 220.0;
    style.text_styles = [
        (
            TextStyle::Heading,
            FontId::new(24.0, FontFamily::Proportional),
        ),
        (TextStyle::Body, FontId::new(15.0, FontFamily::Proportional)),
        (
            TextStyle::Button,
            FontId::new(15.0, FontFamily::Proportional),
        ),
        (
            TextStyle::Small,
            FontId::new(12.5, FontFamily::Proportional),
        ),
        (
            TextStyle::Monospace,
            FontId::new(14.0, FontFamily::Monospace),
        ),
    ]
    .into();
    ctx.set_global_style(style);
}

/// Kartu putih berbingkai tipis; isinya bebas.
pub fn card<R>(ui: &mut egui::Ui, add: impl FnOnce(&mut egui::Ui) -> R) -> R {
    egui::Frame::new()
        .fill(CARD)
        .stroke(Stroke::new(1.0, BORDER))
        .corner_radius(CornerRadius::same(12))
        .inner_margin(egui::Margin::same(16))
        .show(ui, add)
        .inner
}

/// Judul halaman + keterangan singkat.
pub fn page_header(ui: &mut egui::Ui, title: &str, subtitle: &str) {
    ui.add_space(2.0);
    ui.label(RichText::new(title).size(26.0).strong().color(INK));
    if !subtitle.is_empty() {
        ui.label(RichText::new(subtitle).color(GRAY));
    }
    ui.add_space(10.0);
}

/// Sel judul kolom tabel.
pub fn th(ui: &mut egui::Ui, text: &str) {
    ui.label(
        RichText::new(text.to_uppercase())
            .size(11.5)
            .strong()
            .color(GRAY),
    );
}

/// Tombol utama (teal, teks putih).
pub fn primary(text: &str) -> egui::Button<'static> {
    egui::Button::new(
        RichText::new(text.to_string())
            .strong()
            .color(Color32::WHITE),
    )
    .fill(TEAL)
}

/// Lencana status berbentuk pil.
pub fn pill(ui: &mut egui::Ui, label: &str, color: Color32) {
    let fill = Color32::from_rgba_unmultiplied(color.r(), color.g(), color.b(), 28);
    egui::Frame::new()
        .fill(fill)
        .corner_radius(CornerRadius::same(10))
        .inner_margin(egui::Margin::symmetric(9, 2))
        .show(ui, |ui| {
            ui.label(RichText::new(label).size(12.5).strong().color(color));
        });
}

/// Kartu berisi area gulir (untuk tabel besar).
pub fn card_scroll(ui: &mut egui::Ui, add: impl FnOnce(&mut egui::Ui)) {
    egui::Frame::new()
        .fill(CARD)
        .stroke(Stroke::new(1.0, BORDER))
        .corner_radius(CornerRadius::same(12))
        .inner_margin(egui::Margin::symmetric(16, 10))
        .show(ui, |ui| {
            ui.set_width(ui.available_width());
            egui::ScrollArea::both()
                .auto_shrink([false, true])
                .show(ui, add);
        });
}

/// Tombol bahaya (merah, teks putih).
pub fn danger(text: &str) -> egui::Button<'static> {
    egui::Button::new(
        RichText::new(text.to_string())
            .strong()
            .color(Color32::WHITE),
    )
    .fill(RED)
}

/// Tombol kecil di dalam tabel; `bahaya` = tepi & teks merah.
pub fn row_button(ui: &mut egui::Ui, text: &str, bahaya: bool) -> bool {
    let color = if bahaya { RED } else { TEAL_DARK };
    let b = egui::Button::new(
        RichText::new(text.to_string())
            .size(13.0)
            .strong()
            .color(color),
    )
    .fill(Color32::WHITE)
    .stroke(Stroke::new(
        1.0,
        if bahaya {
            Color32::from_rgb(254, 202, 202)
        } else {
            BORDER
        },
    ));
    ui.add(b).clicked()
}
