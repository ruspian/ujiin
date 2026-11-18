use crate::api::{normalize_base, Msg, Net};
use crate::{cache, notify, util, views};
use eframe::egui;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Tab {
    Dashboard,
    Monitoring,
    Penilaian,
    BankSoal,
    Jadwal,
    Siswa,
    Kelas,
    Mapel,
    JenisUjian,
    Agama,
    TahunAjaran,
    Pengguna,
    Arsip,
}

impl Tab {
    pub const ALL: [Tab; 13] = [
        Tab::Dashboard,
        Tab::Monitoring,
        Tab::Penilaian,
        Tab::BankSoal,
        Tab::Jadwal,
        Tab::Siswa,
        Tab::Kelas,
        Tab::Mapel,
        Tab::JenisUjian,
        Tab::Agama,
        Tab::TahunAjaran,
        Tab::Pengguna,
        Tab::Arsip,
    ];

    pub fn title(self) -> &'static str {
        match self {
            Tab::Dashboard => "Beranda",
            Tab::Monitoring => "Monitoring Ujian",
            Tab::Penilaian => "Penilaian & Rekap",
            Tab::BankSoal => "Bank Soal",
            Tab::Jadwal => "Jadwal Ujian",
            Tab::Siswa => "Data Siswa",
            Tab::Kelas => "Data Kelas",
            Tab::Mapel => "Mata Pelajaran",
            Tab::JenisUjian => "Jenis Ujian",
            Tab::Agama => "Agama",
            Tab::TahunAjaran => "Tahun Ajaran",
            Tab::Pengguna => "Pengguna",
            Tab::Arsip => "Arsip & Cadangan",
        }
    }
}

pub struct Entry {
    pub value: Arc<Value>,
    pub has_value: bool,
    pub offline: bool,
    pub saved_at: String,
    pub loading: bool,
    pub error: Option<String>,
    pub fetched: Instant,
}

pub struct Toast {
    pub text: String,
    pub ok: bool,
    pub at: Instant,
}

pub struct App {
    pub ctx: egui::Context,
    pub net: Option<Net>,
    tx: Sender<Msg>,
    rx: Receiver<Msg>,

    // login
    pub server: String,
    pub username: String,
    pub password: String,
    pub logging_in: bool,
    pub login_err: String,

    pub user: Option<Value>,
    pub scope: String,
    pub tab: Tab,
    pub store: HashMap<String, Entry>,
    pub toasts: Vec<Toast>,

    /// Isian form per tab/kolom, mis. "Kelas.name".
    pub form: HashMap<String, String>,
    pub filter: String,
    pub page: usize,
    pub sel: Option<String>,
    pub sel2: Option<String>,
    pub minutes: i64,
    pub confirm: Option<Confirm>,
    /// Status terakhir tiap siswa pada ujian yang dipantau: id -> (status, pelanggaran, offline)
    mon_prev: HashMap<String, (String, i64, bool)>,
}

#[derive(Clone)]
pub struct Confirm {
    pub text: String,
    pub body: Value,
    pub refresh: Vec<String>,
}

