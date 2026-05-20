import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

interface RateLimitData {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitData>();

// Maksimal 5 kali coba POST dalam 1 menit
const MAX_ATTEMPTS = 5;
const TIME_WINDOW = 60 * 1000;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (
    (pathname === "/login" || pathname === "/login-siswa") &&
    method === "POST"
  ) {
    const forwardedFor = request.headers.get("x-forwarded-for");

    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const now = Date.now();

    const clientLog = rateLimitMap.get(ip);

    if (!clientLog) {
      // Pendaftaran pertama IP
      rateLimitMap.set(ip, { count: 1, resetTime: now + TIME_WINDOW });
    } else {
      if (now > clientLog.resetTime) {
        // Kalau waktu blokir 1 menit udah lewat, reset ulang
        rateLimitMap.set(ip, { count: 1, resetTime: now + TIME_WINDOW });
      } else {
        // Masih dalam jeda 1 menit yang sama, naikkan hit angka mencoba
        clientLog.count++;

        if (clientLog.count > MAX_ATTEMPTS) {
          // Kirim respon error 429
          return new NextResponse(
            JSON.stringify({
              success: false,
              message:
                "Terlalu banyak mencoba login! Silakan tunggu 1 menit lagi.",
            }),
            {
              status: 429,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }
    }
  }

  // auth admin dan guru
  const authSession = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  //  TOKEN SISWA
  const studentToken = request.cookies.get("student_id")?.value;

  // PROTEKSI HALAMAN ADMIN & GURU
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!authSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // PROTEKSI HALAMAN SISWA
  if (pathname.startsWith("/siswa") || pathname.startsWith("/ruang-ujian")) {
    // Belum login siswa
    if (!studentToken) {
      return NextResponse.redirect(new URL("/login-siswa", request.url));
    }
  }

  // CEGAH USER LOGIN BALIK KE FORM LOGIN
  if (pathname === "/login" && authSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
     * Middleware hanya mengeksekusi path halaman.
     * Mengabaikan:
     * - API routes (/api/...)
     * - Aset statis & internal Next.js (/_next/...)
     * - Semua file berekstensi seperti gambar, favicon, CSS (.*\..*)
     */
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};
