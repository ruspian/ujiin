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
    columns?: ColumnProps[];
    fileName?: string;
    fontFamily?: string;
    fontSize?: number;
    dateFormat?: string;
    stickyRowsCount?: number;
    stickyColumnsCount?: number;
  }

  const writeXlsxFile: (
    data: ExcelCell[][],
    options?: WriteExcelOptions,
  ) => Promise<void>;

  export default writeXlsxFile;
}
