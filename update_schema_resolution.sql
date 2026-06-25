-- SQL Migration to add 'resolution' column to 'dual_entries' table
-- Execute this in your Supabase SQL Editor

ALTER TABLE "dual_entries" 
ADD COLUMN IF NOT EXISTS "resolution" TEXT;

-- Update existing resolved dual entries with their corresponding resolution if empty
UPDATE "dual_entries"
SET "resolution" = 'Marked Duplicate'
WHERE "status" = 'Confirmed Duplicate' AND "resolution" IS NULL;

UPDATE "dual_entries"
SET "resolution" = 'Marked False Positive'
WHERE "status" = 'False Positive' AND "resolution" IS NULL;
