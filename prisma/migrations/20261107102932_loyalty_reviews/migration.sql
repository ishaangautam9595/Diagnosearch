-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "TestRequest" ADD COLUMN     "coinsAwarded" INTEGER,
ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loyaltyCoins" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "requestId" UUID,
    "coins" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabReview" (
    "id" UUID NOT NULL,
    "laboratoryId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyTransaction_requestId_key" ON "LoyaltyTransaction"("requestId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_userId_createdAt_idx" ON "LoyaltyTransaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LabReview_requestId_key" ON "LabReview"("requestId");

-- CreateIndex
CREATE INDEX "LabReview_laboratoryId_createdAt_idx" ON "LabReview"("laboratoryId", "createdAt");

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TestRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReview" ADD CONSTRAINT "LabReview_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReview" ADD CONSTRAINT "LabReview_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReview" ADD CONSTRAINT "LabReview_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TestRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
