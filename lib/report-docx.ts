import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import type { DocBlock, DocColor, DocOptions } from "@/lib/report-doc";

const COLORS: Record<DocColor, string> = {
  green: "047857",
  red: "B91C1C",
  blue: "1D4ED8",
  gray: "6B7280",
};

/** Teks banyak baris -> TextRun dengan penanda baris baru. */
function runs(
  text: string,
  opts: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {},
): TextRun[] {
  return text.split("\n").map(
    (line, i) =>
      new TextRun({
        text: line,
        break: i > 0 ? 1 : undefined,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color,
        size: opts.size,
      }),
  );
}

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "888888" };
const CELL_BORDERS = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
};
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

// Lebar area cetak A4 (twip) setelah margin, agar kolom tidak dibagi rata oleh Word
const CONTENT_WIDTH = { portrait: 10206, landscape: 15138 };

export function buildDocx(
  blocks: DocBlock[],
  options: DocOptions = {},
): Document {
  const children: Array<Paragraph | Table> = [];
  const total = options.landscape ? CONTENT_WIDTH.landscape : CONTENT_WIDTH.portrait;
  const dxa = (pct: number) => Math.round((total * pct) / 100);

  for (const b of blocks) {
    switch (b.kind) {
      case "title":
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: runs(b.text, { bold: true, size: 32 }),
          }),
        );
        break;
      case "subtitle":
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: runs(b.text, { bold: true, size: 24 }),
          }),
        );
        break;
      case "heading":
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 280, after: 80 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 2 },
            },
            children: runs(b.text, { bold: true, size: 23 }),
          }),
        );
        break;
      case "paragraph":
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            indent: b.indent ? { left: 360 } : undefined,
            children: runs(b.text, {
              bold: b.bold,
              italics: b.italic,
              color: b.color ? COLORS[b.color] : undefined,
            }),
          }),
        );
        break;
      case "kv":
        children.push(
          new Table({
            width: { size: total, type: WidthType.DXA },
            columnWidths: [dxa(22), dxa(3), dxa(75)],
            borders: {
              ...NO_BORDERS,
              insideHorizontal: NO_BORDER,
              insideVertical: NO_BORDER,
            },
            rows: b.rows.map(
              ([k, v]) =>
                new TableRow({
                  children: [
                    new TableCell({
                      borders: NO_BORDERS,
                      width: { size: dxa(22), type: WidthType.DXA },
                      children: [new Paragraph({ children: runs(k, { bold: true }) })],
                    }),
                    new TableCell({
                      borders: NO_BORDERS,
                      width: { size: dxa(3), type: WidthType.DXA },
                      children: [new Paragraph({ children: runs(":") })],
                    }),
                    new TableCell({
                      borders: NO_BORDERS,
                      width: { size: dxa(75), type: WidthType.DXA },
                      children: [new Paragraph({ children: runs(v) })],
                    }),
                  ],
                }),
            ),
          }),
          new Paragraph({ text: "" }),
        );
        break;
      case "table": {
        const cols = b.header.length;
        const widths =
          b.widths && b.widths.length === cols
            ? b.widths
            : Array.from({ length: cols }, () => 100 / cols);
        const cell = (text: string, i: number, head = false) =>
          new TableCell({
            borders: CELL_BORDERS,
            width: { size: dxa(widths[i]), type: WidthType.DXA },
            shading: head ? { fill: "F1F5F9" } : undefined,
            children: [
              new Paragraph({
                alignment:
                  head || b.center?.[i] ? AlignmentType.CENTER : AlignmentType.LEFT,
                children: runs(text, { bold: head, size: 20 }),
              }),
            ],
          });
        children.push(
          new Table({
            width: { size: total, type: WidthType.DXA },
            columnWidths: widths.map(dxa),
            rows: [
              new TableRow({
                tableHeader: true,
                children: b.header.map((h, i) => cell(h, i, true)),
              }),
              ...b.rows.map(
                (row) =>
                  new TableRow({
                    cantSplit: true,
                    children: Array.from({ length: cols }, (_, i) =>
                      cell(row[i] ?? "", i),
                    ),
                  }),
              ),
            ],
          }),
          new Paragraph({ text: "" }),
        );
        break;
      }
      case "signature":
        children.push(
          new Paragraph({ text: "" }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: runs(b.place) }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: runs(b.role) }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: b.name, bold: true, underline: {} }),
            ],
          }),
        );
        break;
      case "pagebreak":
        children.push(new Paragraph({ pageBreakBefore: true, text: "" }));
        break;
      case "spacer":
        children.push(new Paragraph({ text: "" }));
        break;
    }
  }

  return new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: options.landscape
                ? PageOrientation.LANDSCAPE
                : PageOrientation.PORTRAIT,
            },
            margin: { top: 850, bottom: 850, left: 850, right: 850 },
          },
        },
        children,
      },
    ],
  });
}

export async function downloadDocx(
  blocks: DocBlock[],
  fileName: string,
  options: DocOptions = {},
) {
  const blob = await Packer.toBlob(buildDocx(blocks, options));
  saveAs(blob, fileName.endsWith(".docx") ? fileName : `${fileName}.docx`);
}
