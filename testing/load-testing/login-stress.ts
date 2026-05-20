import http from "k6/http";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 50 }, // Angetin mesin (50 user)
    { duration: "30s", target: 200 }, // HANTAM dengan 200 user barengan!
    { duration: "10s", target: 0 }, // Cool down
  ],
};

export default function loginStress() {
  const BASE_URL = "http://localhost:3000";

  // Hash/ID ini lu dapetin dari tab Network tadi
  const ACTION_ID = "i600b11bc12a2c3cdb52180fa11cd680e41ca088da9";

  const payload = JSON.stringify({
    nisn: "1234567890",
    passwordInput: "password123",
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      "next-action": ACTION_ID,
    },
  };

  const res = http.post(`${BASE_URL}/api/login-test`, payload, params);

  // Verifikasi apakah response berhasil
  const results = check(res, {
    "status 200": (r) => r.status === 200,
    "login sukses": (r) =>
      r.body !== null && r.body.toString().includes("success"),
  });

  // 2. Kalau hasilnya false (artinya ada yang gagal), baru log isinya
  if (!results) {
    console.log("LOGIN GAGAL! Response Body:", res.body?.toString());
  }
}
