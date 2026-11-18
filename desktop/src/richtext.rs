//! Teks soal: HTML (disimpan server, dibuat editor web) <-> teks editor sederhana.
//!
//! Di kolom editor guru mengetik teks biasa; satu baris = satu paragraf. Format
//! dipasang lewat tombol (B/I/U, x₂/x², gambar) dan hanya tag berikut yang dikenali:
//! `<b> <i> <u> <sub> <sup> <img src="https://...">`. Selain itu dibersihkan.

use eframe::egui::{self, text::LayoutJob, Align, Color32, FontId, TextFormat};

const TAGS: [&str; 10] = [
    "<b>", "</b>", "<i>", "</i>", "<u>", "</u>", "<sub>", "</sub>", "<sup>", "</sup>",
];

fn decode(s: &str) -> String {
    s.replace("&nbsp;", " ")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&amp;", "&")
}

fn img_src(tag: &str) -> Option<String> {
    let lower = tag.to_ascii_lowercase();
    let i = lower.find("src=")? + 4;
    let rest = &tag[i..];
    let q = rest.chars().next()?;
    if q != '"' && q != '\'' {
        return None;
    }
    let end = rest[1..].find(q)?;
    Some(rest[1..1 + end].to_string())
}

fn url_ok(u: &str) -> bool {
    (u.starts_with("https://") || u.starts_with("http://")) && !u.contains(['"', '<', '>', ' '])
}

/// HTML dari server -> teks untuk kolom editor.
pub fn html_to_edit(html: &str) -> String {
    let mut out = String::new();
    let mut rest = html;
    while let Some(lt) = rest.find('<') {
        out.push_str(&rest[..lt]);
        let Some(gt) = rest[lt..].find('>') else {
            rest = "";
            break;
        };
        let tag = &rest[lt..lt + gt + 1];
        rest = &rest[lt + gt + 1..];
        let name = tag
            .trim_start_matches('<')
            .trim_start_matches('/')
            .split(|c: char| c.is_whitespace() || c == '>' || c == '/')
            .next()
            .unwrap_or("")
            .to_ascii_lowercase();
        let closing = tag.starts_with("</");
        match name.as_str() {
            "p" | "div" | "li" if closing => out.push('\n'),
            "br" => out.push('\n'),
            "b" | "strong" => out.push_str(if closing { "</b>" } else { "<b>" }),
            "i" | "em" => out.push_str(if closing { "</i>" } else { "<i>" }),
            "u" => out.push_str(if closing { "</u>" } else { "<u>" }),
            "sub" => out.push_str(if closing { "</sub>" } else { "<sub>" }),
            "sup" => out.push_str(if closing { "</sup>" } else { "<sup>" }),
            "img" => {
                if let Some(src) = img_src(tag) {
                    if url_ok(&src) {
                        out.push_str(&format!("<img src=\"{src}\">"));
                    }
                }
            }
            _ => {}
        }
    }
    out.push_str(rest);
    decode(out.trim_end_matches('\n'))
}

fn escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// Teks editor -> HTML untuk server (tiap baris jadi `<p>`).
pub fn edit_to_html(src: &str) -> String {
    let mut lines = Vec::new();
    for line in src.trim().lines() {
        let mut out = String::new();
        let mut rest = line;
        'scan: while !rest.is_empty() {
            if rest.starts_with('<') {
                for t in TAGS {
                    if rest.starts_with(t) {
                        out.push_str(t);
                        rest = &rest[t.len()..];
                        continue 'scan;
                    }
                }
                if rest.starts_with("<img") {
                    if let Some(end) = rest.find('>') {
                        if let Some(src) = img_src(&rest[..=end]) {
                            if url_ok(&src) {
                                out.push_str(&format!("<img src=\"{src}\">"));
                            }
                        }
                        rest = &rest[end + 1..];
                        continue 'scan;
                    }
                }
            }
            let c = rest.chars().next().unwrap();
            out.push_str(&escape(&c.to_string()));
            rest = &rest[c.len_utf8()..];
        }
        lines.push(format!("<p>{out}</p>"));
    }
    lines.join("")
}

