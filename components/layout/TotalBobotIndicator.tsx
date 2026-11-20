import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

const TARGET = 100;

export default function TotalBobotIndicator({
  totalBobot,
  jumlahSoal,
}: {
  totalBobot: number;
  jumlahSoal: number;
}) {
  const selisih = TARGET - totalBobot;
  const pas = selisih === 0;
  const lebih = selisih < 0;
  const persen = Math.min(100, Math.round((totalBobot / TARGET) * 100));

  const warna = pas
    ? "bg-green-50 border-green-200 text-green-800"
    : lebih
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-amber-50 border-amber-200 text-amber-800";
  const bar = pas ? "bg-green-500" : lebih ? "bg-red-500" : "bg-amber-500";
  const Ikon = pas ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm space-y-3 ${warna}`}
      data-testid="total-bobot"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold">
          <Ikon size={18} />
          Total bobot: {totalBobot} / {TARGET}
          <span className="font-medium opacity-80">
            ({jumlahSoal} soal)
          </span>
        </div>
        <span className="text-sm font-bold">
          {pas
            ? "Pas 100, siap dipakai"
            : lebih
              ? `Kelebihan ${-selisih} poin`
              : `Kurang ${selisih} poin`}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/70 overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${persen}%` }} />
      </div>
      <p className="flex items-start gap-2 text-xs opacity-90">
        <Info size={14} className="mt-0.5 shrink-0" />
        Total bobot semua soal maksimal 100 (semua jenis soal dihitung). Contoh:
        25 soal pilihan ganda bobot 4 = 100. Nilai siswa tetap otomatis
        berskala 0–100.
      </p>
    </div>
  );
}
