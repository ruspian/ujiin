#![cfg_attr(
    all(windows, not(debug_assertions), not(test)),
    windows_subsystem = "windows"
)]

mod api;
mod app;
mod brand;
mod cache;
mod export;
mod forms;
mod imports;
mod live;
mod master_edit;
mod notify;
mod richtext;
mod table;
mod theme;
mod util;
mod views;

/// Ikon jendela/taskbar (RGBA 128x128, dibuat dari assets/icon.png).
fn window_icon() -> eframe::egui::IconData {
    eframe::egui::IconData {
        rgba: include_bytes!("../assets/icon-128.rgba").to_vec(),
        width: 128,
        height: 128,
    }
}

fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: eframe::egui::ViewportBuilder::default()
            .with_title("Ujiin Guru")
            .with_app_id("ujiin-guru")
            .with_icon(window_icon())
            .with_inner_size([1200.0, 780.0])
            .with_min_inner_size([920.0, 560.0]),
        ..Default::default()
    };
    eframe::run_native(
        "Ujiin Guru",
        options,
        Box::new(|cc| Ok(Box::new(app::App::new(cc)))),
    )
}
