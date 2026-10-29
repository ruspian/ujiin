-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "essayScores" JSONB,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);
