import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function SiswaLoading() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-6 px-4 py-8"
      role="status"
      aria-label="Memuat jadwal ujian"
    >
      <PageHeaderSkeleton />
      <CardListSkeleton count={3} />
      <span className="sr-only">Memuat...</span>
    </div>
  );
}
