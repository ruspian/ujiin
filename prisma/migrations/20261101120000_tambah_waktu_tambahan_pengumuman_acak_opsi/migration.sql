-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "announcement" TEXT,
ADD COLUMN     "announcedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "extraSeconds" INTEGER NOT NULL DEFAULT 0;
