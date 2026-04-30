import { ReligionData } from "./religion";

export interface StudentData {
  id: string;
  nisn: string;
  name: string;
  password?: string | null;
  className: string;
  classId: string;
  religionId?: string | null;
  religionName?: string | null;
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
  religions: ReligionData[];
}

export interface AddStudentModalProps {
  classes: ClassData[];
  setIsModalOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
  religions: ReligionData[];
}

export interface EditStudentModalProps {
  studentData: {
    id: string;
    nisn: string;
    name: string;
    classId: string;
    religionId?: string | null;
  };
  classes: ClassData[];
  setIsModalEditOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
  religions: ReligionData[];
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

interface ManageSessionModalProps {
  classes: ClassData[];
  setIsModalSessionOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export interface PrintStudentData {
  name: string;
  nisn: string;
  className: string;
  password: string;
  session: string;
  room: string;
}
