export interface ClassData {
  id: string;
  name: string;
  level: number;
  studentCount: number;
}

export interface KelasClientProps {
  classes: ClassData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface EditClassModalProps {
  classData: { id: string; name: string; level: number };
  setIsModalEditOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export interface AddClassModalProps {
  setIsModalOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export interface DeleteKelasModalProps {
  data: { id: string; name: string | null };
  setIsModalDeleteOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
  name: string;
}
