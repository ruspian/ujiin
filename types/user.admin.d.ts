export type PenggunaProps = {
  users: {
    id: string;
    name: string | null;
    username: string;
    role: string;
  }[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export type AddUserModalProps = {
  setIsModalOpen: (isOpen: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
};
