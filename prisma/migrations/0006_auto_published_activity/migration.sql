-- Scheduled publishing logs its own activity type so the feed distinguishes an
-- editor's manual publish from the scheduler flipping a SCHEDULED item.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'AUTO_PUBLISHED';
