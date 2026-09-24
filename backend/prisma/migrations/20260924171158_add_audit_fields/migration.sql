-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "auditedAt" TIMESTAMP(3),
ADD COLUMN     "hasBrokenPages" BOOLEAN,
ADD COLUMN     "isOldWebsite" BOOLEAN,
ADD COLUMN     "isSlowLoad" BOOLEAN,
ADD COLUMN     "mobileFriendly" BOOLEAN,
ADD COLUMN     "websiteAgeYears" DOUBLE PRECISION;
