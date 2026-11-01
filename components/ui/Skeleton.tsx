import type { HTMLAttributes } from "react";

/** Kotak abu-abu berdenyut sebagai pengganti konten yang belum selesai dimuat. */
export function Skeleton({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-gray-200/80 ${className}`}
      {...props}
    />
  );
}

/** Judul halaman + subjudul. */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-48 max-w-[70%]" />
      <Skeleton className="h-4 w-72 max-w-[90%]" />
    </div>
  );
}

/** Deretan tab (mis. menu Data Master). */
export function TabsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-6 overflow-hidden border-b border-gray-200 pb-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-5 w-24 shrink-0" />
      ))}
    </div>
  );
}

/** Kartu tabel dengan baris-baris data. */
export function TableSkeleton({
  rows = 6,
  columns = 4,
  withToolbar = true,
}: {
  rows?: number;
  columns?: number;
  withToolbar?: boolean;
}) {
  return (
    <div className="space-y-4">
      {withToolbar && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-11 w-full rounded-xl sm:max-w-xs" />
          <Skeleton className="h-11 w-full rounded-xl sm:w-40" />
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex gap-4 border-b border-gray-100 bg-gray-50 px-5 py-4">
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div
            key={r}
            className="flex items-center gap-4 border-b border-gray-50 px-5 py-4 last:border-0"
          >
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton
                key={c}
                className={`h-4 flex-1 ${c === 0 ? "max-w-[40%]" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Deretan kartu ringkasan (statistik). */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl sm:h-12 sm:w-12" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Kartu-kartu daftar (jadwal ujian siswa, mapel, dll). */
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