impl App {
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        let (tx, rx) = channel();
        crate::theme::apply(&cc.egui_ctx);
        let mut app = Self {
            ctx: cc.egui_ctx.clone(),
            net: None,
            tx,
            rx,
            server: cache::last_server(),
            username: String::new(),
            password: String::new(),
            logging_in: false,
            login_err: String::new(),
            user: None,
            scope: String::new(),
            tab: Tab::Dashboard,
            store: HashMap::new(),
            toasts: Vec::new(),
            form: HashMap::new(),
            filter: String::new(),
            page: 0,
            sel: None,
            sel2: None,
            minutes: 10,
            confirm: None,
            mon_prev: HashMap::new(),
        };
        // Untuk pengujian otomatis: UJIIN_SERVER / UJIIN_USER / UJIIN_PASS
        if let (Ok(s), Ok(u), Ok(p)) = (
            std::env::var("UJIIN_SERVER"),
            std::env::var("UJIIN_USER"),
            std::env::var("UJIIN_PASS"),
        ) {
            app.server = s;
            app.username = u;
            app.password = p;
            app.start_login();
            if let Ok(t) = std::env::var("UJIIN_TAB") {
                if let Some(tab) = Tab::ALL
                    .iter()
                    .find(|x| format!("{x:?}").eq_ignore_ascii_case(&t))
                {
                    app.tab = *tab;
                }
                app.sel = std::env::var("UJIIN_SEL").ok();
            }
        }
        app
    }

    pub fn is_admin(&self) -> bool {
        self.user
            .as_ref()
            .map(|u| util::text(u, "role") == "ADMIN")
            .unwrap_or(false)
    }

    pub fn tabs(&self) -> Vec<Tab> {
        let mut t = vec![
            Tab::Dashboard,
            Tab::Monitoring,
            Tab::Penilaian,
            Tab::BankSoal,
        ];
        if self.is_admin() {
            t.extend([
                Tab::Jadwal,
                Tab::Siswa,
                Tab::Kelas,
                Tab::Mapel,
                Tab::JenisUjian,
                Tab::Agama,
                Tab::TahunAjaran,
                Tab::Pengguna,
                Tab::Arsip,
            ]);
        }
        t
    }

    pub fn push_toast(&mut self, text: impl Into<String>, ok: bool) {
        self.toasts.push(Toast {
            text: text.into(),
            ok,
            at: Instant::now(),
        });
    }

    pub fn change_tab(&mut self, tab: Tab) {
        self.tab = tab;
        self.filter.clear();
        self.page = 0;
        self.sel = None;
        self.sel2 = None;
    }

    // ---------- data ----------

    /// Ambil `path` bila belum ada atau sudah lebih tua dari `ttl` detik.
    /// Mengembalikan entri (bisa belum berisi) untuk ditampilkan.
    pub fn ensure(&mut self, path: &str, ttl: u64) -> Option<&Entry> {
        let need = match self.store.get(path) {
            None => true,
            Some(e) => !e.loading && e.fetched.elapsed() > Duration::from_secs(ttl),
        };
        if need {
            self.fetch(path);
        }
        self.store.get(path)
    }

    pub fn fetch(&mut self, path: &str) {
        let Some(net) = self.net.clone() else { return };
        let e = self.store.entry(path.to_string()).or_insert_with(|| Entry {
            value: Arc::new(Value::Null),
            has_value: false,
            offline: false,
            saved_at: String::new(),
            loading: false,
            error: None,
            fetched: Instant::now(),
        });
        if e.loading {
            return;
        }
        e.loading = true;
        e.fetched = Instant::now();
        net.get(path, path);
    }

    pub fn send_rpc(&mut self, refresh: &[&str], body: Value) {
        let Some(net) = self.net.clone() else { return };
        net.rpc(&refresh.join("\n"), body);
    }

    pub fn logout(&mut self) {
        self.net = None;
        self.user = None;
        self.store.clear();
        self.password.clear();
        self.mon_prev.clear();
        self.change_tab(Tab::Dashboard);
    }

    fn handle_msgs(&mut self) {
        while let Ok(msg) = self.rx.try_recv() {
            match msg {
                Msg::Login(res) => {
                    self.logging_in = false;
                    match res {
                        Ok(me) => {
                            self.scope = format!("{}-{}", self.server, util::text(&me, "username"));
                            cache::remember_server(&self.server);
                            self.user = Some(me);
                            self.login_err.clear();
                        }
                        Err(e) => {
                            self.net = None;
                            self.login_err = e;
                        }
                    }
                }
                Msg::Data { key, res } => self.on_data(key, res),
                Msg::Rpc { label, res } => {
                    match res {
                        Ok(v) => {
                            let ok = v.get("success").and_then(|s| s.as_bool()).unwrap_or(true);
                            let msg = util::text(&v, "message");
                            let msg = if msg.is_empty() {
                                "Berhasil.".to_string()
                            } else {
                                msg
                            };
                            self.push_toast(msg, ok);
                            if ok {
                                for p in label.split('\n').filter(|p| !p.is_empty()) {
                                    self.fetch(p);
                                }
                                // token baru dari generateExamToken ikut tampil lewat refresh
                            }
                        }
                        Err(e) => {
                            if e.contains("Sesi berakhir") {
                                self.logout();
                                self.login_err = e;
                            } else {
                                self.push_toast(e, false);
                            }
                        }
                    }
                }
                Msg::File { res } => match res {
                    Ok(path) => self.push_toast(format!("Tersimpan: {path}"), true),
                    Err(e) => self.push_toast(e, false),
                },
            }
        }
    }

    fn on_data(&mut self, key: String, res: Result<Value, String>) {
        let scope = self.scope.clone();
        match res {
            Ok(v) => {
                if key.starts_with("monitoring/") {
                    self.check_monitoring_changes(&v);
                }
                cache::save(&scope, &key, &v);
                if let Some(e) = self.store.get_mut(&key) {
                    e.value = Arc::new(v);
                    e.has_value = true;
                    e.offline = false;
                    e.loading = false;
                    e.error = None;
                    e.fetched = Instant::now();
                }
            }
            Err(err) => {
                if err.contains("Sesi berakhir") {
                    self.logout();
                    self.login_err = err;
                    return;
                }
                let disk = cache::load(&scope, &key);
                if let Some(e) = self.store.get_mut(&key) {
                    e.loading = false;
                    e.fetched = Instant::now();
                    if !e.has_value {
                        if let Some((v, when)) = disk {
                            e.value = Arc::new(v);
                            e.has_value = true;
                            e.saved_at = when;
                        }
                    }
                    e.offline = e.has_value;
                    e.error = Some(err);
                }
            }
        }
    }

    /// Notifikasi untuk pengawas: pelanggaran baru, siswa terputus, siswa selesai.
    fn check_monitoring_changes(&mut self, v: &Value) {
        let title = util::text(v, "title");
        let Some(rows) = v.get("rows").and_then(|r| r.as_array()) else {
            return;
        };
        let first = self.mon_prev.is_empty();
        let mut alerts: Vec<String> = Vec::new();
        for r in rows {
            let id = util::text(r, "studentId");
            let name = util::text(r, "name");
            let status = util::text(r, "status");
            let viol = util::i64_of(r, "violationCount");
            let offline = util::bool_of(r, "offline");
            if let Some((ps, pv, po)) = self.mon_prev.get(&id) {
                if status == "CHEATED" && ps != "CHEATED" {
                    alerts.push(format!("{name} diblokir karena kecurangan"));
                } else if viol > *pv {
                    alerts.push(format!("{name} melanggar ({viol}x)"));
                } else if offline && !po {
                    alerts.push(format!("{name} terputus dari server"));
                } else if status == "SUBMITTED" && ps == "ONGOING" {
                    alerts.push(format!("{name} selesai mengerjakan"));
                }
            }
            self.mon_prev.insert(id, (status, viol, offline));
        }
        if !first {
            for a in alerts.into_iter().take(5) {
                notify::toast(&title, &a);
                self.push_toast(format!("{title}: {a}"), false);
            }
        }
    }

    pub fn start_login(&mut self) {
        let base = normalize_base(&self.server);
        if base.is_empty() || self.username.trim().is_empty() || self.password.is_empty() {
            self.login_err = "Isi alamat server, username, dan password.".into();
            return;
        }
        self.server = base.clone();
        self.logging_in = true;
        self.login_err.clear();
        let ctx = self.ctx.clone();
        let net = Net::new(
            base,
            self.tx.clone(),
            std::sync::Arc::new(move || ctx.request_repaint()),
        );
        net.login(self.username.clone(), self.password.clone());
        self.net = Some(net);
    }
}

impl eframe::App for App {
    fn logic(&mut self, _ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.handle_msgs();
        self.toasts
            .retain(|t| t.at.elapsed() < Duration::from_secs(6));
    }

    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        if self.user.is_none() {
            views::login(self, ui);
        } else {
            views::shell(self, ui);
        }
        views::toasts(self, ui.ctx());
        views::confirm_dialog(self, ui.ctx());
        // pantau berkala (heartbeat data & hilangkan toast)
        ui.ctx().request_repaint_after(Duration::from_millis(1000));
    }
}
