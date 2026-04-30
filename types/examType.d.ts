export interface ExamTypeData {
  id: string;
  name: string;
  code: string;
}

export interface JenisUjianClientProps {
  examTypes: ExamTypeData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface AddJenisUjianModalProps {
  setIsModalOpen: (val: boolean) => void;
}

export interface EditJenisUjianModalProps {
  itemData: { id: string; name: string; code: string };
  setIsModalEditOpen: (val: boolean) => void;
}

export interface DeleteJenisUjianModalProps {
  itemData: { id: string; name: string; code: string };
  setIsModalDeleteOpen: (val: boolean) => void;
}
