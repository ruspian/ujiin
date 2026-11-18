#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

mod api;
mod app;
mod cache;
mod export;
mod notify;
mod util;
mod views;

fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: eframe::egui::ViewportBuilder::default()
            .with_title("Ujiin Guru")
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
