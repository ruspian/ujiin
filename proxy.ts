import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // TARIK TOKEN ADMIN
  const authSession = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  // TARIK TOKEN SISWA
  const studentToken = request.cookies.get("student_id")?.value;

  // PROTEKSI HALAMAN ADMIN & GURU
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/guru")
  ) {
    if (!authSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", encodeURI(request.url));
      return NextResponse.redirect(loginUrl);
    }
  }

  // PROTEKSI HALAMAN SISWA
  if (pathname.startsWith("/siswa") || pathname.startsWith("/ruang-ujian")) {
    if (!studentToken) {
      return NextResponse.redirect(new URL("/login-siswa", request.url));
    }
  }

  // CEGAH LOGIN BERULANG
  if (pathname === "/login" && authSession) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (pathname === "/login-siswa" && studentToken) {
    return NextResponse.redirect(new URL("/siswa", request.url));
  }

  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
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
