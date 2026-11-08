-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF', 'PATIENT', 'LAB_OWNER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LabSource" AS ENUM ('ADMIN', 'SELF_SIGNUP');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "FastingRequirement" AS ENUM ('UNKNOWN', 'REQUIRED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('ANY', 'HOME_COLLECTION', 'WALK_IN');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'ACCEPTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('SENT', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "ChatSender" AS ENUM ('PATIENT', 'LAB');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addressLine" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "laboratoryId" UUID,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Laboratory" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "contactPerson" TEXT,
    "openingHours" TEXT,
    "accreditation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "homeCollectionAvailable" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "source" "LabSource" NOT NULL DEFAULT 'ADMIN',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Laboratory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaboratoryAddress" (
    "id" UUID NOT NULL,
    "laboratoryId" UUID NOT NULL,
    "label" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaboratoryAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCategory" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticTest" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "description" TEXT,
    "sampleType" TEXT,
    "preparationInstructions" TEXT,
    "preparationVerifiedAt" TIMESTAMP(3),
    "fastingRequirement" "FastingRequirement" NOT NULL DEFAULT 'UNKNOWN',
    "fastingHours" INTEGER,
    "turnaroundHours" INTEGER,
    "turnaroundNote" TEXT,
    "isPackage" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRequest" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "patientId" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "service" "ServiceType" NOT NULL DEFAULT 'ANY',
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusKm" INTEGER NOT NULL DEFAULT 20,
    "acceptedOfferId" UUID,
    "acceptedLabId" UUID,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestTest" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "testId" UUID,
    "name" TEXT NOT NULL,

    CONSTRAINT "RequestTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionImage" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "requestId" UUID,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestRecipient" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "laboratoryId" UUID NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "firstSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "laboratoryId" UUID NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "homeCollectionAvailable" BOOLEAN NOT NULL DEFAULT false,
    "reportTimeHours" INTEGER,
    "note" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "laboratoryId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "sender" "ChatSender" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_laboratoryId_idx" ON "User"("laboratoryId");

-- CreateIndex
CREATE INDEX "OtpCode_identifier_createdAt_idx" ON "OtpCode"("identifier", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Laboratory_slug_key" ON "Laboratory"("slug");

-- CreateIndex
CREATE INDEX "Laboratory_isActive_approvalStatus_idx" ON "Laboratory"("isActive", "approvalStatus");

-- CreateIndex
CREATE INDEX "LaboratoryAddress_laboratoryId_idx" ON "LaboratoryAddress"("laboratoryId");

-- CreateIndex
CREATE INDEX "LaboratoryAddress_latitude_longitude_idx" ON "LaboratoryAddress"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "TestCategory_slug_key" ON "TestCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticTest_slug_key" ON "DiagnosticTest"("slug");

-- CreateIndex
CREATE INDEX "DiagnosticTest_categoryId_isActive_idx" ON "DiagnosticTest"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "DiagnosticTest_name_idx" ON "DiagnosticTest"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TestRequest_reference_key" ON "TestRequest"("reference");

-- CreateIndex
CREATE INDEX "TestRequest_patientId_createdAt_idx" ON "TestRequest"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "TestRequest_status_createdAt_idx" ON "TestRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RequestTest_requestId_idx" ON "RequestTest"("requestId");

-- CreateIndex
CREATE INDEX "PrescriptionImage_requestId_idx" ON "PrescriptionImage"("requestId");

-- CreateIndex
CREATE INDEX "PrescriptionImage_ownerId_createdAt_idx" ON "PrescriptionImage"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestRecipient_laboratoryId_createdAt_idx" ON "RequestRecipient"("laboratoryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequestRecipient_requestId_laboratoryId_key" ON "RequestRecipient"("requestId", "laboratoryId");

-- CreateIndex
CREATE INDEX "Offer_laboratoryId_status_idx" ON "Offer"("laboratoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_requestId_laboratoryId_key" ON "Offer"("requestId", "laboratoryId");

-- CreateIndex
CREATE INDEX "ChatMessage_requestId_laboratoryId_createdAt_idx" ON "ChatMessage"("requestId", "laboratoryId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimitHit_key_createdAt_idx" ON "RateLimitHit"("key", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaboratoryAddress" ADD CONSTRAINT "LaboratoryAddress_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticTest" ADD CONSTRAINT "DiagnosticTest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TestCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRequest" ADD CONSTRAINT "TestRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestTest" ADD CONSTRAINT "RequestTest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TestRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestTest" ADD CONSTRAINT "RequestTest_testId_fkey" FOREIGN KEY ("testId") REFERENCES "DiagnosticTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionImage" ADD CONSTRAINT "PrescriptionImage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TestRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestRecipient" ADD CONSTRAINT "RequestRecipient_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TestRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestRecipient" ADD CONSTRAINT "RequestRecipient_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TestRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TestRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
