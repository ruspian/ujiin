import { fail, json, requireStaff } from "@/lib/api-v1";
import * as monitoring from "@/actions/monitoring";
import * as exam from "@/actions/exam";
import * as ujian from "@/actions/ujian";
import * as question from "@/actions/question";
import * as subject from "@/actions/subject";
import * as kelas from "@/actions/class";
import * as religion from "@/actions/religion";
import * as examType from "@/actions/exam-type";
import * as academic from "@/actions/academic";
import * as student from "@/actions/student";
import * as user from "@/actions/user";
import * as kenaikan from "@/actions/kenaikan-kelas";
import * as school from "@/actions/school";

export const dynamic = "force-dynamic";

type Fn = (...args: never[]) => Promise<unknown>;
type Entry = { fn: Fn; kind: "args" | "form" };

const args = (fn: unknown): Entry => ({ fn: fn as Fn, kind: "args" });
const form = (fn: unknown): Entry => ({ fn: fn as Fn, kind: "form" });

/**
 * Daftar aksi yang boleh dipanggil dari aplikasi desktop. Setiap aksi tetap
 * memeriksa role/kepemilikan sendiri; daftar ini hanya membatasi apa yang
 * bisa dijangkau lewat endpoint ini.
 */
const ACTIONS: Record<string, Entry> = {
  // guru & admin
  tambahWaktuUjian: args(monitoring.tambahWaktuUjian),
  kirimPengumumanUjian: args(monitoring.kirimPengumumanUjian),
  resetSesiSiswa: form(monitoring.resetSesiSiswa),
  generateExamToken: args(ujian.generateExamToken),
  deleteQuestion: args(question.deleteQuestion),
  deleteManyQuestions: args(question.deleteManyQuestions),
  deleteExam: form(exam.deleteExam),
  // admin
  createSubject: form(subject.createSubject),
  updateSubject: form(subject.updateSubject),
  deleteSubject: args(subject.deleteSubject),
  createClass: form(kelas.createClass),
  updateClass: form(kelas.updateClass),
  deleteClass: args(kelas.deleteClass),
  createReligion: form(religion.createReligion),
  updateReligion: form(religion.updateReligion),
  deleteReligion: form(religion.deleteReligion),
  createExamType: form(examType.createExamType),
  updateExamType: form(examType.updateExamType),
  deleteExamType: form(examType.deleteExamType),
  createAcademicYear: form(academic.createAcademicYear),
  updateAcademicYear: form(academic.updateAcademicYear),
  deleteAcademicYear: form(academic.deleteAcademicYear),
  setActiveAcademicYear: form(academic.setActiveAcademicYear),
  createStudent: form(student.createStudent),
  updateStudent: form(student.updateStudent),
  deleteStudent: args(student.deleteStudent),
  resetStudentPassword: form(student.resetStudentPassword),
  createUser: form(user.createUser),
  updateUser: form(user.updateUser),
  deleteUser: args(user.deleteUser),
  resetPassword: form(user.resetPassword),
  prosesKenaikanKelas: args(kenaikan.prosesKenaikanKelas),
  updateSchoolProfile: form(school.updateSchoolProfile),
};

export async function POST(req: Request) {
  if (!(await requireStaff())) return fail("Belum login / akses ditolak.", 401);

  let body: { action?: string; args?: unknown[]; form?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return fail("Body bukan JSON.");
  }

  // hasOwn: nama seperti "toString"/"constructor" tidak boleh lolos lewat prototype
  const entry =
    typeof body.action === "string" && Object.hasOwn(ACTIONS, body.action)
      ? ACTIONS[body.action]
      : undefined;
  if (!entry) return fail("Aksi tidak dikenal.", 404);

  try {
    let result: unknown;
    if (entry.kind === "form") {
      const fd = new FormData();
      for (const [key, value] of Object.entries(body.form ?? {})) {
        if (Array.isArray(value)) value.forEach((v) => fd.append(key, String(v)));
        else if (value !== null && value !== undefined) fd.append(key, String(value));
      }
      result = await (entry.fn as unknown as (f: FormData) => Promise<unknown>)(fd);
    } else {
      const list = Array.isArray(body.args) ? body.args : [];
      result = await (entry.fn as unknown as (...a: unknown[]) => Promise<unknown>)(...list);
    }
    return json(result ?? { success: true });
  } catch (error) {
    console.error("API_V1_RPC_ERROR:", body.action, error);
    return fail("Terjadi kesalahan pada server.", 500);
  }
}
