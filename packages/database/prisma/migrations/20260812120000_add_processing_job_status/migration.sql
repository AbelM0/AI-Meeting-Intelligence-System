-- CreateEnum
CREATE TYPE "ProcessingJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "ProcessingJob"
ADD COLUMN "status" "ProcessingJobStatus" NOT NULL DEFAULT 'PENDING';
