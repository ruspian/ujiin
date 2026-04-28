export interface TeacherData {
  id: string;
  name: string;
}

export interface SubjectData {
  id: string;
  name: string;
  teachers: TeacherData[];
}

export interface MapelClientProps {
  subjects: SubjectData[];
  teachers: TeacherData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface AddSubjectModalProps {
  teachers: TeacherData[];
  setIsModalOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export interface EditSubjectModalProps {
  subjectData: { id: string; name: string; teachers: TeacherData[] };
  teachers: TeacherData[];
  setIsModalEditOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}

export interface DeleteSubjectModalProps {
  subjectData: { id: string; name: string };
  setIsModalDeleteOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}