/// True bila editor praktis kosong (tanpa huruf/gambar).
pub fn is_blank(edit: &str) -> bool {
    let plain = crate::util::strip_html(&edit_to_html(edit));
    plain.trim().is_empty() && !edit.contains("<img")
}

/// Pratinjau: teks dengan gaya tebal/miring/garis bawah/subskrip/superskrip; gambar jadi penanda.
pub fn preview_job(src: &str, color: Color32, size: f32, wrap: f32) -> LayoutJob {
    let mut job = LayoutJob::default();
    job.wrap.max_width = wrap;
    let (mut b, mut i, mut u, mut sub, mut sup) = (false, false, false, false, false);
    let mut rest = src;
    let push =
        |job: &mut LayoutJob, text: &str, b: bool, i: bool, u: bool, sub: bool, sup: bool| {
            if text.is_empty() {
                return;
            }
            let small = sub || sup;
            job.append(
                text,
                0.0,
                TextFormat {
                    font_id: FontId::proportional(if small { size * 0.72 } else { size }),
                    color: if b { crate::theme::TEAL_DARK } else { color },
                    italics: i,
                    underline: if u {
                        egui::Stroke::new(1.0, color)
                    } else {
                        egui::Stroke::NONE
                    },
                    valign: if sub {
                        Align::BOTTOM
                    } else if sup {
                        Align::TOP
                    } else {
                        Align::Center
                    },
                    ..Default::default()
                },
            );
        };
    while !rest.is_empty() {
        if rest.starts_with('<') {
            if let Some(end) = rest.find('>') {
                let tag = &rest[..=end];
                let mut handled = true;
                match tag {
                    "<b>" => b = true,
                    "</b>" => b = false,
                    "<i>" => i = true,
                    "</i>" => i = false,
                    "<u>" => u = true,
                    "</u>" => u = false,
                    "<sub>" => sub = true,
                    "</sub>" => sub = false,
                    "<sup>" => sup = true,
                    "</sup>" => sup = false,
                    t if t.starts_with("<img") => {
                        push(&mut job, " [gambar] ", true, false, false, false, false)
                    }
                    _ => handled = false,
                }
                if handled {
                    rest = &rest[end + 1..];
                    continue;
                }
            }
        }
        let next = rest[1..].find('<').map(|p| p + 1).unwrap_or(rest.len());
        push(&mut job, &rest[..next], b, i, u, sub, sup);
        rest = &rest[next..];
    }
    job
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn html_ke_editor_dan_kembali() {
        let html = "<p>Hitung <strong>luas</strong> &amp; keliling</p><p>H<sub>2</sub>O</p>";
        let e = html_to_edit(html);
        assert_eq!(e, "Hitung <b>luas</b> & keliling\nH<sub>2</sub>O");
        assert_eq!(
            edit_to_html(&e),
            "<p>Hitung <b>luas</b> &amp; keliling</p><p>H<sub>2</sub>O</p>"
        );
    }

    #[test]
    fn tag_berbahaya_dibuang() {
        let h = edit_to_html("a <script>alert(1)</script> <img src=\"javascript:x\"> <img src=\"https://x.id/a.png\" onerror=\"x\">");
        assert!(!h.contains("<script"));
        assert!(!h.contains("javascript"));
        assert!(!h.contains("onerror"));
        assert!(h.contains("<img src=\"https://x.id/a.png\">"));
    }

    #[test]
    fn gambar_dari_server_terbaca() {
        let e =
            html_to_edit("<p>Lihat <img src=\"https://res.cloudinary.com/a/b.png\" alt=\"\"></p>");
        assert_eq!(e, "Lihat <img src=\"https://res.cloudinary.com/a/b.png\">");
        assert!(!is_blank(&e));
        assert!(is_blank("   "));
    }
}
