-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "coldEmail",
DROP COLUMN "linkedinMessage",
DROP COLUMN "notes",
DROP COLUMN "outreachGeneratedAt",
DROP COLUMN "proposal",
DROP COLUMN "proposalGeneratedAt",
DROP COLUMN "status",
DROP COLUMN "statusUpdatedAt",
DROP COLUMN "whatsappMessage";

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" INTEGER NOT NULL,
    "coldEmail" TEXT,
    "linkedinMessage" TEXT,
    "whatsappMessage" TEXT,
    "outreachGeneratedAt" TIMESTAMP(3),
    "proposal" TEXT,
    "proposalGeneratedAt" TIMESTAMP(3),
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "statusUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadActivity_userId_leadId_key" ON "LeadActivity"("userId", "leadId");

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

