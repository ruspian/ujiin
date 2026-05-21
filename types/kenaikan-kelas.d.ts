export interface ClassItem {
  id: string;
  name: string;
  level: number;
}

export interface StudentItem {
  id: string;
  name: string;
  nisn: string;
  classId: string | null;
}

export interface KenaikanKelasClientProps {
  classes: ClassItem[];
  allStudents: StudentItem[];
}
