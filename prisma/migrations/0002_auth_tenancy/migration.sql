-- CreateEnum
CREATE TYPE "ExpertStatus" AS ENUM ('REGISTERED', 'PROFILE_COMPLETE', 'VETTED', 'MATCHED', 'DEPLOYED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_leadId_fkey";

-- AlterTable
-- Added as nullable, backfilled from the parent assignment, then tightened.
-- Prisma cannot express this, so the three steps are written out by hand.
ALTER TABLE "ActivityLog" ADD COLUMN     "workspaceId" TEXT;

-- Backfill: every existing activity inherits its assignment's workspace.
UPDATE "ActivityLog" AS a
   SET "workspaceId" = s."workspaceId"
  FROM "Assignment" AS s
 WHERE s."id" = a."assignmentId"
   AND a."workspaceId" IS NULL;

-- Any row that still has no workspace would break the NOT NULL constraint.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ActivityLog" WHERE "workspaceId" IS NULL) THEN
    RAISE EXCEPTION 'ActivityLog rows without an assignment cannot be assigned a workspace';
  END IF;
END
$$;

ALTER TABLE "ActivityLog" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeWorkspaceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expert" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "country" TEXT,
    "status" "ExpertStatus" NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vettedAt" TIMESTAMP(3),

    CONSTRAINT "Expert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Expert_email_key" ON "Expert"("email");

-- CreateIndex
CREATE INDEX "Expert_workspaceId_status_idx" ON "Expert"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ActivityLog_workspaceId_createdAt_idx" ON "ActivityLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Assignment_workspaceId_updatedAt_idx" ON "Assignment"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expert" ADD CONSTRAINT "Expert_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
