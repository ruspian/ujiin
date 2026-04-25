import { PaginationProps } from "@/types/pagination";

const Pagination = ({
  currentPage,
  totalPages,
  handlePageChange,
}: PaginationProps) => {
  return (
    <div className="py-4 px-12 border-t border-slate-100 flex items-center justify-end">
      <div className="flex gap-2">
        <button
          className="px-3 py-1 border border-slate-200 rounded bg-white text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-gray-800"
          disabled={
            currentPage === 1 || Number(currentPage) === Number(totalPages)
          }
          onClick={() => handlePageChange(currentPage - 1)}
        >
          Sebelumnya
        </button>
        <button
          disabled={
            Number(currentPage) === Number(totalPages) || currentPage === 1
          }
          onClick={() => handlePageChange(currentPage + 1)}
          className="px-3 py-1 border border-slate-200 rounded bg-white text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-gray-800"
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );
};

export default Pagination;
