import { AcademicYearData } from "./academic";
import { ClassData } from "./class";
import { Question as PrismaQuestion } from "@prisma/client";

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
  token?: string | null;
  supervisor: { id: string; name: string } | null;
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

export interface Question {
  id: string;
  text: string;
  author: { name: string };
  class: { name: string };
}

export interface ExamInitialData {
  id: string;
  title: string;
  subjectId: string;
  examTypeId: string;
  academicYearId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  randomizeQuestions: boolean;
  showResult: boolean;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED";
  classes: { id: string }[];
  questions: { id: string }[];
  supervisorId?: string | null;
}

export interface JadwalFormProps {
  subjects: MasterItem[];
  classes: ClassData[];
  examTypes: MasterItem[];
  academicYears: AcademicYearData[];
  initialData?: ExamInitialData;
}
export interface OptionMC {
  id: string;
  text: string;
}

export interface OptionMatching {
  left: string[];
  right: string[];
}

export interface ExamSimulationModalProps {
  questions: PrismaQuestion[];
  subjectName: string;
  examName: string;
}
