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

export interface ExportExcelProps {
  students: { id: string; name: string; nisn: string }[];
  exams: { id: string; title: string; examType: { name: string } }[];
  attemptsMap: Record<string, number | null>;
  subjectName: string;
  className: string;
  academicYear: string;
}

export type ExcelCellType =
  | NumberConstructor
  | StringConstructor
  | BooleanConstructor
  | DateConstructor;

export interface ExcelCell {
  value: string | number | boolean | Date | null | undefined;
  type?: ExcelCellType;
  fontWeight?: "bold";
  span?: number;
}

export interface ExcelColumn {
  width?: number;
}

export interface ExcelOptions {
  columns?: ExcelColumn[];
  fileName?: string;
  fontFamily?: string;
  fontSize?: number;
}

export interface CustomWindow extends Window {
  writeXlsxFile?: (
    data: ExcelCell[][],
    options?: ExcelOptions,
  ) => Promise<void>;
}
