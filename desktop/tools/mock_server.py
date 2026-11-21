#!/usr/bin/env python3
"""Server tiruan Ujiin untuk menguji aplikasi desktop tanpa database."""
import json, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

STATE = {"violations": 0, "extra": 0, "calls": []}
USERS = {"admin": ("rahasia123", "ADMIN", "Admin Sekolah"), "guru": ("rahasia123", "GURU", "Pak Guru")}
SESS = {}

def iso(t): return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(t))

NAMES = ["Ahmad", "Budi", "Citra", "Dewi", "Eka Putra", "Fajar", "Gita", "Hana", "Indra", "Joko", "Kiki", "Lestari",
         "Maya", "Nanda", "Oki", "Putri", "Rangga", "Sari", "Tono", "Umi", "Vina", "Wawan", "Yuni", "Zaki"]

def monitoring_detail():
    STATE["tick"] = STATE.get("tick", 0) + 1
    now = time.time()
    rows, events = [], []
    for i, n in enumerate(NAMES):
        st, viol, off, score = "ONGOING", 0, False, None
        if i % 8 == 3: st = "NOT_STARTED"
        elif i % 6 == 2: st, score = "SUBMITTED", 70 + i
        elif i == 1: off = True
        elif i == 4: viol = 2 + STATE["violations"]
        elif i == 7: st, viol = "CHEATED", 3
        if i == 9: viol = 1
        rows.append({"studentId": f"s{i}", "nisn": f"{100+i}", "name": n, "className": "X RPL 1" if i < 12 else "X RPL 2",
                     "status": st, "violationCount": viol, "score": score, "extraSeconds": STATE["extra"] if i == 0 else 0,
                     "offline": off, "silentSeconds": 90 if off else (3 if st == "ONGOING" else None),
                     "startedAt": None, "finishedAt": None})
        if st != "NOT_STARTED":
            events.append({"at": iso(now - 1100 + i * 20), "kind": "mulai", "studentId": f"s{i}", "name": n, "detail": "Mulai mengerjakan"})
        if st == "SUBMITTED":
            events.append({"at": iso(now - 300 - i * 9), "kind": "selesai", "studentId": f"s{i}", "name": n, "detail": f"Selesai, nilai {score}"})
        for v in range(viol):
            events.append({"at": iso(now - 600 + i * 11 + v * 40), "kind": "pelanggaran", "studentId": f"s{i}", "name": n,
                           "detail": "Keluar dari layar penuh" if v % 2 == 0 else "Pindah tab", "tertunda": v == 1 and i == 9})
    return {"id": "e1", "title": "UH Informatika", "subject": "Informatika", "status": "PUBLISHED", "token": "AB12CD",
            "startTime": iso(now - 1200), "endTime": iso(now + 2400 + STATE["extra"] * 60), "duration": 60, "now": iso(now),
            "announcement": None, "rows": rows, "events": events}

def beranda(role):
    now = time.time()
    ex = dict(EXAM, live=True, peserta=24, mengerjakan=15, selesai=4, melanggar=3, terputus=1,
              startTime=iso(now - 1200), endTime=iso(now + 2400), classes=["X RPL 1", "X RPL 2"])
    return {"now": iso(now), "role": role, "name": USERS[role.lower()][2], "tahunAjaran": "2026/2027",
            "progress": {"esaiTotal": 40, "esaiSelesai": 31, "ujianLive": 1, "ujianDiawasi": 3, "soalSaya": 140, "soalBaru": 6},
            "diawasi": [ex, dict(ex, id="e2", title="PTS Matematika", subject="Matematika", live=False, mengerjakan=0, selesai=0,
                                 melanggar=0, terputus=0, startTime=iso(now + 86400), endTime=iso(now + 90000))],
            "kabar": [
                {"id": "k1", "scope": "siswa", "tone": "info", "title": "UH Informatika sedang berlangsung", "text": "15 siswa mengerjakan, 4 sudah selesai.", "tab": "Monitoring", "sel": "e1"},
                {"id": "k2", "scope": "siswa", "tone": "good", "title": "Rata-rata PH Matematika 78,5", "text": "Naik 4,2 poin dari ujian sebelumnya.", "tab": "Penilaian"},
                {"id": "k3", "scope": "siswa", "tone": "warn", "title": "3 siswa melanggar aturan", "text": "Cek aliran kejadian di halaman pantau.", "tab": "Monitoring", "sel": "e1"},
                {"id": "k4", "scope": "guru", "tone": "good", "title": "6 soal baru pekan ini", "text": "Soal makin lengkap.", "tab": "BankSoal"},
                {"id": "k5", "scope": "guru", "tone": "warn", "title": "9 esai menunggu dinilai", "text": "Buka Penilaian untuk mengoreksi.", "tab": "Penilaian"},
                {"id": "k6", "scope": "sistem", "tone": "info", "title": "2 ujian belum punya pengawas", "text": "Atur di Jadwal Ujian.", "tab": "Jadwal"},
            ]}

