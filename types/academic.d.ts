export interface AcademicYearData {
  id: string;
  year: string;
  semester: "GANJIL" | "GENAP";
  active: boolean;
}

export interface TahunAjaranClientProps {
  academicYears: AcademicYearData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface AddAcademicModalProps {
  setIsModalOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export interface ActivateAcademicModalProps {
  itemData: { id: string; year: string; semester: string };
  setIsModalActivateOpen: (val: boolean) => void;
}

export interface EditAcademicModalProps {
  itemData: { id: string; year: string; semester: "GANJIL" | "GENAP" };
  setIsModalEditOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export interface DeleteAcademicModalProps {
  itemData: { id: string; year: string; semester: string; active: boolean };
  setIsModalDeleteOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}
