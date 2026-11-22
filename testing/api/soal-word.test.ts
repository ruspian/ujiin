import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/lib/api-v1", () => ({
  requireStaff: vi.fn(),
  json: (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }),
  fail: (message: string, status = 400) =>
    new Response(JSON.stringify({ success: false, message }), { status }),
}));

import { requireStaff } from "@/lib/api-v1";
import { POST } from "@/app/api/v1/soal-word/route";

const docx = fs.readFileSync(path.join(__dirname, "../fixtures/word/sejarah-xi.docx"));
const req = (body: Uint8Array | string, qs = "") =>
  new Request(`http://x/api/v1/soal-word${qs}`, { method: "POST", body: body as never });

describe("POST /api/v1/soal-word", () => {
  beforeEach(() => vi.clearAllMocks());

  it("menolak non-guru", async () => {
    vi.mocked(requireStaff).mockResolvedValue(null);
    const res = await POST(req(new Uint8Array(docx)));
    expect(res.status).toBe(403);
    expect(requireStaff).toHaveBeenCalledWith("GURU");
  });

  it("mengonversi docx milik guru", async () => {
    vi.mocked(requireStaff).mockResolvedValue({ id: "g", name: "G", username: "g", role: "GURU" });
    const res = await POST(req(new Uint8Array(docx)));
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.success).toBe(true);
    expect(j.rows.length).toBeGreaterThan(30);
  });

  it("berkas bukan docx → 400 dengan pesan ramah", async () => {
    vi.mocked(requireStaff).mockResolvedValue({ id: "g", name: "G", username: "g", role: "GURU" });
    const res = await POST(req("halo"));
    expect(res.status).toBe(400);
  });
});
