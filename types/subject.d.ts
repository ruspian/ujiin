import { ClassData } from "./class";
import { ExamTypeData } from "./examType";

export interface SubjectCardProps {
  subjectId: string;
  subjectName: string;
  questionCount: number;
  examTypes: ExamTypeData[];
  classes: ClassData[];
}
