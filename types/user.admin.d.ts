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

export type EditUserModalProps = {
  user: {
    id: string;
    name: string | null;
    username: string;
    role: string;
    password?: string;
  };
  setIsModalEditOpen: (isOpen: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
};

export interface DeleteUserModalProps {
  data: { id: string; name: string | null };
  setIsModalDeleteOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
  name: string;
}
