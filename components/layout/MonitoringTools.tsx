"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Timer, Loader2 } from "lucide-react";
import { kirimPengumumanUjian, tambahWaktuUjian } from "@/actions/monitoring";

const QUICK_MESSAGES = [
  "Waktu tersisa 10 menit.",
  "Harap tenang dan kerjakan sendiri.",
  "Periksa kembali jawaban sebelum mengumpulkan.",
];
const MINUTES = [5, 10, 15, 30];

/** Kirim pengumuman ke layar semua siswa yang sedang ujian. */
export function PengumumanForm({ examId }: { examId: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await kirimPengumumanUjian(examId, text);
      if (res.success) {
        toast.success(res.message);
        setText("");
      } else {
        toast.error(res.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-600">
        <Megaphone size={16} className="text-amber-500" /> Pengumuman ke Siswa
      </h3>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="Tulis pesan singkat untuk semua siswa yang sedang ujian..."
          className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !text.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white shadow-sm transition-all hover:bg-amber-600 active:scale-95 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
          Kirim
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK_MESSAGES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setText(m)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-100"
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tambah waktu untuk satu siswa, atau semua siswa yang sedang mengerjakan. */
export function TambahWaktu({
  examId,
  studentId,
  label,
  compact = false,
}: {
  examId: string;
  studentId?: string;
  label?: string;
  compact?: boolean;
}) {
  const [minutes, setMinutes] = useState(10);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (!studentId && !confirm(`Tambah ${minutes} menit untuk SEMUA siswa yang sedang mengerjakan?`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await tambahWaktuUjian(examId, minutes, studentId ?? null);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <select
        value={minutes}
        onChange={(e) => setMinutes(Number(e.target.value))}
        aria-label="Menit tambahan"
        className={`rounded-lg border-gray-300 bg-white font-bold text-gray-700 focus:border-teal-500 focus:ring-teal-500 ${compact ? "py-1 pl-2 pr-6 text-[11px]" : "py-2 pl-3 pr-8 text-sm"}`}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            +{m} mnt
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={apply}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 font-black uppercase tracking-tight text-teal-700 transition-all hover:bg-teal-100 active:scale-95 disabled:opacity-50 ${compact ? "px-2.5 py-1 text-[10px]" : "px-3.5 py-2 text-xs"}`}
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Timer size={13} />}
        {label ?? "Tambah Waktu"}
      </button>
    </div>
  );
}
