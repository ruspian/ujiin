export interface MasterItem {
  id: string;
  name: string;
}

export interface ExamData {
  id: string;
  title: string;
  subject: { id: string; name: string };
  examType: { id: string; code: string; name: string };
  academicYear: { id: string; name: string };
  classes: MasterItem[];
  startTime: Date;
  endTime: Date;
  duration: number;
  randomizeQuestions: boolean;
  showResult: boolean;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED";
  _count: { questions: number; attempts: number };
}

export interface JadwalUjianClientProps {
  exams: ExamData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  subjects: MasterItem[];
  examTypes: (MasterItem & { code: string })[];
  classes: MasterItem[];
  academicYears: MasterItem[];
}

export interface AddJadwalModalProps {
  setIsModalOpen: (val: boolean) => void;
  subjects: MasterItem[];
  examTypes: MasterItem[];
  classes: MasterItem[];
  academicYears: MasterItem[];
}

export interface EditJadwalModalProps {
  itemData: ExamData;
  setIsModalEditOpen: (val: boolean) => void;
  subjects: MasterItem[];
  examTypes: MasterItem[];
  classes: MasterItem[];
  academicYears: MasterItem[];
}

export interface DeleteJadwalModalProps {
  itemData: { id: string; title: string };
  setIsModalDeleteOpen: (val: boolean) => void;
}
