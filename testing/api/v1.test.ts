import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    exam: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    student: { findMany: vi.fn(), count: vi.fn() },
    class: { count: vi.fn() },
    subject: { count: vi.fn() },
    question: { count: vi.fn() },
    user: { count: vi.fn() },
  },
}));
vi.mock("@/lib/finalize-attempts", () => ({
  finalizeExpiredAttempts: vi.fn(),
}));

const tambahWaktuUjian = vi.fn();
const createClass = vi.fn();
const deleteClass = vi.fn();
vi.mock("@/actions/academic", () => ({
  createAcademicYear: vi.fn(),
  deleteAcademicYear: vi.fn(),
  setActiveAcademicYear: vi.fn(),
  updateAcademicYear: vi.fn(),
}));
vi.mock("@/actions/class", () => ({
  createClass: (...a: unknown[]) => createClass(...a),
  deleteClass: (...a: unknown[]) => deleteClass(...a),
  updateClass: vi.fn(),
}));
const createExam = vi.fn();
vi.mock("@/actions/exam", () => ({
  deleteExam: vi.fn(),
  createExam: (...a: unknown[]) => createExam(...a),
  updateExam: vi.fn(),
  getQuestionsForExam: vi.fn(),
}));
vi.mock("@/actions/penilaian", () => ({
  simpanKoreksi: vi.fn(),
}));
vi.mock("@/actions/cloudinary", () => ({
  getCloudinarySignature: vi.fn(),
}));
vi.mock("@/actions/exam-type", () => ({
  createExamType: vi.fn(),
  deleteExamType: vi.fn(),
  updateExamType: vi.fn(),
}));
vi.mock("@/actions/kenaikan-kelas", () => ({
  prosesKenaikanKelas: vi.fn(),
}));
vi.mock("@/actions/monitoring", () => ({
  kirimPengumumanUjian: vi.fn(),
  resetSesiSiswa: vi.fn(),
  tambahWaktuUjian: (...a: unknown[]) => tambahWaktuUjian(...a),
}));
const createQuestion = vi.fn();
vi.mock("@/actions/question", () => ({
  createQuestion: (...a: unknown[]) => createQuestion(...a),
  importQuestions: vi.fn(),
  updateQuestion: vi.fn(),
  deleteManyQuestions: vi.fn(),
  deleteQuestion: vi.fn(),
}));
vi.mock("@/actions/religion", () => ({
  createReligion: vi.fn(),
  deleteReligion: vi.fn(),
  updateReligion: vi.fn(),
}));
vi.mock("@/actions/school", () => ({
  updateSchoolProfile: vi.fn(),
}));
vi.mock("@/actions/student", () => ({
  importStudents: vi.fn(),
  createStudent: vi.fn(),
  deleteStudent: vi.fn(),
  resetStudentPassword: vi.fn(),
  updateStudent: vi.fn(),
}));
vi.mock("@/actions/subject", () => ({
  createSubject: vi.fn(),
  deleteSubject: vi.fn(),
  updateSubject: vi.fn(),
}));
vi.mock("@/actions/ujian", () => ({
  generateExamToken: vi.fn(),
}));
vi.mock("@/actions/user", () => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  resetPassword: vi.fn(),
  updateUser: vi.fn(),
  importUsersBulk: vi.fn(),
}));

import { POST } from "@/app/api/v1/rpc/route";
import { GET } from "@/app/api/v1/[...path]/route";

const as = (role: "ADMIN" | "GURU" | null) =>
  (vi.mocked(auth) as Mock).mockResolvedValue(
    role ? { user: { id: "u1", name: "N", username: "n", role } } : null,
  );
