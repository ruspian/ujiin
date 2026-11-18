//! Klien HTTP ke server Ujiin. Semua panggilan jalan di thread terpisah
//! supaya tampilan tidak pernah macet; hasil dikirim lewat channel.

use serde_json::Value;
use std::sync::mpsc::Sender;
use std::time::Duration;

pub enum Msg {
    Login(Result<Value, String>),
    Data {
        key: String,
        res: Result<Value, String>,
    },
    Rpc {
        label: String,
        res: Result<Value, String>,
    },
    File {
        res: Result<String, String>,
    },
}

/// Dipanggil setelah hasil jaringan siap agar UI digambar ulang.
pub type Repaint = std::sync::Arc<dyn Fn() + Send + Sync>;

#[derive(Clone)]
pub struct Net {
    agent: ureq::Agent,
    pub base: String,
    tx: Sender<Msg>,
    repaint: Repaint,
}

pub fn normalize_base(input: &str) -> String {
    let mut s = input.trim().trim_end_matches('/').to_string();
    if !s.is_empty() && !s.starts_with("http://") && !s.starts_with("https://") {
        s = format!("https://{s}");
    }
    s
}

fn new_agent() -> ureq::Agent {
    ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(25)))
        .http_status_as_error(false)
        .build()
        .into()
}

fn read_json(mut resp: ureq::http::Response<ureq::Body>) -> Result<Value, String> {
    let status = resp.status().as_u16();
    let body: Value = resp
        .body_mut()
        .read_json()
        .map_err(|_| format!("Respons server tidak valid (HTTP {status})"))?;
    if status == 401 {
        return Err("Sesi berakhir, silakan login ulang.".into());
    }
    if status >= 400 {
        let msg = body
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Permintaan ditolak server.");
        return Err(msg.to_string());
    }
    Ok(body)
}

fn net_err(e: ureq::Error) -> String {
    format!("Tidak bisa terhubung ke server ({e})")
}

impl Net {
    pub fn new(base: String, tx: Sender<Msg>, repaint: Repaint) -> Self {
        Self {
            agent: new_agent(),
            base,
            tx,
            repaint,
        }
    }

    fn send(tx: &Sender<Msg>, repaint: &Repaint, msg: Msg) {
        let _ = tx.send(msg);
        repaint();
    }

    pub fn login(&self, username: String, password: String) {
        let (agent, base, tx, ctx) = (
            self.agent.clone(),
            self.base.clone(),
            self.tx.clone(),
            self.repaint.clone(),
        );
        std::thread::spawn(move || {
            let res = (|| -> Result<Value, String> {
                let csrf = read_json(
                    agent
                        .get(format!("{base}/api/auth/csrf"))
                        .call()
                        .map_err(net_err)?,
                )?;
                let token = csrf
                    .get("csrfToken")
                    .and_then(|v| v.as_str())
                    .ok_or("Server bukan server Ujiin yang valid.")?
                    .to_string();
                // hasilnya tidak dipakai: keberhasilan dipastikan lewat /api/v1/me
                let _ = agent
                    .post(format!("{base}/api/auth/callback/credentials"))
                    .send_form([
                        ("csrfToken", token.as_str()),
                        ("username", username.trim()),
                        ("password", password.as_str()),
                        ("json", "true"),
                        ("callbackUrl", base.as_str()),
                    ])
                    .map_err(net_err)?;
                match read_json(
                    agent
                        .get(format!("{base}/api/v1/me"))
                        .call()
                        .map_err(net_err)?,
                ) {
                    Ok(me) => Ok(me),
                    Err(_) => {
                        Err("Username atau password salah, atau akun bukan guru/admin.".into())
                    }
                }
            })();
            Self::send(&tx, &ctx, Msg::Login(res));
        });
    }

    pub fn get(&self, key: &str, path: &str) {
        let (agent, url, tx, ctx, key) = (
            self.agent.clone(),
            format!("{}/api/v1/{}", self.base, path),
            self.tx.clone(),
            self.repaint.clone(),
            key.to_string(),
        );
        std::thread::spawn(move || {
            let res = agent.get(url).call().map_err(net_err).and_then(read_json);
            Self::send(&tx, &ctx, Msg::Data { key, res });
        });
    }

    /// Panggil aksi server. `body` berisi {action, args} atau {action, form}.
    pub fn rpc(&self, label: &str, body: Value) {
        let (agent, url, tx, ctx, label) = (
            self.agent.clone(),
            format!("{}/api/v1/rpc", self.base),
            self.tx.clone(),
            self.repaint.clone(),
            label.to_string(),
        );
        std::thread::spawn(move || {
            let res = agent
                .post(url)
                .send_json(&body)
                .map_err(net_err)
                .and_then(read_json);
            Self::send(&tx, &ctx, Msg::Rpc { label, res });
        });
    }

