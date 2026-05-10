import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
} from "docx";
import { saveAs } from "file-saver";
import { Question, QuestionType } from "@prisma/client";
import { OptionMC, OptionMatching } from "@/types/exam";

interface ExportProps {
  questions: Question[];
  subjectName: string;
  className: string;
  examName: string;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "SOAL PILIHAN GANDA",
  MULTIPLE_CHOICE_COMPLEX: "SOAL PILIHAN GANDA KOMPLEKS",
  MATCHING: "SOAL MENJODOHKAN",
  SHORT_ANSWER: "SOAL ISIAN SINGKAT",
  ESSAY: "SOAL URAIAN / ESAI",
};

const TYPE_ORDER: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "MULTIPLE_CHOICE_COMPLEX",
  "MATCHING",
  "SHORT_ANSWER",
  "ESSAY",
];

export const exportQuestionsToWord = async ({
  questions,
  subjectName,
  className,
  examName,
}: ExportProps) => {
  const children: Array<Paragraph | Table> = [];

  // kop
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "NASKAH SOAL UJIAN", bold: true, size: 28 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `${examName.toUpperCase()} - ${subjectName.toUpperCase()}`,
          bold: true,
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Kelas: ${className}`, bold: true }),
        new TextRun({ text: "\t\t\t\t\t\t\t\t" }),
        new TextRun({ text: `Tanggal: ....................`, bold: true }),
      ],
      spacing: { after: 400 },
    }),
  );

  let globalIndex = 1;

  //   urutan jenis soal
  TYPE_ORDER.forEach((type) => {
    const groupQuestions = questions.filter((q) => q.type === type);

    // Judul
    if (groupQuestions.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: TYPE_LABELS[type],
              bold: true,
              underline: {},
              size: 24,
              color: "2563eb",
            }),
          ],
        }),
      );

      // kelompokkan soal sesuai TIPE
      groupQuestions.forEach((q) => {
        const cleanText = q.text.replace(/<[^>]*>?/gm, "");

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${globalIndex}. `, bold: true }),
              new TextRun({ text: cleanText }),
            ],
            spacing: { before: 200, after: 100 },
          }),
        );

        if (
          q.type === "MULTIPLE_CHOICE" ||
          q.type === "MULTIPLE_CHOICE_COMPLEX"
        ) {
          const options = q.options as unknown as OptionMC[];
          options.forEach((opt) => {
            children.push(
              new Paragraph({
                indent: { left: 720 },
                children: [new TextRun({ text: `${opt.id}. ${opt.text}` })],
              }),
            );
          });
        } else if (q.type === "MATCHING") {
          const matchOpts = q.options as unknown as OptionMatching;
          const tableRows = matchOpts.left.map((l, i) => {
            return new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: l, size: 20 })],
                    }),
                  ],
                  width: { size: 45, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "....." })],
                    }),
                  ],
                  width: { size: 10, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: matchOpts.right[i] || "",
                          size: 20,
                        }),
                      ],
                    }),
                  ],
                  width: { size: 45, type: WidthType.PERCENTAGE },
                }),
              ],
            });
          });

          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows,
            }),
          );
        } else {
          // Garis jawaban untuk Esai
          const lines = q.type === "ESSAY" ? 3 : 1;
          for (let i = 0; i < lines; i++) {
            children.push(
              new Paragraph({
                indent: { left: 720 },
                children: [
                  new TextRun({
                    text: "....................................................................................................................................",
                    color: "a1a1aa",
                  }),
                ],
              }),
            );
          }
        }

        globalIndex++;
      });
    }
  });

  // GENERATE
  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Soal_${subjectName}_${className}.docx`);
};
