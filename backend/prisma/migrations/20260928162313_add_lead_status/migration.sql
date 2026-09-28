-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'REPLIED', 'WON', 'LOST');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "statusUpdatedAt" TIMESTAMP(3);
