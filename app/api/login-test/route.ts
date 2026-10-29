import { loginSiswaAction } from "@/actions/auth-siswa";
import { NextResponse } from "next/server";

/**
 * Endpoint KHUSUS uji beban (k6, lihat testing/load-testing).
 * Mati secara bawaan (404). Aktifkan hanya sementara di mesin uji dengan
 * ENABLE_LOGIN_TEST=true, dan matikan lagi sesudahnya. Jangan pernah
 * diaktifkan di server yang dipakai siswa sungguhan.
 */
export async function POST(req: Request) {
  if (process.env.ENABLE_LOGIN_TEST !== "true") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const body = JSON.parse(await req.text());
    const { nisn, passwordInput } = body ?? {};

    if (!nisn) {
      return NextResponse.json(
        { success: false, message: "NISN hilang!" },
        { status: 400 },
      );
    }

    const result = await loginSiswaAction(nisn, passwordInput);
    return NextResponse.json(result);
  } catch (error) {
    console.error("login-test error:", error);
    return NextResponse.json(
      { success: false, message: "Permintaan tidak valid." },
      { status: 400 },
    );
  }
}
