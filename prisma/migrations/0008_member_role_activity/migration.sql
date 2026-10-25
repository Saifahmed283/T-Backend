-- Admins promote and demote workspace members. Role changes are authorization
-- events, so they are recorded in the immutable activity feed alongside content
-- edits instead of disappearing with the overwritten membership row.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'MEMBER_ROLE_CHANGED';
