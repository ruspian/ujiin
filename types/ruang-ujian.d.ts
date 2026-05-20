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

export interface OptionMC {
  id: string;
  text: string;
}

export interface OptionMatching {
  left: string[];
  right: string[];
}

export interface ClientQuestion {
  id: string;
  type: QuestionType;
  text: string;
  score: number;
  options: unknown;
}

export interface RuangUjianProps {
  attemptId: string;
  examName: string;
  subjectName: string;
  questions: ClientQuestion[];
  endTime: Date;
  initialAnswers: AnswersMap;
  serverTime: Date | string;
}
