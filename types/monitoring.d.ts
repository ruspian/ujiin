export interface ViolationLog {
  time: string;
  action: string;
}

export interface StudentMonitoring {
  id: string;
  nisn: string;
  name: string;
  className: string;
  hasStarted: boolean;
  status: string;
  score: number | null;
  startTime: Date | null;
  violationCount: number;
  violationLogs: ViolationLog[];
}

export interface MonitoringClientProps {
  examId: string;
  examTitle: string;
  subjectName: string;
  studentsData: StudentMonitoring[];
}

export interface SupervisedExam {
  id: string;
  title: string;
  startTime: Date | string;
  endTime: Date | string;
  token: string | null;
  subject: {
    name: string;
  };
  examType: {
    name: string;
  };
  classes: {
    id: string;
    name: string;
  }[];
  _count: {
    attempts: number;
  };
  academicYear: {
    year: string;
    semester: string;
  };
  supervisor: {
    name: string;
  } | null;
}

export interface MonitoringListProps {
  exams: SupervisedExam[];
}
