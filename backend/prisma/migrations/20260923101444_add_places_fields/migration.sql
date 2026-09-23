-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "placeId" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "emails" TEXT[],
    "urls" TEXT[],
    "titles" TEXT[],
    "city" TEXT,
    "category" TEXT,
    "reviewCount" INTEGER,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_placeId_key" ON "Lead"("placeId");
