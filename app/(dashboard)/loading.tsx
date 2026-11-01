import {
  PageHeaderSkeleton,
  StatCardsSkeleton,
  TableSkeleton,
} from "@/components/ui/Skeleton";

// Tampil otomatis selama halaman dashboard mengambil data
export default function DashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat halaman">
      <PageHeaderSkeleton />
      <StatCardsSkeleton />
      <TableSkeleton rows={5} columns={4} />
      <span className="sr-only">Memuat...</span>
    </div>
  );
}
