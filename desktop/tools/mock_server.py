#!/usr/bin/env python3
"""Server tiruan Ujiin untuk menguji aplikasi desktop tanpa database."""
import json, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

STATE = {"violations": 0, "extra": 0, "calls": []}
USERS = {"admin": ("rahasia123", "ADMIN", "Admin Sekolah"), "guru": ("rahasia123", "GURU", "Pak Guru")}
SESS = {}

def monitoring_detail():
    STATE["violations"] += 1 if STATE.get("tick", 0) % 2 else 0
    STATE["tick"] = STATE.get("tick", 0) + 1
    rows = [
        {"studentId": "s1", "nisn": "001", "name": "Ahmad", "className": "X RPL 1", "status": "ONGOING",
         "violationCount": STATE["violations"], "score": None, "extraSeconds": STATE["extra"], "offline": False, "silentSeconds": 3},
        {"studentId": "s2", "nisn": "002", "name": "Budi", "className": "X RPL 1", "status": "ONGOING",
         "violationCount": 0, "score": None, "extraSeconds": 0, "offline": True, "silentSeconds": 90},
        {"studentId": "s3", "nisn": "003", "name": "Citra", "className": "X RPL 1", "status": "SUBMITTED",
         "violationCount": 0, "score": 88.5, "extraSeconds": 0, "offline": False, "silentSeconds": None},
        {"studentId": "s4", "nisn": "004", "name": "Dewi", "className": "X RPL 1", "status": "NOT_STARTED",
         "violationCount": 0, "score": None, "extraSeconds": 0, "offline": False, "silentSeconds": None},
    ]
    return {"id": "e1", "title": "UH Informatika", "subject": "Informatika", "status": "PUBLISHED", "token": "AB12CD",
            "startTime": "2026-11-18T01:00:00.000Z", "endTime": "2026-11-18T03:00:00.000Z", "duration": 60,
            "announcement": None, "rows": rows}

EXAM = {"id": "e1", "title": "UH Informatika", "subject": "Informatika", "examType": "UH", "classes": ["X RPL 1"],
        "supervisor": "Pak Guru", "startTime": "2026-11-18T01:00:00.000Z", "endTime": "2026-11-18T03:00:00.000Z",
        "duration": 60, "status": "PUBLISHED", "token": "AB12CD", "attempts": 3}

def route(path, q, role):
    if path == "me": return {"id": "u1", "name": USERS[role.lower()][2], "username": role.lower(), "role": role}
    if path == "dashboard": return {"role": role, "siswaAktif": 320, "kelas": 12, "mapel": 14, "ujianAktif": 3,
                                    "soalSaya": 140, "ujianDiawasi": 2, "guru": 18 if role == "ADMIN" else None}
    if path == "monitoring": return [EXAM]
    if path == "monitoring/e1": return monitoring_detail()
    if path == "soal": return [{"id": "m1", "name": "Informatika", "questionCount": 2, "classes": [{"id": "c1", "name": "X RPL 1"}]}]
    if path == "soal/m1":
        return {"total": 2, "page": 1, "pageSize": 50, "items": [
            {"id": "q1", "text": "<p>Apa kepanjangan <b>CPU</b>?</p>", "type": "MULTIPLE_CHOICE", "score": 10, "options": [],
             "correctAnswer": "o1", "examType": "UH", "author": "Pak Guru", "classes": ["X RPL 1"]},
            {"id": "q2", "text": "<p>Jelaskan fungsi RAM.</p>", "type": "ESSAY", "score": 20, "options": [],
             "correctAnswer": "<p>Penyimpanan sementara</p>", "examType": "UH", "author": "Pak Guru", "classes": ["X RPL 1"]}]}
    if path == "penilaian": return [EXAM]
    if path == "penilaian/e1":
        return {"id": "e1", "title": "UH Informatika", "subject": "Informatika", "classes": ["X RPL 1"], "rows": [
            {"attemptId": "a1", "nisn": "001", "name": "Ahmad", "className": "X RPL 1", "status": "SUBMITTED", "score": 90, "violationCount": 0},
            {"attemptId": "a3", "nisn": "003", "name": "Citra", "className": "X RPL 1", "status": "SUBMITTED", "score": 88.5, "violationCount": 1}]}
    if path == "admin/kelas": return [{"id": "c1", "name": "X RPL 1", "level": 10, "students": 32}]
    if path == "admin/siswa": return [{"id": "s%d" % i, "nisn": "%03d" % i, "name": "Siswa %d" % i, "status": "ACTIVE",
                                       "class": {"id": "c1", "name": "X RPL 1"}, "religion": {"name": "Islam"}} for i in range(1, 251)]
    if path == "admin/mapel": return [{"id": "m1", "name": "Informatika", "religion": None,
                                       "assignments": [{"class": "X RPL 1", "teacher": "Pak Guru"}]}]
    if path == "admin/agama": return [{"id": "r1", "name": "Islam"}]
    if path == "admin/jenis-ujian": return [{"id": "t1", "name": "Ulangan Harian", "code": "UH"}]
    if path == "admin/tahun-ajaran": return [{"id": "y1", "year": "2026/2027", "semester": "GANJIL", "active": True}]
    if path == "admin/pengguna": return [{"id": "u1", "name": "Admin Sekolah", "username": "admin", "role": "ADMIN"}]
    if path == "admin/jadwal": return [dict(EXAM, year="2026/2027 GANJIL")]
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
