-- CreateEnum
CREATE TYPE "LabEventType" AS ENUM ('REQUEST_RECEIVED', 'OFFER_SENT', 'OFFER_WON', 'OFFER_LOST');

-- AlterTable
ALTER TABLE "TestRequest" ADD COLUMN     "firstOfferAt" TIMESTAMP(3),
ADD COLUMN     "highestOfferAtAccept" DECIMAL(10,2),
ADD COLUMN     "offersAtAccept" INTEGER;

-- CreateTable
CREATE TABLE "LabEvent" (
    "id" UUID NOT NULL,
    "laboratoryId" UUID NOT NULL,
    "type" "LabEventType" NOT NULL,
    "amount" DECIMAL(10,2),
    "competitorAmount" DECIMAL(10,2),
    "distanceKm" DOUBLE PRECISION,
    "responseMinutes" INTEGER,
    "approxLat" DOUBLE PRECISION,
    "approxLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabEvent_laboratoryId_createdAt_idx" ON "LabEvent"("laboratoryId", "createdAt");

-- AddForeignKey
ALTER TABLE "LabEvent" ADD CONSTRAINT "LabEvent_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
