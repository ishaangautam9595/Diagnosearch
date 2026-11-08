-- AlterTable
ALTER TABLE "PrescriptionImage" ADD COLUMN "storageKey" TEXT,
ALTER COLUMN "data" DROP NOT NULL;
