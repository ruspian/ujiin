import { Question } from "@prisma/client";

export type StudentAnswerValue = string | string[] | Record<string, string>;

export interface AnswerDetail {
  value: StudentAnswerValue;
  score: number;
  isGraded: boolean;
}

export type AttemptAnswersJSON = Record<string, AnswerDetail>;

export interface UpdateCorrectionParams {
  attemptId: string;
  examId: string;
  updatedAnswers: AttemptAnswersJSON;
}

export interface CorrectionFormProps {
  attemptId: string;
  examId: string;
  studentName: string;
  questions: Question[];
  initialAnswers: AttemptAnswersJSON;
}

export interface Params {
  params: {
    examId: string;
    attemptId: string;
  };
}
