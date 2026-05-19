export interface TeacherData {
  id: string;
  name: string;
}

export interface SubjectData {
  id: string;
  name: string;
  teachers: TeacherData[];
  classes: { id: string; name: string }[];
}

export interface MapelClientProps {
  subjects: SubjectData[];
  teachers: TeacherData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  classes: { id: string; name: string }[];
  religions: { id: string; name: string }[];
}

export interface AddSubjectModalProps {
  teachers: TeacherData[];
  setIsModalOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
  classes: { id: string; name: string }[];
  religions: { id: string; name: string }[];
}

export interface EditSubjectModalProps {
  subjectData: {
    id: string;
    name: string;
    teachers: TeacherData[];
    classes: { id: string; name: string }[];
  };
  teachers: TeacherData[];
  setIsModalEditOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
  classes: { id: string; name: string }[];
}

export interface DeleteSubjectModalProps {
  subjectData: { id: string; name: string };
  setIsModalDeleteOpen: (val: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
}
