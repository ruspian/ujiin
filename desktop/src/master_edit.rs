//! Dialog tambah/ubah untuk data master sederhana (kelas, agama, jenis ujian, tahun ajaran, pengguna, siswa).
use crate::app::App;
use crate::theme::{self, GRAY, RED};
use eframe::egui::{self, RichText};
use serde_json::{json, Map, Value};

pub enum Kind {
    Text,
    Password,
    Choice(Vec<(String, String)>),
}

pub struct EField {
    pub label: String,
    pub name: &'static str,
    pub kind: Kind,
    pub value: String,
}

pub struct EditDlg {
    pub title: String,
    pub action: &'static str,
    pub refresh: &'static str,
    pub id: Option<String>,
    pub fields: Vec<EField>,
    pub saving: bool,
    pub error: String,
}

/// Isi form yang dikirim ke server (`id` ikut bila mengubah).
pub fn form_body(d: &EditDlg) -> Value {
    let mut m = Map::new();
    if let Some(id) = &d.id {
        m.insert("id".into(), Value::String(id.clone()));
    }
    for f in &d.fields {
        m.insert(f.name.into(), Value::String(f.value.trim().to_string()));
    }
    json!({ "action": d.action, "form": m })
}

/// Pesan kesalahan isian wajib; `None` bila lengkap. Password boleh kosong saat mengubah.
pub fn missing(d: &EditDlg) -> Option<String> {
    for f in &d.fields {
        let empty = f.value.trim().is_empty();
        let optional = matches!(f.kind, Kind::Password) && d.id.is_some();
        if empty && !optional {
            return Some(format!(
                "{} wajib diisi.",
                f.label.split(" (").next().unwrap_or(&f.label)
            ));
        }
    }
    None
}

pub fn show(app: &mut App, ctx: &egui::Context) {
    let Some(mut d) = app.forms.master.take() else {
        return;
    };
    if d.saving {
        match app.take_rpc("@form:master") {
            Some(true) => return, // sukses: dialog ditutup (daftar dimuat ulang oleh RPC)
            Some(false) => d.saving = false,
            None => {}
        }
    }
    let mut close = false;
    let mut save = false;
    egui::Window::new("master-edit")
        .title_bar(false)
        .frame(
            egui::Frame::window(&ctx.global_style())
                .inner_margin(egui::Margin::same(20))
                .corner_radius(egui::CornerRadius::same(14)),
        )
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
        .fixed_size([400.0, 0.0])
        .show(ctx, |ui| {
            ui.label(RichText::new(d.title.clone()).strong().size(19.0));
            ui.add_space(8.0);
            for f in d.fields.iter_mut() {
                ui.label(RichText::new(&f.label).size(13.0).strong().color(GRAY));
                match &f.kind {
                    Kind::Text | Kind::Password => {
                        ui.add_sized(
                            [ui.available_width(), 32.0],
                            egui::TextEdit::singleline(&mut f.value)
                                .password(matches!(f.kind, Kind::Password)),
                        );
                    }
                    Kind::Choice(items) => {
                        crate::table::combo(
                            ui,
                            &format!("me-{}", f.name),
                            "",
                            &mut f.value,
                            items,
                            ui.available_width() - 24.0,
                        );
                    }
                }
                ui.add_space(4.0);
            }
            if !d.error.is_empty() {
                ui.colored_label(RED, &d.error);
            }
            ui.add_space(6.0);
            ui.horizontal(|ui| {
                if d.saving {
                    ui.spinner();
                    ui.label("Menyimpan...");
                } else {
                    if ui.add(theme::primary("Simpan")).clicked() {
                        save = true;
                    }
                    if ui.button("Batal").clicked() {
                        close = true;
                    }
                }
            });
        });
    if !d.saving && ctx.input(|i| i.key_pressed(egui::Key::Escape)) {
        close = true;
    }
    if save {
        match missing(&d) {
            Some(e) => d.error = e,
            None => {
                d.error.clear();
                d.saving = true;
                let r = ["@form:master", d.refresh];
                app.send_rpc(&r, form_body(&d));
            }
        }
    }
    if !close {
        app.forms.master = Some(d);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dlg(id: Option<&str>) -> EditDlg {
        EditDlg {
            title: "t".into(),
            action: "updateUser",
            refresh: "admin/pengguna",
            id: id.map(String::from),
            fields: vec![
                EField {
                    label: "Nama lengkap".into(),
                    name: "name",
                    kind: Kind::Text,
                    value: " Budi ".into(),
                },
                EField {
                    label: "Password (min. 8)".into(),
                    name: "password",
                    kind: Kind::Password,
                    value: String::new(),
                },
            ],
            saving: false,
            error: String::new(),
        }
    }

    #[test]
    fn password_boleh_kosong_saat_ubah_tapi_wajib_saat_tambah() {
        assert!(missing(&dlg(Some("u1"))).is_none());
        assert_eq!(missing(&dlg(None)).unwrap(), "Password wajib diisi.");
    }

    #[test]
    fn body_menyertakan_id_dan_memangkas_spasi() {
        let b = form_body(&dlg(Some("u1")));
        assert_eq!(b["form"]["id"], "u1");
        assert_eq!(b["form"]["name"], "Budi");
        assert_eq!(b["action"], "updateUser");
    }
}
