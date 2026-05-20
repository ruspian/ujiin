import { loginSiswaAction } from "@/actions/auth-siswa";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);

    const { nisn, passwordInput } = body;

    if (!nisn) {
      return NextResponse.json(
        {
          success: false,
          message: "NISN hilang!",
          receivedBody: body,
        },
        { status: 400 },
      );
    }

    const result = await loginSiswaAction(nisn, passwordInput);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan tidak dikenal";

    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
