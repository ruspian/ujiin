declare module "write-excel-file" {
  export type CellType =
    | StringConstructor
    | NumberConstructor
    | BooleanConstructor
    | DateConstructor;

  export interface ExcelCell {
    value: string | number | boolean | Date | null | undefined;
    type?: CellType;
    fontWeight?: "bold";
    fontStyle?: "italic";
    color?: string;
    backgroundColor?: string;
    align?: "left" | "center" | "right";
    span?: number;
    rowSpan?: number;
    wrap?: boolean;
  }

  export interface ColumnProps {
    width?: number;
  }

  export interface WriteExcelOptions {
    columns?: ColumnProps[] | ColumnProps[][];
    /** Nama sheet; bila lebih dari satu, `data` berisi satu tabel per sheet. */
    sheets?: string[];
    sheet?: string;
    fileName?: string;
    fontFamily?: string;
    fontSize?: number;
    dateFormat?: string;
    stickyRowsCount?: number;
    stickyColumnsCount?: number;
  }

  const writeXlsxFile: (
    data: ExcelCell[][] | ExcelCell[][][],
    options?: WriteExcelOptions,
  ) => Promise<void>;

  export default writeXlsxFile;
}
