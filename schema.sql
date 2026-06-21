-- DDL table creation scripts for RealtySync Supabase Database
-- This file contains the complete SQL schema derived from the original JSON database structure.

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table (for authentication and profile lookup)
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "role" TEXT NOT NULL CHECK ("role" IN ('ADMIN', 'AGENT')),
  "status" TEXT NOT NULL DEFAULT 'Active' CHECK ("status" IN ('Active', 'Inactive')),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Agents table
CREATE TABLE IF NOT EXISTS "agents" (
  "id" TEXT PRIMARY KEY,
  "firstName" TEXT NOT NULL,
  "middleName" TEXT,
  "lastName" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "mobileNumber" TEXT NOT NULL,
  "prcLicenseNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Active' CHECK ("status" IN ('Active', 'Inactive')),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clients table
CREATE TABLE IF NOT EXISTS "clients" (
  "id" TEXT PRIMARY KEY,
  "firstName" TEXT NOT NULL,
  "middleName" TEXT,
  "lastName" TEXT NOT NULL,
  "mobileNumber" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "facebookProfileLink" TEXT,
  "sourceOfLead" TEXT NOT NULL,
  "notes" TEXT,
  "assignedAgentId" TEXT REFERENCES "agents"("id") ON DELETE SET NULL,
  "assignedAgentName" TEXT NOT NULL,
  "dateRegistered" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "duplicateStatus" TEXT NOT NULL DEFAULT 'None' CHECK ("duplicateStatus" IN ('None', 'Possible', 'Strong'))
);

-- 4. Bookings/Appointments table
CREATE TABLE IF NOT EXISTS "bookings" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT REFERENCES "clients"("id") ON DELETE CASCADE,
  "clientName" TEXT NOT NULL,
  "clientMobile" TEXT,
  "agentId" TEXT REFERENCES "agents"("id") ON DELETE CASCADE,
  "agentName" TEXT NOT NULL,
  "appointmentType" TEXT NOT NULL,
  "appointmentDate" TEXT NOT NULL,
  "appointmentTime" TEXT NOT NULL,
  "dateTime" TEXT NOT NULL,
  "location" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Open',
  "notes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Dual Entries (Conflicts) table
CREATE TABLE IF NOT EXISTS "dual_entries" (
  "id" TEXT PRIMARY KEY,
  "clientName" TEXT NOT NULL,
  "clientIdA" TEXT REFERENCES "clients"("id") ON DELETE CASCADE,
  "clientIdB" TEXT REFERENCES "clients"("id") ON DELETE CASCADE,
  "agentIdA" TEXT REFERENCES "agents"("id") ON DELETE SET NULL,
  "agentNameA" TEXT NOT NULL,
  "agentIdB" TEXT REFERENCES "agents"("id") ON DELETE SET NULL,
  "agentNameB" TEXT NOT NULL,
  "dateA" TEXT NOT NULL,
  "dateB" TEXT NOT NULL,
  "similarityScore" NUMERIC NOT NULL DEFAULT 100,
  "status" TEXT NOT NULL DEFAULT 'Pending Review',
  "details" JSONB NOT NULL
);

-- 6. Notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "read" BOOLEAN NOT NULL DEFAULT FALSE,
  "type" TEXT NOT NULL,
  "agentId" TEXT REFERENCES "agents"("id") ON DELETE SET NULL,
  "clientId" TEXT REFERENCES "clients"("id") ON DELETE SET NULL
);

-- 7. Audit Logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userRole" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "previousValue" TEXT,
  "newValue" TEXT
);

-- 8. Realty Projects list table
CREATE TABLE IF NOT EXISTS "realty_projects" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL
);


-- ==========================================================
-- INSERT STATEMENT TO MANUALLY INSERT AN ADMIN USER
-- ==========================================================
INSERT INTO "users" (
  "id", 
  "email", 
  "password", 
  "firstName", 
  "lastName", 
  "role", 
  "status", 
  "createdAt"
) VALUES (
  'admin_user', 
  'admin@realtysync.com', 
  '$2a$10$7R6t2D0pXqZ/bEGe69lV6uxZfNlO9yR7uL/Pms5tEfeK9N1QxW3.O', -- Hashed 'admin123'
  'Broker', 
  'Admin', 
  'ADMIN', 
  'Active', 
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE 
SET "email" = EXCLUDED."email", "password" = EXCLUDED."password";


-- ==========================================================
-- SEED INITIAL DATA FROM THE ORIGINAL JSON STATE
-- ==========================================================

-- Seed Projects
INSERT INTO "realty_projects" ("name") VALUES 
  ('Avida Towers Riala'),
  ('Solinea Resort Condominium'),
  ('The Alcoves'),
  ('Park Point Residences'),
  ('Amara Subdivision'),
  ('Amaia Steps Mandaue'),
  ('Cebu IT Park Residences'),
  ('Marco Polo Residences')
ON CONFLICT ("name") DO NOTHING;

-- Seed Agents
INSERT INTO "agents" ("id", "firstName", "middleName", "lastName", "email", "mobileNumber", "prcLicenseNumber", "status", "createdAt") VALUES
  ('AG-SRA8234', 'Sarah', 'A.', 'Ramirez', 'sarah.ramirez@realtysync.com', '09178234567', '0023412', 'Active', '2026-01-10 08:30:00+00'),
  ('AG-JBL1234', 'James', 'B.', 'Lim', 'james.lim@realtysync.com', '09181234567', '0041235', 'Active', '2026-02-15 10:15:00+00'),
  ('AG-MSA1923', 'Maria', 'C.', 'Santos', 'maria.santos@realtysync.com', '09192345678', '0019234', 'Active', '2026-03-20 14:45:00+00'),
  ('AG-MRA3456', 'Mark', 'D.', 'Ramos', 'mark.ramos@realtysync.com', '09203456789', '0034561', 'Inactive', '2026-04-12 09:00:00+00')
ON CONFLICT ("id") DO NOTHING;

-- Seed Agents into Users as well for authentication
INSERT INTO "users" ("id", "email", "password", "firstName", "lastName", "role", "status", "createdAt") VALUES
  ('AG-SRA8234', 'sarah.ramirez@realtysync.com', '$2a$10$wIePlK6ZfCscvptVjMv20eVYsh2rNl8Kz4j9tGj9C7A1z43j8tSbe', 'Sarah', 'Ramirez', 'AGENT', 'Active', '2026-01-10 08:30:00+00'),
  ('AG-JBL1234', 'james.lim@realtysync.com', '$2a$10$wIePlK6ZfCscvptVjMv20eVYsh2rNl8Kz4j9tGj9C7A1z43j8tSbe', 'James', 'Lim', 'AGENT', 'Active', '2026-02-15 10:15:00+00'),
  ('AG-MSA1923', 'maria.santos@realtysync.com', '$2a$10$wIePlK6ZfCscvptVjMv20eVYsh2rNl8Kz4j9tGj9C7A1z43j8tSbe', 'Maria', 'Santos', 'AGENT', 'Active', '2026-03-20 14:45:00+00'),
  ('AG-MRA3456', 'mark.ramos@realtysync.com', '$2a$10$wIePlK6ZfCscvptVjMv20eVYsh2rNl8Kz4j9tGj9C7A1z43j8tSbe', 'Mark', 'Ramos', 'AGENT', 'Inactive', '2026-04-12 09:00:00+00')
ON CONFLICT ("id") DO NOTHING;

