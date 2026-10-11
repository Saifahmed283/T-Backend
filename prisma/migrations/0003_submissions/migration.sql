-- CreateEnum
CREATE TYPE "SubmissionKind" AS ENUM ('CONTACT', 'EXPERT_REGISTRATION', 'SEAT_RESERVATION', 'TENDER_INTEREST', 'TEAM_PROPOSAL', 'JOB_APPLICATION', 'PUBLICATION_REQUEST', 'NEWSLETTER', 'CONTRIBUTION');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "kind" "SubmissionKind" NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NEW',
    "email" TEXT,
    "name" TEXT,
    "message" TEXT,
    "source" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Submission_kind_createdAt_idx" ON "Submission"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_email_idx" ON "Submission"("email");

-- CreateIndex
CREATE INDEX "Submission_status_createdAt_idx" ON "Submission"("status", "createdAt");
