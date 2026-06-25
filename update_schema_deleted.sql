-- SQL Migration to add 'is_deleted' column to 'clients' table
-- Execute this in your Supabase SQL Editor

ALTER TABLE "clients" 
ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE;
