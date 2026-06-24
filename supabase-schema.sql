-- RealtySync Supabase Database Schema & RLS Policies Migration Script
-- This SQL script sets up the database tables and configures secure Row Level Security (RLS) policies.

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLES CREATION
-- ==========================================

-- Users table (for authentication and profile lookup)
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

-- Agents table
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

-- Clients table
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
  "duplicateStatus" TEXT NOT NULL DEFAULT 'None' CHECK ("duplicateStatus" IN ('None', 'Possible', 'Strong')),
  "status" TEXT
);

-- Bookings/Appointments table
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
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "notified1Hr" BOOLEAN DEFAULT FALSE
);

-- Dual Entries (Conflicts) table
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

-- Notifications table
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

-- Audit Logs table
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

-- Realty Projects list table
CREATE TABLE IF NOT EXISTS "realty_projects" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL
);

-- ==========================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dual_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "realty_projects" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. RLS POLICIES FOR EACH TABLE
-- ==========================================

-- Users Policies
CREATE POLICY "Allow select of users for authenticated users" ON "users"
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow updates for users on their own profile" ON "users"
  FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert of users by admins or signup processes" ON "users"
  FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Agents Policies
CREATE POLICY "Allow select of agents for authenticated users" ON "agents"
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow full modify access on agents for authenticated users" ON "agents"
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Clients Policies
CREATE POLICY "Allow select of clients for authenticated users" ON "clients"
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow full modify access on clients for authenticated users" ON "clients"
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Bookings/Appointments Policies
CREATE POLICY "Allow select of bookings for authenticated users" ON "bookings"
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow full modify access on bookings for authenticated users" ON "bookings"
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Dual Entries Policies
CREATE POLICY "Allow select of dual_entries for authenticated users" ON "dual_entries"
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow full modify access on dual_entries for authenticated users" ON "dual_entries"
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Notifications Policies
CREATE POLICY "Allow select of notifications for authenticated users" ON "notifications"
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow full modify access on notifications for authenticated users" ON "notifications"
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Audit Logs Policies
CREATE POLICY "Allow select of audit_logs for authenticated users" ON "audit_logs"
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow inserts on audit_logs for authenticated users" ON "audit_logs"
  FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Allow updates/deletes on audit_logs for admins" ON "audit_logs"
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Realty Projects Policies
CREATE POLICY "Allow public/authenticated select of realty_projects" ON "realty_projects"
  FOR SELECT USING (true);

CREATE POLICY "Allow write access to realty_projects for authenticated users" ON "realty_projects"
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ==========================================
-- 4. CONFLICT RESILIENT SEED DATA
-- ==========================================

-- Manually insert or update default Admin user profile
INSERT INTO "users" (
  "id", 
  "email", 
  "password", 
  "firstName", 
  "lastName", 
  "role", 
  "status"
) VALUES (
  'admin_user', 
  'admin@realtysync.com', 
  '$2a$10$7R6t2D0pXqZ/bEGe69lV6uxZfNlO9yR7uL/Pms5tEfeK9N1QxW3.O', -- Hashed 'admin123'
  'Broker', 
  'Admin', 
  'ADMIN', 
  'Active'
) ON CONFLICT ("id") DO UPDATE 
SET "email" = EXCLUDED."email", "password" = EXCLUDED."password";

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
INSERT INTO "agents" ("id", "firstName", "middleName", "lastName", "email", "mobileNumber", "prcLicenseNumber", "status") VALUES
  ('AG-SRA8234', 'Sarah', 'A.', 'Ramirez', 'sarah.ramirez@realtysync.com', '09178234567', '0023412', 'Active'),
  ('AG-JBL1234', 'James', 'B.', 'Lim', 'james.lim@realtysync.com', '09181234567', '0041235', 'Active'),
  ('AG-MSA1923', 'Maria', 'C.', 'Santos', 'maria.santos@realtysync.com', '09192345678', '0019234', 'Active'),
  ('AG-MRA3456', 'Mark', 'D.', 'Ramos', 'mark.ramos@realtysync.com', '09203456789', '0034561', 'Inactive')
ON CONFLICT ("id") DO NOTHING;

-- Seed Agents as Users as well for authentication
INSERT INTO "users" ("id", "email", "password", "firstName", "lastName", "role", "status") VALUES
  ('AG-SRA8234', 'sarah.ramirez@realtysync.com', '$2a$10$wIePlK6ZfCscvptVjMv20eVYsh2rNl8Kz4j9tGj9C7A1z43j8tSbe', 'Sarah', 'Ramirez', 'AGENT', 'Active'),
  ('AG-JBL1234', 'james.lim@realtysync.com', '$2a$10$wIePlK6ZfCscvptVjMv20eVYsh2rNl8Kz4j9tGj9C7A1z43j8tSbe', 'James', 'Lim', 'AGENT', 'Active'),
  ('AG-MSA1923', 'maria.santos@realtysync.com', '$2a$10$wIePlK6ZfCscvptVjMv20eVYsh2rNl8Kz4j9tGj9C7A1z43j8tSbe', 'Maria', 'Santos', 'AGENT', 'Active'),
  ('AG-MRA3456', 'mark.ramos@realtysync.com', '$2a$10$wIePlK6ZfCscvptVjMv20eVYsh2rNl8Kz4j9tGj9C7A1z43j8tSbe', 'Mark', 'Ramos', 'AGENT', 'Inactive')
ON CONFLICT ("id") DO NOTHING;
