//! Logo (ikon buku) dan wordmark "Ujiin", sama dengan Navbar di web:
//! kotak teal membulat + ikon BookOpen, tulisan "Uji" + "in" (teal), font JetBrains Mono ExtraBold.

use crate::theme::TEAL;
use eframe::egui::{
    self, Color32, FontData, FontDefinitions, FontFamily, Pos2, RichText, Stroke, Vec2,
};
use std::sync::Arc;

pub const BRAND_FONT: &str = "brand";

/// Daftarkan font merek (JetBrains Mono ExtraBold, lisensi OFL, lihat assets/).
pub fn install_fonts(ctx: &egui::Context) {
    let mut fonts = FontDefinitions::default();
    fonts.font_data.insert(
        BRAND_FONT.into(),
        Arc::new(FontData::from_static(include_bytes!(
            "../assets/JetBrainsMono-ExtraBold.ttf"
        ))),
    );
    fonts
        .families
        .insert(FontFamily::Name(BRAND_FONT.into()), vec![BRAND_FONT.into()]);
    ctx.set_fonts(fonts);
}

fn brand_font(size: f32) -> egui::FontId {
    egui::FontId::new(size, FontFamily::Name(BRAND_FONT.into()))
}

/// Ikon BookOpen ala lucide pada kisi 24x24, digambar dengan garis.
fn book_open(painter: &egui::Painter, rect: egui::Rect, stroke_w: f32) {
    let s = rect.width() / 24.0;
    let p = |x: f32, y: f32| Pos2::new(rect.left() + x * s, rect.top() + y * s);
    let arc = |cx: f32, cy: f32, r: f32, a0: f32, a1: f32| -> Vec<Pos2> {
        (0..=8)
            .map(|i| {
                let a = (a0 + (a1 - a0) * i as f32 / 8.0).to_radians();
                p(cx + r * a.cos(), cy + r * a.sin())
            })
            .collect()
    };
    let mut path: Vec<Pos2> = vec![p(2.0, 17.0), p(2.0, 4.0), p(3.0, 3.0), p(8.0, 3.0)];
    path.extend(arc(8.0, 7.0, 4.0, -90.0, 0.0));
    path.extend(arc(16.0, 7.0, 4.0, 180.0, 270.0));
    path.extend([
        p(21.0, 3.0),
        p(22.0, 4.0),
        p(22.0, 17.0),
        p(21.0, 18.0),
        p(15.0, 18.0),
    ]);
    path.extend(arc(15.0, 21.0, 3.0, 270.0, 180.0));
    path.extend(arc(9.0, 21.0, 3.0, 360.0, 270.0));
    path.extend([p(3.0, 18.0), p(2.0, 17.0)]);
    let st = Stroke::new(stroke_w, Color32::WHITE);
    painter.add(egui::Shape::line(path, st));
    painter.line_segment([p(12.0, 7.0), p(12.0, 21.0)], st);
}

/// Kotak teal membulat berisi ikon buku.
pub fn logo(ui: &mut egui::Ui, size: f32) {
    let (rect, _) = ui.allocate_exact_size(Vec2::splat(size), egui::Sense::hover());
    ui.painter().rect_filled(rect, size * 0.25, TEAL);
    let icon = egui::Rect::from_center_size(rect.center(), Vec2::splat(size * 0.62));
    book_open(ui.painter(), icon, (size * 0.07).max(1.6));
}

/// "Uji" + "in" berwarna teal.
pub fn wordmark(ui: &mut egui::Ui, size: f32, base: Color32) {
    ui.spacing_mut().item_spacing.x = 0.0;
    ui.label(RichText::new("Uji").font(brand_font(size)).color(base));
    ui.label(RichText::new("in").font(brand_font(size)).color(TEAL));
}
