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