const rpc = (body: unknown) =>
  POST(
    new Request("http://x/api/v1/rpc", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
const get = (path: string) =>
  GET(new Request(`http://x/api/v1/${path}`), {
    params: Promise.resolve({ path: path.split("?")[0].split("/") }),
  });

describe("POST /api/v1/rpc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    as("GURU");
  });

  test("createQuestion hanya dijalankan lewat aksi server (dilanjutkan ke action)", async () => {
    createQuestion.mockResolvedValue({ success: true, message: "ok" });
    const res = await rpc({ action: "createQuestion", args: [{ text: "x" }] });
    expect(res.status).toBe(200);
    expect(createQuestion).toHaveBeenCalledWith({ text: "x" });
  });

  test("createExam diteruskan ke aksi (cek peran tetap di server action)", async () => {
    createExam.mockResolvedValue({ success: false, message: "Hanya admin" });
    const res = await rpc({ action: "createExam", args: [{ title: "x" }] });
    expect(res.status).toBe(200);
    expect(createExam).toHaveBeenCalled();
  });

  test("tanpa login ditolak 401", async () => {
    as(null);
    expect((await rpc({ action: "tambahWaktuUjian", args: [] })).status).toBe(401);
    expect(tambahWaktuUjian).not.toHaveBeenCalled();
  });

  test("aksi di luar daftar ditolak 404", async () => {
    expect((await rpc({ action: "dropDatabase" })).status).toBe(404);
    expect((await rpc({ action: "toString" })).status).toBe(404);
  });

  test("aksi berargumen meneruskan args apa adanya", async () => {
    tambahWaktuUjian.mockResolvedValue({ success: true, message: "ok" });
    const res = await rpc({ action: "tambahWaktuUjian", args: ["e1", 10, null] });
    expect(await res.json()).toEqual({ success: true, message: "ok" });
    expect(tambahWaktuUjian).toHaveBeenCalledWith("e1", 10, null);
  });

  test("aksi form dibangun menjadi FormData", async () => {
    createClass.mockResolvedValue({ success: true });
    await rpc({ action: "createClass", form: { name: "X A", level: 10 } });
    const fd = createClass.mock.calls[0][0] as FormData;
    expect(fd.get("name")).toBe("X A");
    expect(fd.get("level")).toBe("10");
  });

  test("body bukan JSON ditolak 400", async () => {
    const res = await POST(
      new Request("http://x/api/v1/rpc", { method: "POST", body: "bukan json" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/*", () => {
  beforeEach(() => vi.clearAllMocks());

  test("tanpa login 401", async () => {
    as(null);
    expect((await get("me")).status).toBe(401);
  });

  test("guru tidak boleh membuka data admin", async () => {
    as("GURU");
    expect((await get("admin/siswa")).status).toBe(401);
    expect(prisma.student.findMany).not.toHaveBeenCalled();
  });

  test("admin boleh membuka data admin", async () => {
    as("ADMIN");
    vi.mocked(prisma.student.findMany).mockResolvedValue([] as never);
    const res = await get("admin/siswa");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test("daftar monitoring guru hanya ujian yang ia awasi", async () => {
    as("GURU");
    vi.mocked(prisma.exam.findMany).mockResolvedValue([] as never);
    await get("monitoring");
    const arg = vi.mocked(prisma.exam.findMany).mock.calls[0][0] as {
      where: { supervisorId?: string };
    };
    expect(arg.where.supervisorId).toBe("u1");
  });

  test("detail monitoring dibatasi pembuat/pengawas untuk guru, 404 bila bukan", async () => {
    as("GURU");
    vi.mocked(prisma.exam.findFirst).mockResolvedValue(null as never);
    expect((await get("monitoring/e9")).status).toBe(404);
    const arg = vi.mocked(prisma.exam.findFirst).mock.calls[0][0] as {
      where: { OR?: unknown[] };
    };
    expect(arg.where.OR).toEqual([{ supervisorId: "u1" }, { authorId: "u1" }]);
  });

  test("endpoint tidak dikenal 404", async () => {
    as("ADMIN");
    expect((await get("rahasia")).status).toBe(404);
  });
});

describe("yearRange", () => {
  test("tahun ajaran 2025/2026 = 1 Jul 2025 s/d 1 Jul 2026 WITA", async () => {
    const { yearRange } = await import("@/lib/api-v1");
    const r = yearRange("2025/2026");
    expect(r?.gte.toISOString()).toBe("2025-06-30T16:00:00.000Z");
    expect(r?.lt.toISOString()).toBe("2026-06-30T16:00:00.000Z");
  });
  test("format salah → null", async () => {
    const { yearRange } = await import("@/lib/api-v1");
    expect(yearRange("2025")).toBeNull();
    expect(yearRange("")).toBeNull();
  });
});

describe("beranda (helper murni)", () => {
  test("trendText naik/turun/sama/tanpa pembanding", async () => {
    const { trendText } = await import("@/lib/api-v1-beranda");
    expect(trendText(80, 74)).toBe("naik 6 poin dibanding ujian sebelumnya");
    expect(trendText(70.5, 75)).toBe("turun 4.5 poin dibanding ujian sebelumnya");
    expect(trendText(70, 70)).toBe("sama dengan ujian sebelumnya");
    expect(trendText(70, null)).toBeNull();
  });
  test("avg dibulatkan satu desimal, kosong → null", async () => {
    const { avg } = await import("@/lib/api-v1-beranda");
    expect(avg([80, 75, 90])).toBe(81.7);
    expect(avg([])).toBeNull();
  });
  test("countEssayPending hanya menghitung esai terisi tanpa nilai", async () => {
    const { countEssayPending } = await import("@/lib/api-v1-beranda");
    const r = countEssayPending(
      [
        { answers: { e1: "jawaban", e2: "  ", pg: "A" }, essayScores: { e1: 5 } },
        { answers: { e1: "x", e3: "y" }, essayScores: null },
      ],
      new Set(["e1", "e2", "e3"]),
    );
    expect(r).toEqual({ total: 3, pending: 2 });
  });
  test("liveCounts: terputus bila heartbeat > 45 dtk", async () => {
    const { liveCounts } = await import("@/lib/api-v1-beranda");
    const now = Date.now();
    const c = liveCounts(
      [
        { status: "ONGOING", violationCount: 0, lastSeenAt: new Date(now - 5_000) },
        { status: "ONGOING", violationCount: 2, lastSeenAt: new Date(now - 90_000) },
        { status: "SUBMITTED", violationCount: 0, lastSeenAt: null },
      ],
      10,
      now,
    );
    expect(c).toEqual({ peserta: 10, mengerjakan: 2, selesai: 1, melanggar: 1, terputus: 1 });
  });
  test("buildEvents mengurutkan terbaru dulu dan mengabaikan log rusak", async () => {
    const { buildEvents } = await import("@/lib/api-v1-beranda");
    const ev = buildEvents([
      {
        studentId: "s1",
        name: "Ahmad",
        startTime: new Date("2026-11-20T01:00:00Z"),
        endTime: null,
        status: "ONGOING",
        violationLogs: [{ waktu: "2026-11-20T01:10:00Z", jenis: "keluar_aplikasi" }, { jenis: "rusak" }],
      },
    ]);
    expect(ev.map((e) => e.kind)).toEqual(["pelanggaran", "mulai"]);
    expect(ev[0].detail).toBe("keluar_aplikasi");
  });
});
