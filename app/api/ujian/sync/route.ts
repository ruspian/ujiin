import { NextResponse, type NextRequest } from "next/server";
import { getStudentIdFromSession } from "@/lib/getStudentAuth";
import {
  autoSaveJawaban,
  catatPelanggaran,
  cekStatusAttempt,
  heartbeatUjian,
  submitUjianSiswa,
} from "@/actions/ruang-ujian";
import type { AnswersMap } from "@/types/ruang-ujian";

/**
 * Jalur komunikasi ruang ujian (simpan jawaban, heartbeat, pelanggaran, submit).
 *
 * Kenapa bukan Server Action? Next.js mengantre Server Action dan
 * menjalankannya SATU PER SATU di client. Di jaringan jelek, satu autosave yang
 * menggantung memblokir heartbeat, pencatatan pelanggaran, dan submit di
 * belakangnya. Dengan fetch biasa, tiap request punya batas waktu sendiri dan
 * bisa dibatalkan, jadi satu request macet tidak melumpuhkan yang lain.
 *
 * Logika bisnis tetap satu sumber: actions/ruang-ujian.ts.
 */

const MAX_BODY_BYTES = 450_000;
const NO_STORE = { "Cache-Control": "no-store" };

type Body =
  | { type: "save"; attemptId: string; answers: AnswersMap; seq?: number }
  | { type: "heartbeat"; attemptId: string }
  | { type: "status"; attemptId: string }
  | { type: "submit"; attemptId: string; answers: AnswersMap }
  | {
      type: "violation";
      attemptId: string;
      jenis: string;
      sumber?: "web" | "android";
      occurredAt?: string;
    };

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  // Tolak permintaan lintas-situs (CSRF): origin, bila ada, harus host kita.
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      return json({ success: false, message: "Permintaan ditolak." }, 403);
    }
    if (originHost !== request.headers.get("host")) {
      return json({ success: false, message: "Permintaan ditolak." }, 403);
    }
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    return json({ success: false, message: "Data terlalu besar." }, 413);
  }

  if (!(await getStudentIdFromSession())) {
    return json(
      { success: false, unauthorized: true, message: "Sesi login berakhir." },
      401,
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ success: false, message: "Permintaan tidak valid." }, 400);
  }

  if (!body || typeof body.attemptId !== "string" || !body.attemptId) {
    return json({ success: false, message: "Permintaan tidak valid." }, 400);
  }

  switch (body.type) {
    case "save":
      return json(
        await autoSaveJawaban(body.attemptId, body.answers, body.seq),
      );
    case "heartbeat":
      return json(await heartbeatUjian(body.attemptId));
    case "status":
      return json(await cekStatusAttempt(body.attemptId));
    case "submit":
      return json(await submitUjianSiswa(body.attemptId, body.answers));
    case "violation":
      return json(
        await catatPelanggaran(
          body.attemptId,
          body.jenis,
          body.sumber === "android" ? "android" : "web",
          body.occurredAt,
        ),
      );
    default:
      return json({ success: false, message: "Permintaan tidak dikenal." }, 400);
  }
}
