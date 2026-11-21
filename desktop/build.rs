// Menyematkan ikon & info versi ke UjiinGuru.exe agar tampil di File Explorer/taskbar.
fn main() {
    #[cfg(windows)]
    {
        let mut res = winresource::WindowsResource::new();
        res.set_icon("assets/icon.ico");
        res.set("ProductName", "Ujiin Guru");
        res.set("FileDescription", "Ujiin Guru - aplikasi guru & admin");
        res.set("CompanyName", "Ujiin");
        if let Err(e) = res.compile() {
            // Jangan gagalkan build bila alat resource tidak ada; ikon saja yang hilang.
            println!("cargo:warning=gagal menyematkan ikon: {e}");
        }
    }
    println!("cargo:rerun-if-changed=assets/icon.ico");
    println!("cargo:rerun-if-changed=build.rs");
}
