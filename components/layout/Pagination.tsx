import { PaginationProps } from "@/types/pagination";

const Pagination = ({
  currentPage,
  totalPages,
  handlePageChange,
}: PaginationProps) => {
  const current = Number(currentPage);
  const total = Number(totalPages);

  return (
    <div className="py-4 px-12 border-t border-slate-100 flex items-center justify-end">
      <div className="flex gap-2">
        <button
          className="px-3 py-1 border border-slate-200 rounded bg-white text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-gray-800 hover:bg-gray-50 transition-colors"
          disabled={current <= 1}
          onClick={() => handlePageChange(current - 1)}
        >
          Sebelumnya
        </button>
        <button
          className="px-3 py-1 border border-slate-200 rounded bg-white text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-gray-800 hover:bg-gray-50 transition-colors"
          disabled={current >= total || total === 0}
          onClick={() => handlePageChange(current + 1)}
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );
};

export default Pagination;
