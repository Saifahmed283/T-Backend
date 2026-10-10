-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'BLOCKED');
CREATE TYPE "WorkflowStage" AS ENUM ('G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7');
CREATE TYPE "ActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'STAGE_ADVANCED', 'NOTE_ADDED', 'ASSIGNED');

CREATE TABLE "User" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Workspace" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id"));
CREATE TABLE "WorkspaceMember" ("workspaceId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'member', CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId","userId"));
CREATE TABLE "Assignment" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "client" TEXT NOT NULL, "sector" TEXT NOT NULL, "value" INTEGER NOT NULL, "status" "AssignmentStatus" NOT NULL, "stage" "WorkflowStage" NOT NULL, "workspaceId" TEXT NOT NULL, "leadId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ActivityLog" ("id" TEXT NOT NULL, "type" "ActivityType" NOT NULL, "message" TEXT NOT NULL, "assignmentId" TEXT, "userId" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "Assignment_workspaceId_status_idx" ON "Assignment"("workspaceId","status");
CREATE INDEX "Assignment_workspaceId_stage_idx" ON "Assignment"("workspaceId","stage");
CREATE INDEX "ActivityLog_assignmentId_createdAt_idx" ON "ActivityLog"("assignmentId","createdAt");
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