EXAM = {"id": "e1", "title": "UH Informatika", "subject": "Informatika", "examType": "UH", "classes": ["X RPL 1"],
        "supervisor": "Pak Guru", "startTime": "2026-11-18T01:00:00.000Z", "endTime": "2026-11-18T03:00:00.000Z",
        "duration": 60, "status": "PUBLISHED", "token": "AB12CD", "attempts": 3}

def route(path, q, role):
    if path == "me": return {"id": "u1", "name": USERS[role.lower()][2], "username": role.lower(), "role": role}
    if path == "dashboard": return {"role": role, "siswaAktif": 320, "kelas": 12, "mapel": 14, "ujianAktif": 3,
                                    "soalSaya": 140, "ujianDiawasi": 2, "guru": 18 if role == "ADMIN" else None}
    if path == "beranda": return beranda(role)
    if path == "monitoring": return [EXAM]
    if path == "monitoring/e1": return monitoring_detail()
    year = (q.get("yearId") or [""])[0]
    if path == "soal":
        n = 2 if year in ("all", "y0") else (140 if year == "" else 0)
        if year == "all": n = 214
        return [{"id": "m1", "name": "Informatika", "questionCount": n, "classes": [{"id": "c1", "name": "X RPL 1"}, {"id": "c2", "name": "X RPL 2"}]},
                {"id": "m2", "name": "Matematika", "questionCount": 38 if year != "y0" else 12, "classes": [{"id": "c1", "name": "X RPL 1"}]}]
    if path == "soal/m1":
        types = ["MULTIPLE_CHOICE", "ESSAY", "TRUE_FALSE", "MULTIPLE_CHOICE_COMPLEX", "MATCHING"]
        want = (q.get("type") or [""])[0]
        old = year == "y0"
        items = []
        for i in range(1, 9):
            t = types[i % 5]
            if want and t != want: continue
            items.append({"id": "q%d" % i, "text": "<p>%s soal nomor %d: jelaskan konsep dasar komputer dan fungsi CPU</p>" % ("Lama" if old else "Baru", i),
                          "type": t, "score": 10 * (1 + i % 3), "options": [], "correctAnswer": "A" if t != "ESSAY" else "<p>Penyimpanan</p>",
                          "examType": "UH", "author": "Pak Guru", "classes": ["X RPL 1"], "createdAt": "2025-09-02T01:00:00.000Z" if old else "2026-08-14T01:00:00.000Z"})
        return {"total": len(items), "totalBobot": 92, "paketSoal": len(items), "page": 1, "pageSize": 50, "year": None if year == "all" else "2026/2027", "items": items}
    if path == "penilaian":
        if year == "y0": return [dict(EXAM, id="e0", title="PAS Ganjil Informatika", year="2025/2026 GANJIL", startTime="2025-12-10T01:00:00.000Z")]
        return [dict(EXAM, year="2026/2027 GANJIL")] + ([dict(EXAM, id="e0", title="PAS Ganjil Informatika", year="2025/2026 GANJIL", startTime="2025-12-10T01:00:00.000Z")] if year == "all" else [])
    if path == "penilaian/e1":
        return {"id": "e1", "title": "UH Informatika", "subject": "Informatika", "classes": ["X RPL 1"], "rows": [
            {"attemptId": "a1", "nisn": "001", "name": "Ahmad", "className": "X RPL 1", "status": "SUBMITTED", "score": 90, "violationCount": 0},
            {"attemptId": "a3", "nisn": "003", "name": "Citra", "className": "X RPL 1", "status": "SUBMITTED", "score": 88.5, "violationCount": 1}]}
    if path == "admin/kelas": return [{"id": "c1", "name": "X RPL 1", "level": 10, "students": 32}, {"id": "c2", "name": "X RPL 2", "level": 10, "students": 30}, {"id": "c3", "name": "XI RPL 1", "level": 11, "students": 28}]
    if path == "admin/siswa": return [{"id": "s%d" % i, "nisn": "%03d" % i, "name": "Siswa %d" % i, "status": "ACTIVE" if i % 9 else "GRADUATED",
                                       "classId": "c1" if i % 2 else "c2", "religionId": "r1",
                                       "class": {"id": "c1" if i % 2 else "c2", "name": "X RPL 1" if i % 2 else "X RPL 2"}, "religion": {"name": "Islam"}} for i in range(1, 251)]
    if path == "admin/mapel": return [{"id": "m1", "name": "Informatika", "religion": None,
                                       "religionId": "", "assignments": [{"class": c, "teacher": "Pak Guru"} for c in ["X RPL 1","X RPL 2","X RPL 3","X TKJ 1","X TKJ 2","XI RPL 1","XI RPL 2","XI TKJ 1"]] + [{"class": c, "teacher": "Bu Sari"} for c in ["XII RPL 1","XII RPL 2"]],
                                       "plot": [{"classId": "c1", "teacherId": "g1"}]}]
    if path == "admin/agama": return [{"id": "r1", "name": "Islam"}]
    if path == "admin/jenis-ujian": return [{"id": "t1", "name": "Ulangan Harian", "code": "UH"}]
    if path == "admin/tahun-ajaran": return [{"id": "y1", "year": "2026/2027", "semester": "GANJIL", "active": True}, {"id": "y0", "year": "2025/2026", "semester": "GENAP", "active": False}]
    if path == "admin/pengguna": return [{"id": "u1", "name": "Admin Sekolah", "username": "admin", "role": "ADMIN"}, {"id": "g1", "name": "Pak Guru", "username": "pakguru", "role": "GURU"}, {"id": "g2", "name": "Bu Sari", "username": "busari", "role": "GURU"}]
    if path == "admin/jadwal": return [dict(EXAM, year="2026/2027 GANJIL", yearId="y1", yearActive=True, subject="Informatika", examType="UH", classes=["X RPL 1"], supervisor="Pak Guru"),
                                       dict(EXAM, id="e2", title="PTS Matematika", status="DRAFT", year="2026/2027 GANJIL", yearId="y1", yearActive=True, subject="Matematika", examType="PTS", classes=["X RPL 1", "X RPL 2"], supervisor="Bu Sari", token=None),
                                       dict(EXAM, id="e0", title="PAS Ganjil Informatika", status="COMPLETED", year="2025/2026 GANJIL", yearId="y0", yearActive=False, subject="Informatika", examType="PAS", classes=["X RPL 1"], supervisor="Pak Guru", startTime="2025-12-10T01:00:00.000Z")]
    if path == "options": return {"subjects": [{"id": "m1", "name": "Informatika"}], "examTypes": [{"id": "t1", "name": "Ulangan Harian"}],
        "academicYears": [{"id": "y1", "year": "2026/2027", "semester": "GANJIL", "active": True}, {"id": "y0", "year": "2025/2026", "semester": "GENAP", "active": False}], "classes": [{"id": "c1", "name": "X RPL 1"}, {"id": "c2", "name": "X RPL 2"}],
        "religions": [{"id": "r1", "name": "Islam"}], "teachers": [{"id": "g1", "name": "Pak Guru"}, {"id": "g2", "name": "Bu Sari"}]}
    if path == "soal-form/m1": return {"subject": {"id": "m1", "name": "Informatika"}, "classes": [{"id": "c1", "name": "X RPL 1"}, {"id": "c2", "name": "X RPL 2"}],
        "examTypes": [{"id": "t1", "name": "Ulangan Harian"}]}
    if path == "soal-item/q1": return {"id": "q1", "subjectId": "m1", "typeId": "t1", "type": "MULTIPLE_CHOICE", "text": "<p>Apa kepanjangan <b>CPU</b>?</p>", "score": 10,
        "options": ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Control Process Unit"], "correctAnswer": "A", "classIds": ["c1"]}
    if path == "admin/jadwal-item/e1": return {"id": "e1", "title": "UH Informatika", "subjectId": "m1", "examTypeId": "t1", "academicYearId": "y1",
        "startTime": "2026-11-18T01:00:00.000Z", "endTime": "2026-11-18T03:00:00.000Z", "duration": 60, "status": "PUBLISHED", "classIds": ["c1"], "randomize": True,
        "supervisorId": "g1", "token": "AB12CD"}
    if path == "penilaian/attempt/a1": return {"id": "a1", "status": "SUBMITTED", "score": 60, "answers": {"q2": "RAM menyimpan data sementara saat komputer menyala.", "q1": "A"},
        "essayScores": {}, "student": {"name": "Ahmad", "nisn": "001", "className": "X RPL 1"}, "exam": {"id": "e1", "title": "UH Informatika", "subjectId": "m1"},
        "questions": [{"id": "q1", "text": "<p>Apa kepanjangan <b>CPU</b>?</p>", "type": "MULTIPLE_CHOICE", "score": 10, "options": ["Central Processing Unit", "Computer Personal Unit"], "correctAnswer": "A"},
                      {"id": "q2", "text": "<p>Jelaskan fungsi RAM.</p>", "type": "ESSAY", "score": 20, "options": [], "correctAnswer": "<p>Penyimpanan sementara</p>"}]}
    if path == "admin/kenaikan": return {"classes": [{"id": "c1", "name": "X RPL 1"}, {"id": "c2", "name": "XI RPL 1"}],
        "students": [{"id": "s%d" % i, "nisn": "%03d" % i, "name": "Siswa %d" % i, "classId": "c1"} for i in range(1, 9)]}
    return None

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, body, ctype="application/json", cookie=None):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype); self.send_header("Content-Length", str(len(data)))
        if cookie: self.send_header("Set-Cookie", cookie)
        self.end_headers(); self.wfile.write(data)
    def _role(self):
        c = self.headers.get("Cookie", "")
        for k, v in SESS.items():
            if "sess=" + k in c: return v
        return None
    def do_GET(self):
        u = urlparse(self.path); p = u.path
        if p == "/api/auth/csrf": return self._send(200, {"csrfToken": "tok123"}, cookie="csrf=tok123; Path=/")
        if p == "/api/admin/arsip":
            if self._role() != "ADMIN": return self._send(403, b"Akses ditolak", "text/plain")
            return self._send(200, "﻿NISN,Nama\r\n001,Ahmad\r\n".encode("utf-8"), "text/csv")
        if p.startswith("/api/v1/"):
            role = self._role()
            if not role: return self._send(401, {"success": False, "message": "Belum login"})
            path = p[len("/api/v1/"):]
            if path.startswith("admin/") and role != "ADMIN": return self._send(401, {"success": False, "message": "ditolak"})
            r = route(path, parse_qs(u.query), role)
            return self._send(200 if r is not None else 404, r if r is not None else {"success": False, "message": "tidak ada"})
        self._send(404, {})
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0)); body = self.rfile.read(n).decode()
        p = urlparse(self.path).path
        if p == "/api/auth/callback/credentials":
            f = {k: v[0] for k, v in parse_qs(body).items()}
            user = USERS.get(f.get("username", ""))
            if f.get("csrfToken") == "tok123" and user and user[0] == f.get("password"):
                tok = "t%d" % int(time.time() * 1000); SESS[tok] = user[1]
                return self._send(200, {"url": "/"}, cookie="sess=%s; Path=/; HttpOnly" % tok)
            return self._send(200, {"url": "/login?error=CredentialsSignin"})
        if p == "/api/v1/rpc":
            role = self._role()
            if not role: return self._send(401, {"success": False, "message": "Belum login"})
            req = json.loads(body); STATE["calls"].append(req)
            if req["action"] == "tambahWaktuUjian": STATE["extra"] += 600
            print("RPC", json.dumps(req), flush=True)
            return self._send(200, {"success": True, "message": "OK: " + req["action"]})
        self._send(404, {})

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8765), H).serve_forever()