    /// Unduh berkas dari server (mis. arsip CSV) ke `dest`.
    pub fn download(&self, path: &str, dest: std::path::PathBuf) {
        let (agent, url, tx, ctx) = (
            self.agent.clone(),
            format!("{}{}", self.base, path),
            self.tx.clone(),
            self.repaint.clone(),
        );
        std::thread::spawn(move || {
            let res = (|| -> Result<String, String> {
                let mut resp = agent.get(url).call().map_err(net_err)?;
                if resp.status().as_u16() >= 400 {
                    return Err(format!(
                        "Server menolak unduhan (HTTP {})",
                        resp.status().as_u16()
                    ));
                }
                let bytes = resp
                    .body_mut()
                    .read_to_vec()
                    .map_err(|e| format!("Gagal membaca unduhan ({e})"))?;
                std::fs::write(&dest, bytes)
                    .map_err(|e| format!("Gagal menyimpan berkas ({e})"))?;
                Ok(dest.display().to_string())
            })();
            Self::send(&tx, &ctx, Msg::File { res });
        });
    }

    pub fn open_web(&self, path: &str) {
        let _ = open::that(format!("{}{}", self.base, path));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::{Child, Command, Stdio};
    use std::sync::mpsc::{channel, Receiver};

    struct Mock(Child);
    impl Drop for Mock {
        fn drop(&mut self) {
            let _ = self.0.kill();
        }
    }

    fn start_mock(port: u16) -> Option<Mock> {
        let script = concat!(env!("CARGO_MANIFEST_DIR"), "/tools/mock_server.py");
        let child = ["python3", "python"].iter().find_map(|py| {
            Command::new(py)
                .args([script, &port.to_string()])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .ok()
        })?;
        std::thread::sleep(Duration::from_millis(900));
        Some(Mock(child))
    }

    fn net(port: u16) -> (Net, Receiver<Msg>) {
        let (tx, rx) = channel();
        (
            Net::new(
                format!("http://127.0.0.1:{port}"),
                tx,
                std::sync::Arc::new(|| {}) as Repaint,
            ),
            rx,
        )
    }

    fn wait(rx: &Receiver<Msg>) -> Msg {
        rx.recv_timeout(Duration::from_secs(10))
            .expect("tidak ada respons")
    }

    // Memakai server tiruan Python; di runner Windows spawn python membuat proses crash,
    // jadi tes ini dijalankan di Linux/macOS saja.
    #[test]
    #[cfg_attr(windows, ignore)]
    fn alur_login_data_rpc_dan_unduh() {
        let Some(_mock) = start_mock(18765) else {
            eprintln!("python tidak tersedia, tes dilewati");
            return;
        };

        // password salah
        let (n, rx) = net(18765);
        n.login("admin".into(), "salah".into());
        match wait(&rx) {
            Msg::Login(Err(_)) => {}
            _ => panic!("login salah harus gagal"),
        }

        // guru: boleh monitoring, tidak boleh data admin
        let (n, rx) = net(18765);
        n.login("guru".into(), "rahasia123".into());
        match wait(&rx) {
            Msg::Login(Ok(me)) => assert_eq!(me["role"], "GURU"),
            _ => panic!("login guru gagal"),
        }
        n.get("monitoring", "monitoring");
        match wait(&rx) {
            Msg::Data { res: Ok(v), .. } => assert_eq!(v[0]["title"], "UH Informatika"),
            _ => panic!("monitoring gagal"),
        }
        n.get("admin/siswa", "admin/siswa");
        match wait(&rx) {
            Msg::Data { res: Err(_), .. } => {}
            _ => panic!("guru tidak boleh membuka data admin"),
        }

        // admin: rpc + unduh
        let (n, rx) = net(18765);
        n.login("admin".into(), "rahasia123".into());
        assert!(matches!(wait(&rx), Msg::Login(Ok(_))));
        n.rpc(
            "monitoring/e1",
            serde_json::json!({"action":"tambahWaktuUjian","args":["e1",10,null]}),
        );
        match wait(&rx) {
            Msg::Rpc { res: Ok(v), label } => {
                assert_eq!(v["success"], true);
                assert_eq!(label, "monitoring/e1");
            }
            _ => panic!("rpc gagal"),
        }
        let dest = std::env::temp_dir().join(format!("arsip-{}.csv", std::process::id()));
        n.download("/api/admin/arsip?type=siswa", dest.clone());
        match wait(&rx) {
            Msg::File { res: Ok(_) } => {
                let t = std::fs::read_to_string(&dest).unwrap();
                assert!(t.contains("Ahmad"));
                let _ = std::fs::remove_file(dest);
            }
            _ => panic!("unduh gagal"),
        }

        // tanpa login -> sesi berakhir
        let (n, rx) = net(18765);
        n.get("dashboard", "dashboard");
        match wait(&rx) {
            Msg::Data { res: Err(e), .. } => assert!(e.contains("Sesi berakhir")),
            _ => panic!("tanpa login harus 401"),
        }
    }

    #[test]
    fn normalisasi_alamat() {
        assert_eq!(
            normalize_base(" ujian.sekolah.id/ "),
            "https://ujian.sekolah.id"
        );
        assert_eq!(
            normalize_base("http://localhost:3000/"),
            "http://localhost:3000"
        );
    }
}
