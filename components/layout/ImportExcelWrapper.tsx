"use client";

import { Props } from "@/types/question";
import dynamic from "next/dynamic";

const ImportExcelButton = dynamic(
  () => import("@/components/layout/ImportExcelButton"),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-32 bg-gray-100 animate-pulse rounded-xl" />
    ),
  },
);

export default function ImportExcelWrapper({
  subjectId,
  classId,
  typeId,
}: Props) {
  return (
    <ImportExcelButton
      subjectId={subjectId}
      classId={classId}
      typeId={typeId}
    />
  );
}
