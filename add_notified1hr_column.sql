-- SQL Script to add the notified1Hr column to the bookings table.
-- Copy and paste this script into your Supabase SQL Editor and execute it to fix the missing column issue.

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "notified1Hr" BOOLEAN DEFAULT FALSE;
