export type PaginationProps = {
  currentPage: number;
  totalCount?: number;
  totalPages: number;
  handlePageChange: (page: number) => void;
  data?: string;
};
