import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { STUDENT_COOKIE, verifyStudentSession } from "@/lib/student-session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // TARIK TOKEN ADMIN
  const authSession = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  // SESI SISWA: cookie harus bertanda tangan sah (bukan sekadar ada)
  const rawStudentCookie = request.cookies.get(STUDENT_COOKIE)?.value;
  const studentId = await verifyStudentSession(rawStudentCookie);
  const studentToken = studentId ?? undefined;

  // PROTEKSI HALAMAN ADMIN & GURU
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/guru") ||
    pathname.startsWith("/cetak")
  ) {
    if (!authSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", encodeURI(request.url));
      return NextResponse.redirect(loginUrl);
    }

    // Pembatasan per role. Sebelumnya akun guru bisa membuka semua halaman
    // /admin (daftar pengguna, siswa, jadwal). Aksi di server tetap dicek lagi
    // di dalam tiap server action; ini lapisan pertama.
    const role = authSession.role;
    const adminOnly =
      pathname.startsWith("/admin") || pathname.startsWith("/cetak");
    if (adminOnly && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname.startsWith("/guru") && role !== "GURU" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // PROTEKSI HALAMAN SISWA
  if (
    pathname.startsWith("/siswa") ||
    pathname.startsWith("/ruang-ujian") ||
    pathname.startsWith("/ujian")
  ) {
    if (!studentToken) {
      const redirect = NextResponse.redirect(
        new URL("/login-siswa", request.url),
      );
      // cookie rusak/kedaluwarsa dibersihkan agar tidak terus ditolak
      if (rawStudentCookie) redirect.cookies.delete(STUDENT_COOKIE);
      return redirect;
    }
  }

  // OPSIONAL: wajibkan ujian dikerjakan lewat aplikasi Android (APK).
  // Aktifkan dengan env EXAM_REQUIRE_APP=true. Aplikasi menambahkan
  // "UjiinApp/<versi>" ke User-Agent. Catatan: User-Agent bisa dipalsukan oleh
  // yang paham teknis; ini sekadar menutup jalan paling mudah (buka lewat
  // Chrome biasa), bukan jaminan mutlak.
  if (
    process.env.EXAM_REQUIRE_APP === "true" &&
    pathname.startsWith("/ujian")
  ) {
    const ua = request.headers.get("user-agent") ?? "";
    if (!/UjiinApp\//.test(ua)) {
      return NextResponse.redirect(new URL("/siswa?error=wajib_app", request.url));
    }
  }

  // CEGAH LOGIN BERULANG
  if (pathname === "/login" && authSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/login-siswa" && studentToken) {
    return NextResponse.redirect(new URL("/siswa", request.url));
  }

  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // CSP ringan (tidak membatasi script/style agar editor soal & KaTeX tetap jalan):
  // cegah ditanam di situs lain, form dikirim ke situs lain, dan plugin lama.
  response.headers.set(
    "Content-Security-Policy",
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  return response;
}

// KONFIGURASI MATCHER
export const config = {
  matcher: [
    /*
     * Mengeksekusi path halaman.
     * Mengabaikan: API routes, aset statis Next.js, dan semua file dengan ekstensi.
     */
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};
