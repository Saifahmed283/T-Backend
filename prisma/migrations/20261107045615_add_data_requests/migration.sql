-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('ACCESS', 'RECTIFICATION', 'ERASURE', 'RESTRICTION', 'PORTABILITY', 'OBJECTION', 'WITHDRAW_CONSENT');

-- CreateEnum
CREATE TYPE "DataRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL,
    "type" "DataRequestType" NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "details" TEXT,
    "status" "DataRequestStatus" NOT NULL DEFAULT 'PENDING',
    "verificationToken" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "response" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataRequest_verificationToken_key" ON "DataRequest"("verificationToken");

-- CreateIndex
CREATE INDEX "DataRequest_workspaceId_status_idx" ON "DataRequest"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "DataRequest_workspaceId_createdAt_idx" ON "DataRequest"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "DataRequest_email_idx" ON "DataRequest"("email");

-- CreateIndex
CREATE INDEX "DataRequest_verificationToken_idx" ON "DataRequest"("verificationToken");

-- AddForeignKey
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
