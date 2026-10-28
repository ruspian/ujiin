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
  /** Sesi masih berjalan: tidak perlu token lagi. */
  resume?: boolean;
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
  /** Nomor urut simpan terakhir yang sudah ada di server. */
  initialSeq?: number;
  serverTime: Date | string;
}
