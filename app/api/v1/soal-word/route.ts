import { fail, json, requireStaff } from "@/lib/api-v1";
import { convertWordSoal } from "@/lib/word-soal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // batas body fungsi serverless ~4,5 MB

/**
 * POST /api/v1/soal-word
 * Body: isi mentah berkas .docx. Balasan: { success, rows, warnings, counts }.
 * rows memakai kolom template Excel (Tipe_Soal, Teks_Soal, Opsi_A..E) tanpa Kunci_Jawaban
 * dan Skor: keduanya diisi guru sendiri di Excel sebelum diunggah lewat Import.
 */
export async function POST(req: Request) {
  const user = await requireStaff("GURU");
  if (!user) return fail("Akses ditolak.", 403);

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) return fail("Berkas terlalu besar (maksimal 4 MB).", 413);

  const body = new Uint8Array(await req.arrayBuffer());
  if (body.byteLength === 0) return fail("Berkas kosong.");
  if (body.byteLength > MAX_BYTES) return fail("Berkas terlalu besar (maksimal 4 MB).", 413);

  try {
    const hasil = await convertWordSoal(body);
    return json({ success: true, ...hasil });
  } catch {
    return fail("Berkas tidak bisa dibaca. Pastikan formatnya .docx (bukan .doc lama).");
  }
}
