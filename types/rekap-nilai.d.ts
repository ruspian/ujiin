import { AcademicYearData } from "./academic";

export interface PageProps {
  searchParams: {
    yearId?: string;
    subjectId?: string;
    classId?: string;
  };
}

export type Class = { id: string; name: string };
export type Subject = { id: string; name: string; classes: Class[] };

export interface FilterRekapProps {
  academicYears: AcademicYearData[];
  subjects: Subject[];
}
