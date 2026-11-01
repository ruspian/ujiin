import {
  PageHeaderSkeleton,
  TabsSkeleton,
  TableSkeleton,
} from "@/components/ui/Skeleton";

export default function MasterLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat data master">
      <PageHeaderSkeleton />
      <TabsSkeleton />
      <TableSkeleton rows={7} columns={4} />
      <span className="sr-only">Memuat...</span>
    </div>
  );
}
