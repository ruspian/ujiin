interface ExcelRow {
  Tipe_Soal?: string | number;
  Teks_Soal?: string | number;
  Opsi_A?: string | number;
  Opsi_B?: string | number;
  Opsi_C?: string | number;
  Opsi_D?: string | number;
  Opsi_E?: string | number;
  Kunci_Jawaban?: string | number;
  Skor?: string | number;
  [key: string]: string | number | undefined;
}

export type RowCell = string | number | null;
export type MultipleChoiceOption = { id: string; text: string };
export type MatchingOption = { left: string[]; right: string[] };

export type OptionItem = { id: string; text: string };

export interface FormSoalProps {
  subjectId: string;
  classId: string | null;
  typeId: string;
}

export type OptionData =
  | { id: string; text: string }[]
  | { left: string[]; right: string[] }
  | never[];

type QuestionType =
  | "MULTIPLE_CHOICE"
  | "MULTIPLE_CHOICE_COMPLEX"
  | "MATCHING"
  | "ESSAY"
  | "SHORT_ANSWER";

export interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export interface Props {
  subjectId: string;
  classId: string;
  typeId: string;
}

export type ReadXlsxOptions = {
  getSheets?: boolean;
  sheet?: string;
};

export type SheetInfoShape = {
  name?: string;
  sheet?: string;
  data?: RowCell[][];
};

export interface ExtendedFormSoalProps extends FormSoalProps {
  questionId?: string;
  initialData?: {
    type: QuestionType;
    text: string;
    score: number;
    options: Prisma.JsonValue;
    correctAnswer: string;
  };
}

export interface QuestionListTableProps {
  questions: Question[];
  subjectId: string;
  classId: string;
  typeId: string;
  totalOnPage: number;
}
