export interface StudentData {
  id: string;
  nisn: string;
  name: string;
  className: string;
  classId: string;
}

interface ClassData {
  id: string;
  name: string;
  level: number;
}

export interface SiswaClientProps {
  students: StudentData[];
  classes: ClassData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface AddStudentModalProps {
  classes: ClassData[];
  setIsModalOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export interface EditStudentModalProps {
  studentData: { id: string; nisn: string; name: string; classId: string };
  classes: ClassData[];
  setIsModalEditOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export interface DeleteStudentModalProps {
  studentData: { id: string; name: string };
  setIsModalDeleteOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export interface ImportStudentModalProps {
  setIsModalImportOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export interface RawExcelRow {
  nisn?: string | number;
  name?: string;
  className?: string;
  [key: string]: unknown;
}
