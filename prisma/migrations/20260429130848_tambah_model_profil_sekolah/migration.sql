-- CreateTable
CREATE TABLE "SchoolProfile" (
    "id" TEXT NOT NULL DEFAULT '1',
    "npsn" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolProfile_pkey" PRIMARY KEY ("id")
);
