export type AnswerValue = string | string[] | Record<string, string>;
export type AnswersMap = Record<string, AnswerValue>;

export interface VerifikasiTokenResult {
  success: boolean;
  message: string;
  attemptId?: string;
}

export interface ClientFormTokenProps {
  examId: string;
  studentId: string;
  subjectName: string;
  examTypeName: string;
}
