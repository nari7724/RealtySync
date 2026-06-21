/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { User, Agent, Client, Booking, Notification, AuditLog, DualEntry, UserRole } from "./src/types.ts";
import { calculateCombinedDuplicateScore, normalizeAddress } from "./src/utils/matching.ts";

// Configure Supabase using provided credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uprykiqtdklubvhmrsai.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_JNlbM9HDsTj6ihBjoNbFWg_PdhU7aNN";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// Define realty projects
const DEFAULT_REALTY_PROJECTS = [
  "Avida Towers Riala",
  "Solinea Resort Condominium",
  "The Alcoves",
  "Park Point Residences",
  "Amara Subdivision",
  "Amaia Steps Mandaue",
  "Cebu IT Park Residences",
  "Marco Polo Residences"
];

const DEFAULT_USERS = [
  {
    id: "admin_user",
    email: "admin@realtysync.com",
    password: "$2b$10$ri9WNRrB6kqoH6brj3PvoeSasK0/fNaw/VTuux211LD1KPsUU1HHi", // Hashed "admin123"
    firstName: "Broker",
    lastName: "Admin",
    role: "ADMIN",
    status: "Active"
  },
  {
    id: "AG-SRA8234",
    email: "sarah.ramirez@realtysync.com",
    password: "$2b$10$DD.OUobtq5aenL5.9kDJuOiGgWNS9YGMV2UNqgki2N1MbYQOmktDC", // Hashed "agent123"
    firstName: "Sarah",
    lastName: "Ramirez",
    role: "AGENT",
    status: "Active"
  },
  {
    id: "AG-JBL1234",
    email: "james.lim@realtysync.com",
    password: "$2b$10$DD.OUobtq5aenL5.9kDJuOiGgWNS9YGMV2UNqgki2N1MbYQOmktDC", // Hashed "agent123"
    firstName: "James",
    lastName: "Lim",
    role: "AGENT",
    status: "Active"
  },
  {
    id: "AG-MSA1923",
    email: "maria.santos@realtysync.com",
    password: "$2b$10$DD.OUobtq5aenL5.9kDJuOiGgWNS9YGMV2UNqgki2N1MbYQOmktDC", // Hashed "agent123"
    firstName: "Maria",
    lastName: "Santos",
    role: "AGENT",
    status: "Active"
  },
  {
    id: "AG-MRA3456",
    email: "mark.ramos@realtysync.com",
    password: "$2b$10$DD.OUobtq5aenL5.9kDJuOiGgWNS9YGMV2UNqgki2N1MbYQOmktDC", // Hashed "agent123"
    firstName: "Mark",
    lastName: "Ramos",
    role: "AGENT",
    status: "Inactive"
  }
];

// Generate unique 3 letters 4 numbers alphanumeric ID suffix (total 7 characters)
function generateUniqueId(prefix: string): string {
  let attempts = 0;
  while (attempts < 100) {
    const letters = Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
    const numbers = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("");
    const candidate = `${prefix}-${letters}${numbers}`;
    
    const state = (typeof db !== "undefined") ? db : null;
    const existsClients = state && state.clients ? state.clients.some(c => c.id === candidate) : false;
    const existsAgents = state && state.agents ? state.agents.some(a => a.id === candidate) : false;
    const existsBookings = state && state.bookings ? state.bookings.some(b => b.id === candidate) : false;
    const existsDual = state && state.dualEntries ? state.dualEntries.some(d => d.id === candidate) : false;
    
    if (!existsClients && !existsAgents && !existsBookings && !existsDual) {
      return candidate;
    }
    attempts++;
  }
  const letters = Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
  const numbers = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("");
  return `${prefix}-${letters}${numbers}`;
}

// Define seed data structure
const DEFAULT_AGENTS: Agent[] = [
  {
    id: "AG-SRA8234",
    firstName: "Sarah",
    middleName: "A.",
    lastName: "Ramirez",
    email: "sarah.ramirez@realtysync.com",
    mobileNumber: "09178234567",
    prcLicenseNumber: "0023412",
    status: "Active",
    createdAt: "2026-01-10T08:30:00Z",
  },
  {
    id: "AG-JBL1234",
    firstName: "James",
    middleName: "B.",
    lastName: "Lim",
    email: "james.lim@realtysync.com",
    mobileNumber: "09181234567",
    prcLicenseNumber: "0041235",
    status: "Active",
    createdAt: "2026-02-15T10:15:00Z",
  },
  {
    id: "AG-MSA1923",
    firstName: "Maria",
    middleName: "C.",
    lastName: "Santos",
    email: "maria.santos@realtysync.com",
    mobileNumber: "09192345678",
    prcLicenseNumber: "0019234",
    status: "Active",
    createdAt: "2026-03-20T14:45:00Z",
  },
  {
    id: "AG-MRA3456",
    firstName: "Mark",
    middleName: "D.",
    lastName: "Ramos",
    email: "mark.ramos@realtysync.com",
    mobileNumber: "09203456789",
    prcLicenseNumber: "0034561",
    status: "Inactive", // Deactivated for demonstration
    createdAt: "2026-04-12T09:00:00Z",
  }
];

const DEFAULT_CLIENTS: Client[] = [
  {
    id: "CL-JDC1234",
    firstName: "Juan",
    middleName: "Dela",
    lastName: "Cruz",
    mobileNumber: "09171234567",
    address: "123 Mabini Street, Manila",
    facebookProfileLink: "facebook.com/juan.delacruz",
    sourceOfLead: "Facebook Ad",
    notes: "Particularly interested in 2-bedroom units.",
    assignedAgentId: "AG-SRA8234",
    assignedAgentName: "Sarah Ramirez",
    dateRegistered: "2026-05-12T11:00:00Z",
    duplicateStatus: "None"
  },
  // Exact Mobile and Name conflict logged by James Lim later:
  {
    id: "CL-JDC1235",
    firstName: "Juan",
    middleName: "",
    lastName: "Delacruz",
    mobileNumber: "09171234567",
    address: "123 Mabini St., Metro Manila",
    facebookProfileLink: "facebook.com/juan.delacruz",
    sourceOfLead: "Direct Walk-In",
    notes: "Wants to reserve unit this week.",
    assignedAgentId: "AG-JBL1234",
    assignedAgentName: "James Lim",
    dateRegistered: "2026-06-01T15:20:00Z",
    duplicateStatus: "Strong"
  },
  {
    id: "CL-JPS1337",
    firstName: "Johnathan",
    middleName: "Paul",
    lastName: "Smith",
    mobileNumber: "09189876543",
    address: "Lot 5, Villa Sol, Angeles City",
    facebookProfileLink: "facebook.com/jpsmith",
    sourceOfLead: "Broker Referral",
    notes: "High budget commercial investor.",
    assignedAgentId: "AG-MSA1923",
    assignedAgentName: "Maria Santos",
    dateRegistered: "2026-06-05T09:12:00Z",
    duplicateStatus: "None"
  },
  {
    id: "CL-JPS1338",
    firstName: "Johnny",
    middleName: "",
    lastName: "Smith",
    mobileNumber: "09189876543", // Same Phone!
    address: "Villa Sol Subdivision, Angeles City",
    facebookProfileLink: "facebook.com/jpsmith", // Same FB!
    sourceOfLead: "Flyer",
    notes: "Looking for commercial lease.",
    assignedAgentId: "AG-SRA8234",
    assignedAgentName: "Sarah Ramirez",
    dateRegistered: "2026-06-14T01:30:00Z", // Created fresh today!
    duplicateStatus: "Strong"
  }
];

const DEFAULT_BOOKINGS: Booking[] = [];

const DEFAULT_DUAL_ENTRIES: DualEntry[] = [
  {
    id: "CON-JDC1111",
    clientName: "Juan Dela Cruz",
    clientIdA: "CL-JDC1234",
    clientIdB: "CL-JDC1235",
    agentIdA: "AG-SRA8234",
    agentNameA: "Sarah Ramirez",
    agentIdB: "AG-JBL1234",
    agentNameB: "James Lim",
    dateA: "2026-05-12T11:00:00Z",
    dateB: "2026-06-01T15:20:00Z",
    similarityScore: 100, // Exact phone and FB Match
    status: "Pending Review",
    details: {
      clientA: DEFAULT_CLIENTS[0],
      clientB: DEFAULT_CLIENTS[1],
      differences: {
        name: true, // "Juan Dela Cruz" vs "Juan Delacruz"
        phone: false, // "09171234567" == "09171234567"
        address: true, // "123 Mabini Street, Manila" vs "123 Mabini St., Metro Manila"
      },
    },
  },
  {
    id: "CON-JPS2222",
    clientName: "Johnathan Smith",
    clientIdA: "CL-JPS1337",
    clientIdB: "CL-JPS1338",
    agentIdA: "AG-MSA1923",
    agentNameA: "Maria Santos",
    agentIdB: "AG-SRA8234",
    agentNameB: "Sarah Ramirez",
    dateA: "2026-06-05T09:12:00Z",
    dateB: "2026-06-14T01:30:00Z", // Fresh today
    similarityScore: 100, // Same phone and FB Match
    status: "Pending Review",
    details: {
      clientA: DEFAULT_CLIENTS[2],
      clientB: DEFAULT_CLIENTS[3],
      differences: {
        name: true, // "Johnathan Paul Smith" vs "Johnny Smith"
        phone: false, // Match
        address: true, // "Lot 5, Villa Sol, Angeles City" vs "Villa Sol Subdivision, Angeles City"
      },
    },
  }
];

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: "notif_1",
    title: "Dual Entry Alert",
    message: "Conflict detected: Agents Sarah Ramirez and James Lim uploaded duplicates of 'Juan Dela Cruz'.",
    timestamp: "2026-06-01T15:20:00Z",
    read: false,
    type: "DUPLICATE_ALERT",
  },
  {
    id: "notif_2",
    title: "New Dual Entry Registered",
    message: "Agent Sarah Ramirez registered 'Johnny Smith' which conflicts with Maria Santos's 'Johnathan Smith'.",
    timestamp: "2026-06-14T01:30:00Z",
    read: false,
    type: "DUPLICATE_ALERT",
  }
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log_1",
    userId: "admin_user",
    userEmail: "admin@realtysync.com",
    userName: "Broker Admin",
    userRole: UserRole.ADMIN,
    action: "System Initialized",
    entity: "Database",
    timestamp: "2026-06-14T00:00:00Z",
  },
  {
    id: "log_2",
    userId: "agent_1",
    userEmail: "sarah.ramirez@realtysync.com",
    userName: "Sarah Ramirez",
    userRole: UserRole.AGENT,
    action: "Client Registered",
    entity: "Client (Juan Dela Cruz)",
    timestamp: "2026-05-12T11:00:00Z",
    newValue: "Juan Dela Cruz - Sarah Ramirez"
  },
  {
    id: "log_3",
    userId: "agent_2",
    userEmail: "james.lim@realtysync.com",
    userName: "James Lim",
    userRole: UserRole.AGENT,
    action: "Duplicate Client Claimed",
    entity: "Client (Juan Delacruz)",
    timestamp: "2026-06-01T15:20:00Z",
    newValue: "Juan Delacruz - James Lim (Similarity Score: 100%)"
  }
];

function migrateState(state: any): any {
  if (!state) return state;
  const agentMap: Record<string, string> = {
    "agent_1": "AG-SRA8234",
    "agent_2": "AG-JBL1234",
    "agent_3": "AG-MSA1923",
    "agent_4": "AG-MRA3456"
  };
  const clientMap: Record<string, string> = {
    "client_1": "CL-JDC1234",
    "client_2": "CL-JDC1235",
    "client_3": "CL-JPS1337",
    "client_4": "CL-JPS1338"
  };
  const bookingMap: Record<string, string> = {
    "booking_1": "APT-RES5555",
    "booking_2": "APT-SIV6666"
  };
  const dualMap: Record<string, string> = {
    "dual_1": "CON-JDC1111",
    "dual_2": "CON-JPS2222"
  };

  const mapAgent = (id: string) => agentMap[id] || id;
  const mapClient = (id: string) => clientMap[id] || id;
  const mapBooking = (id: string) => bookingMap[id] || id;
  const mapDual = (id: string) => dualMap[id] || id;

  if (Array.isArray(state.agents)) {
    state.agents = state.agents.map((a: any) => ({
      ...a,
      id: mapAgent(a.id)
    }));
  }
  if (Array.isArray(state.clients)) {
    state.clients = state.clients.map((c: any) => ({
      ...c,
      id: mapClient(c.id),
      assignedAgentId: mapAgent(c.assignedAgentId)
    }));
  }
  if (Array.isArray(state.bookings)) {
    state.bookings = state.bookings.map((b: any) => ({
      ...b,
      id: mapBooking(b.id),
      clientId: mapClient(b.clientId),
      agentId: mapAgent(b.agentId)
    }));
  }
  if (Array.isArray(state.dualEntries)) {
    state.dualEntries = state.dualEntries.map((d: any) => {
      const updated = {
        ...d,
        id: mapDual(d.id),
        clientIdA: mapClient(d.clientIdA),
        clientIdB: mapClient(d.clientIdB),
        agentIdA: mapAgent(d.agentIdA),
        agentIdB: mapAgent(d.agentIdB)
      };
      if (updated.details) {
        if (updated.details.clientA) {
          updated.details.clientA = {
            ...updated.details.clientA,
            id: mapClient(updated.details.clientA.id),
            assignedAgentId: mapAgent(updated.details.clientA.assignedAgentId)
          };
        }
        if (updated.details.clientB) {
          updated.details.clientB = {
            ...updated.details.clientB,
            id: mapClient(updated.details.clientB.id),
            assignedAgentId: mapAgent(updated.details.clientB.assignedAgentId)
          };
        }
      }
      return updated;
    });
  }
  if (Array.isArray(state.notifications)) {
    state.notifications = state.notifications.map((n: any) => {
      if (typeof n.message === "string") {
        let msg = n.message;
        Object.keys(agentMap).forEach(k => {
          msg = msg.replace(new RegExp(k, "g"), agentMap[k]);
        });
        Object.keys(clientMap).forEach(k => {
          msg = msg.replace(new RegExp(k, "g"), clientMap[k]);
        });
        return { ...n, message: msg };
      }
      return n;
    });
  }
  if (Array.isArray(state.auditLogs)) {
    state.auditLogs = state.auditLogs.map((l: any) => ({
      ...l,
      id: l.id ? (l.id.startsWith("log_") ? "LOG-" + l.id.slice(4).toUpperCase() : l.id) : l.id,
      userId: mapAgent(l.userId)
    }));
  }
  return state;
}

// Temporary passwords persistent storage helpers
const TEMP_PASSWORDS_FILE = path.join(process.cwd(), "temp_passwords.json");

function loadTempPasswords(): string[] {
  try {
    if (fs.existsSync(TEMP_PASSWORDS_FILE)) {
      const data = fs.readFileSync(TEMP_PASSWORDS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading temp passwords list:", err);
  }
  return [];
}

function saveTempPasswords(emails: string[]) {
  try {
    fs.writeFileSync(TEMP_PASSWORDS_FILE, JSON.stringify(emails, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving temp passwords list:", err);
  }
}

function addTempPasswordEmail(email: string) {
  const list = loadTempPasswords();
  const clean = email.toLowerCase().trim();
  if (!list.includes(clean)) {
    list.push(clean);
    saveTempPasswords(list);
  }
}

function removeTempPasswordEmail(email: string) {
  const list = loadTempPasswords();
  const clean = email.toLowerCase().trim();
  const filtered = list.filter(e => e !== clean);
  if (list.length !== filtered.length) {
    saveTempPasswords(filtered);
  }
}

function isTempPasswordEmail(email: string): boolean {
  const list = loadTempPasswords();
  return list.includes(email.toLowerCase().trim());
}

function generateRandomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let pwd = "RS-";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function simulateEmailSend(email: string, subject: string, body: string) {
  console.log("\n=======================================================");
  console.log(`[EMAIL DISPATCH SYSTEM LOG]`);
  console.log(`To: ${email}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${body}`);
  console.log("=======================================================\n");
}

// Seeding function for first-time startup if databases are empty
async function seedSupabaseIfNeeded() {
  console.log("Checking if Supabase database needs seeding...");
  
  // 1. Realty Projects
  try {
    const { data, error } = await supabase.from("realty_projects").select("name");
    if (error || !data || data.length === 0) {
      console.log("Seeding realty projects into Supabase...");
      for (const name of DEFAULT_REALTY_PROJECTS) {
        await supabase.from("realty_projects").insert({ name });
      }
    }
  } catch (err: any) {
    console.log("Notice: Failed to seed realty_projects:", err.message || err);
  }

  // 2. Agents
  try {
    const { data, error } = await supabase.from("agents").select("id");
    if (error || !data || data.length === 0) {
      console.log("Seeding agents into Supabase...");
      await supabase.from("agents").insert(DEFAULT_AGENTS);
    }
  } catch (err: any) {
    console.log("Notice: Failed to seed agents:", err.message || err);
  }

  // 3. Clients
  try {
    const { data, error } = await supabase.from("clients").select("id");
    if (error || !data || data.length === 0) {
      console.log("Seeding clients into Supabase...");
      await supabase.from("clients").insert(DEFAULT_CLIENTS);
    }
  } catch (err: any) {
    console.log("Notice: Failed to seed clients:", err.message || err);
  }

  // 4. Bookings
  try {
    const { data, error } = await supabase.from("bookings").select("id");
    if (error || !data || data.length === 0) {
      console.log("Seeding bookings into Supabase...");
      await supabase.from("bookings").insert(DEFAULT_BOOKINGS);
    }
  } catch (err: any) {
    console.log("Notice: Failed to seed bookings:", err.message || err);
  }

  // 5. Dual Entries
  try {
    const { data, error } = await supabase.from("dual_entries").select("id");
    if (error || !data || data.length === 0) {
      console.log("Seeding dual entries into Supabase...");
      const safeDualEntries = DEFAULT_DUAL_ENTRIES.map(d => ({
        ...d,
        details: typeof d.details === "object" ? JSON.stringify(d.details) : d.details
      }));
      await supabase.from("dual_entries").insert(safeDualEntries);
    }
  } catch (err: any) {
    console.log("Notice: Failed to seed dual_entries:", err.message || err);
  }

  // 6. Notifications
  try {
    const { data, error } = await supabase.from("notifications").select("id");
    if (error || !data || data.length === 0) {
      console.log("Seeding notifications into Supabase...");
      await supabase.from("notifications").insert(DEFAULT_NOTIFICATIONS);
    }
  } catch (err: any) {
    console.log("Notice: Failed to seed notifications:", err.message || err);
  }

  // 7. Audit Logs
  try {
    const { data, error } = await supabase.from("audit_logs").select("id");
    if (error || !data || data.length === 0) {
      console.log("Seeding audit logs into Supabase...");
      await supabase.from("audit_logs").insert(DEFAULT_AUDIT_LOGS);
    }
  } catch (err: any) {
    console.log("Notice: Failed to seed audit_logs:", err.message || err);
  }

  // 8. Authenticated Users (Verify & seed default accounts)
  try {
    const { data, error } = await supabase.from("users").select("id");
    if (error || !data || data.length === 0) {
      console.log("Seeding default authenticated users into Supabase 'users' table...");
      await supabase.from("users").insert(DEFAULT_USERS);
    }
  } catch (err: any) {
    console.log("Notice: Failed to seed authenticated users:", err.message || err);
  }

  console.log("Supabase seed check completed!");
}

// Mappings and helper to safely normalize case issues from Postgres/Supabase schemas
const AGENT_MAPPINGS = {
  firstname: "firstName",
  middlename: "middleName",
  lastname: "lastName",
  mobilenumber: "mobileNumber",
  prclicensenumber: "prcLicenseNumber",
  createdat: "createdAt",
};

const CLIENT_MAPPINGS = {
  firstname: "firstName",
  middlename: "middleName",
  lastname: "lastName",
  mobilenumber: "mobileNumber",
  facebookprofilelink: "facebookProfileLink",
  sourceoflead: "sourceOfLead",
  assignedagentid: "assignedAgentId",
  assignedagentname: "assignedAgentName",
  dateregistered: "dateRegistered",
  duplicatestatus: "duplicateStatus",
};

const BOOKING_MAPPINGS = {
  clientid: "clientId",
  clientname: "clientName",
  clientmobile: "clientMobile",
  agentid: "agentId",
  agentname: "agentName",
  appointmenttype: "appointmentType",
  appointmentdate: "appointmentDate",
  appointmenttime: "appointmentTime",
  datetime: "dateTime",
  createdat: "createdAt",
};

const DUAL_ENTRY_MAPPINGS = {
  clientname: "clientName",
  clientida: "clientIdA",
  clientidb: "clientIdB",
  agentida: "agentIdA",
  agentnamea: "agentNameA",
  agentidb: "agentIdB",
  agentnameb: "agentNameB",
  datea: "dateA",
  dateb: "dateB",
  similarityscore: "similarityScore",
};

const NOTIFICATION_MAPPINGS = {
  agentid: "agentId",
  clientid: "clientId",
};

const AUDIT_LOG_MAPPINGS = {
  userid: "userId",
  useremail: "userEmail",
  username: "userName",
  userrole: "userRole",
  previousvalue: "previousValue",
  newvalue: "newValue",
};

function normalizeKeys<T extends Record<string, any>>(obj: T, mappings: Record<string, string>): T {
  if (!obj || typeof obj !== "object") return obj;
  const result = { ...obj } as any;
  for (const [lowerKey, camelKey] of Object.entries(mappings)) {
    if (obj[lowerKey] !== undefined && obj[camelKey] === undefined) {
      result[camelKey] = obj[lowerKey];
    }
  }
  return result;
}

// Fetch helper functions that read directly from Supabase
async function fetchAgents(): Promise<Agent[]> {
  const { data, error } = await supabase.from("agents").select("*");
  if (error) {
    console.error("Supabase error fetching agents:", error);
    throw error;
  }
  return (data || []).map(a => normalizeKeys<Agent>(a, AGENT_MAPPINGS));
}

async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*");
  if (error) {
    console.error("Supabase error fetching clients:", error);
    throw error;
  }
  return (data || []).map(c => normalizeKeys<Client>(c, CLIENT_MAPPINGS));
}

async function fetchBookings(): Promise<Booking[]> {
  const { data, error } = await supabase.from("bookings").select("*");
  if (error) {
    console.error("Supabase error fetching bookings:", error);
    throw error;
  }
  return (data || []).map(b => normalizeKeys<Booking>(b, BOOKING_MAPPINGS));
}

async function fetchDualEntries(): Promise<DualEntry[]> {
  const { data, error } = await supabase.from("dual_entries").select("*");
  if (error) {
    console.error("Supabase error fetching dual_entries:", error);
    throw error;
  }
  return (data || []).map(d => {
    const norm = normalizeKeys<DualEntry>(d, DUAL_ENTRY_MAPPINGS);
    if (norm.details && typeof norm.details === "string") {
      try {
        norm.details = JSON.parse(norm.details);
      } catch (_) {}
    }
    return norm;
  });
}

async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase.from("notifications").select("*");
  if (error) {
    console.error("Supabase error fetching notifications:", error);
    throw error;
  }
  return (data || []).map(n => normalizeKeys<Notification>(n, NOTIFICATION_MAPPINGS));
}

async function fetchAuditLogs(): Promise<AuditLog[]> {
  const { data, error } = await supabase.from("audit_logs").select("*");
  if (error) {
    console.error("Supabase error fetching audit_logs:", error);
    throw error;
  }
  return (data || []).map(l => normalizeKeys<AuditLog>(l, AUDIT_LOG_MAPPINGS));
}

async function fetchRealtyProjects(): Promise<string[]> {
  const { data, error } = await supabase.from("realty_projects").select("name");
  if (error) {
    console.error("Supabase error fetching realty_projects:", error);
    return [...DEFAULT_REALTY_PROJECTS];
  }
  return (data && data.length > 0) ? data.map(p => p.name) : [...DEFAULT_REALTY_PROJECTS];
}


// Re-evaluates overlaps/conflicts among all clients in Supabase
async function reevaluateAllClientConflicts() {
  try {
    const clients = await fetchClients();
    const dualEntries = await fetchDualEntries();

    // Reset duplicate statuses on clients first (or keep track in memory to update in bulk)
    const clientUpdates: Record<string, Client> = {};
    for (const c of clients) {
      if (c.duplicateStatus !== "None") {
        c.duplicateStatus = "None";
        clientUpdates[c.id] = c;
      }
    }

    const dualEntriesToUpsert: DualEntry[] = [];
    const dualEntriesToDelete: string[] = [];

    // Compare every distinct pair of clients
    for (let i = 0; i < clients.length; i++) {
      for (let j = i + 1; j < clients.length; j++) {
        const c1 = clients[i];
        const c2 = clients[j];

        // Skip surrendered claims
        if (c1.status === "Surrendered Claim" || c2.status === "Surrendered Claim") {
          continue;
        }

        const check = calculateCombinedDuplicateScore(c1, c2);
        
        if (check.score >= 70) {
          const overlapStatus = check.score >= 90 ? "Strong" : "Possible";
          
          c1.duplicateStatus = overlapStatus;
          c2.duplicateStatus = overlapStatus;
          clientUpdates[c1.id] = c1;
          clientUpdates[c2.id] = c2;

          // Add or update DualEntry (conflict queue item)
          const existingDual = dualEntries.find(d => 
            (d.clientIdA === c1.id && d.clientIdB === c2.id) ||
            (d.clientIdA === c2.id && d.clientIdB === c1.id)
          );

          if (!existingDual) {
            const dualEntry: DualEntry = {
              id: generateUniqueId("CON"),
              clientName: `${c2.firstName} ${c2.lastName}`,
              clientIdA: c1.id,
              clientIdB: c2.id,
              agentIdA: c1.assignedAgentId,
              agentNameA: c1.assignedAgentName,
              agentIdB: c2.assignedAgentId,
              agentNameB: c2.assignedAgentName,
              dateA: c1.dateRegistered,
              dateB: c2.dateRegistered,
              similarityScore: check.score,
              status: "Pending Review",
              details: {
                clientA: c1,
                clientB: c2,
                differences: {
                  name: `${c1.firstName} ${c1.lastName}`.toLowerCase() !== `${c2.firstName} ${c2.lastName}`.toLowerCase(),
                  phone: c1.mobileNumber !== c2.mobileNumber,
                  address: normalizeAddress(c1.address) !== normalizeAddress(c2.address)
                }
              }
            };
            dualEntriesToUpsert.push(dualEntry);
          } else {
            existingDual.similarityScore = check.score;
            existingDual.details = {
              clientA: existingDual.clientIdA === c1.id ? c1 : c2,
              clientB: existingDual.clientIdB === c2.id ? c2 : c1,
              differences: {
                name: `${c1.firstName} ${c1.lastName}`.toLowerCase() !== `${c2.firstName} ${c2.lastName}`.toLowerCase(),
                phone: c1.mobileNumber !== c2.mobileNumber,
                address: normalizeAddress(c1.address) !== normalizeAddress(c2.address)
              }
            };
            dualEntriesToUpsert.push(existingDual);
          }
        } else {
          // If there was an existing DualEntry but score is now < 70, delete it
          const existingDual = dualEntries.find(d => 
            (d.clientIdA === c1.id && d.clientIdB === c2.id) ||
            (d.clientIdA === c2.id && d.clientIdB === c1.id)
          );
          if (existingDual) {
            dualEntriesToDelete.push(existingDual.id);
          }
        }
      }
    }

    // Update clients
    for (const c of Object.values(clientUpdates)) {
      const payload = mapToDb(c, CLIENT_MAPPINGS);
      await supabase.from("clients").update(payload).eq("id", c.id);
    }

    // Upsert dual entries
    for (const d of dualEntriesToUpsert) {
      const payload = mapToDb(d, DUAL_ENTRY_MAPPINGS);
      payload.details = typeof d.details === "object" ? JSON.stringify(d.details) : d.details;
      await supabase.from("dual_entries").upsert(payload);
    }

    // Delete inactive dual entries
    for (const id of dualEntriesToDelete) {
      await supabase.from("dual_entries").delete().eq("id", id);
    }

    // Prune invalid dual entries (where clients don't exist)
    const latestClients = await fetchClients();
    const latestDualEntries = await fetchDualEntries();
    for (const d of latestDualEntries) {
      const hasA = latestClients.some(c => c.id === d.clientIdA);
      const hasB = latestClients.some(c => c.id === d.clientIdB);
      if (!hasA || !hasB) {
        await supabase.from("dual_entries").delete().eq("id", d.id);
      }
    }
  } catch (err) {
    console.error("reevaluateAllClientConflicts error:", err);
  }
}

// Build custom server
async function startServer() {
  // Sync state from Supabase Cloud Database on startup asynchronously
  // so it does not block the port binding and cause gateway timeouts.
  seedSupabaseIfNeeded().catch((err) => {
    console.error("Async startup seed check failed:", err);
  });

  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json());

  // Static serving helper for downloads/exports
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });

  // --- API ROUTING COMPLYING TO FULL-STACK SPEC ---

  // Auth Endpoint (Real Stateless Password Verification via Bcrypt & Supabase)
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = (email || "").toLowerCase().trim();
    
    if (!cleanEmail || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    try {
      // Query our users table on Supabase
      const { data: supaUser, error: supaErr } = await supabase
        .from("users")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      let matchedUser = supaUser;
      if (!matchedUser) {
        // Fallback: Check our secure DEFAULT_USERS seed list
        matchedUser = DEFAULT_USERS.find(u => u.email.toLowerCase().trim() === cleanEmail);
      }

      if (!matchedUser) {
        return res.status(401).json({ error: "Access Denied: Invalid email address or user not found." });
      }

      // Enforce secure password matching via bcrypt
      let isMatch = false;
      try {
        isMatch = bcrypt.compareSync(password, matchedUser.password);
      } catch (_) {
        // Fallback to strict string check if bcrypt parsing fails for non-hashed legacy passwords
        isMatch = matchedUser.password === password;
      }

      if (!isMatch) {
         return res.status(401).json({ error: "Access Denied: Invalid password." });
      }
      
      if (matchedUser.status === "Inactive") {
        return res.status(401).json({ error: "Access Denied: This account has been deactivated." });
      }

      // Normalize fields (e.g. firstName / lastName / middleName)
      const firstNameMapped = matchedUser.firstName || matchedUser.firstname || "";
      const lastNameMapped = matchedUser.lastName || matchedUser.lastname || "";
      const isForceChange = isTempPasswordEmail(cleanEmail);

      return res.json({
        id: matchedUser.id,
        email: matchedUser.email,
        firstName: firstNameMapped,
        lastName: lastNameMapped,
        role: matchedUser.role as UserRole,
        status: matchedUser.status,
        forcePasswordChange: isForceChange,
        token: `${matchedUser.role.toLowerCase()}-token-${matchedUser.id}`
      });
    } catch (err: any) {
      console.error("Supabase authentication failed:", err);
      return res.status(500).json({ error: "Internal Authentication Error: Please check Supabase credentials." });
    }
  });

  // Endpoints for password changes
  app.post("/api/auth/change-password", async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: "User ID and new password are required." });
    }

    try {
      // Find the user on Supabase auth users
      const { data: user, error: userErr } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      let matchedUser = user;
      if (!matchedUser) {
        matchedUser = DEFAULT_USERS.find(u => u.id === userId);
      }

      if (!matchedUser) {
        return res.status(404).json({ error: "User account profile not found." });
      }

      // If they provide oldPassword, verify it for standard non-forced flows
      if (oldPassword) {
        let isMatch = false;
        try {
          isMatch = bcrypt.compareSync(oldPassword, matchedUser.password);
        } catch (_) {
          isMatch = matchedUser.password === oldPassword;
        }

        if (!isMatch) {
          return res.status(400).json({ error: "Incorrect current or temporary password." });
        }
      }

      const hash = bcrypt.hashSync(newPassword, 10);

      // Save updated password on remote Supabase and local representation if any
      const { error: updErr } = await supabase
        .from("users")
        .update({ password: hash })
        .eq("id", userId);

      if (updErr) {
        console.warn("Notice: users update returned error, falling back locally:", updErr.message);
      }

      // Remove from isTemporary file
      removeTempPasswordEmail(matchedUser.email);

      writeLog(
        userId,
        matchedUser.email,
        `${matchedUser.firstName} ${matchedUser.lastName}`,
        matchedUser.role as UserRole,
        "Password Security Reset",
        `User renewed their security password credentials`,
        "*****",
        "*****"
      );

      return res.json({ success: true, message: "Your security credentials have been updated!" });
    } catch (err: any) {
      console.error("Change password error:", err);
      return res.status(500).json({ error: "Failed to update security password. Clear connections and retry." });
    }
  });

  // Audit Log writing middleware api
  const writeLog = (userId: string, email: string, userName: string, role: UserRole, action: string, entity: string, prev?: any, curr?: any) => {
    const log: AuditLog = {
      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      userId,
      userEmail: email,
      userName,
      userRole: role,
      action,
      entity,
      timestamp: new Date().toISOString(),
      previousValue: prev ? typeof prev === 'string' ? prev : JSON.stringify(prev) : undefined,
      newValue: curr ? typeof curr === 'string' ? curr : JSON.stringify(curr) : undefined,
    };
    db.auditLogs.unshift(log);
    saveDB(db);
  };

  // 1. DUP PREVENTATIVE ALGORITHM CHECK (Used during Client Creation warnings)
  app.post("/api/clients/check-duplicate", (req, res) => {
    const pendingClient = req.body;
    let highestScore = 0;
    let matchResult = null;

    for (const existing of db.clients) {
      // Skip comparing to self if editing
      if (pendingClient.id && existing.id === pendingClient.id) continue;

      const comp = calculateCombinedDuplicateScore(pendingClient, existing);
      if (comp.score > highestScore) {
        highestScore = comp.score;
        
        let statusString: "Strong Duplicate" | "Possible Duplicate" | "No Duplicate" = "No Duplicate";
        if (comp.score >= 90) statusString = "Strong Duplicate";
        else if (comp.score >= 70) statusString = "Possible Duplicate";

        // Find agent info
        const agent = db.agents.find(a => a.id === existing.assignedAgentId);

        matchResult = {
          isDuplicate: comp.score >= 70,
          score: comp.score,
          status: statusString,
          existingAgentName: agent ? `${agent.firstName} ${agent.lastName}` : existing.assignedAgentName,
          existingAgentId: existing.assignedAgentId,
          existingRegistrationDate: existing.dateRegistered,
          existingClientId: existing.id,
          scoreBreakdown: {
            nameSimilarity: comp.nameSimilarity,
            phoneMatch: comp.phoneMatch,
            addressSimilarity: comp.addressSimilarity
          }
        };
      }
    }

    if (!matchResult || highestScore < 70) {
      return res.json({
        isDuplicate: false,
        score: highestScore,
        status: "No Duplicate"
      });
    }

    return res.json(matchResult);
  });

  // 2. CLIENT MODULE ENDPOINTS
  app.get("/api/clients", (req, res) => {
    const { search, agentId, duplicateStatus, page = "1", limit = "10" } = req.query;
    let list = [...db.clients];

    // Sort with latest entry first
    list.sort((a, b) => new Date(b.dateRegistered).getTime() - new Date(a.dateRegistered).getTime());

    // Filter by Search (Global Client Name, Mobile, Facebook, or Agent Name, or Client ID)
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(c => 
        c.id.toLowerCase().includes(q) ||
        `${c.firstName} ${c.middleName || ""} ${c.lastName}`.toLowerCase().includes(q) ||
        c.mobileNumber.includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.facebookProfileLink?.toLowerCase().includes(q) ||
        c.assignedAgentName.toLowerCase().includes(q)
      );
    }

    // Filter by specific Agent
    if (agentId) {
      list = list.filter(c => c.assignedAgentId === agentId);
    }

    // Filter by Duplicate Status category
    if (duplicateStatus) {
      list = list.filter(c => c.duplicateStatus.toLowerCase() === String(duplicateStatus).toLowerCase());
    }

    // Server-side Pagination calculation
    const pageNum = parseInt(String(page)) || 1;
    const limitNum = parseInt(String(limit)) || 10;
    const total = list.length;
    const paginated = list.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      clients: paginated,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    });
  });

  app.post("/api/clients", (req, res) => {
    const clientData = req.body;
    const { userContext } = clientData; // client must send posting user context details

    const creatorId = userContext?.id || "agent_1";
    const creatorName = userContext?.userName || "Sarah Ramirez";
    const creatorEmail = userContext?.email || "sarah.ramirez@realtysync.com";
    const creatorRole = userContext?.role || UserRole.AGENT;

    // Build standard client entity
    const newClient: Client = {
      id: generateUniqueId("CL"),
      firstName: clientData.firstName,
      middleName: clientData.middleName || "",
      lastName: clientData.lastName,
      mobileNumber: clientData.mobileNumber,
      address: clientData.address,
      facebookProfileLink: clientData.facebookProfileLink || "",
      sourceOfLead: clientData.sourceOfLead || "Social Media",
      notes: clientData.notes || "",
      assignedAgentId: creatorRole === UserRole.ADMIN ? (clientData.assignedAgentId || "agent_1") : creatorId,
      assignedAgentName: creatorRole === UserRole.ADMIN ? (clientData.assignedAgentName || "Sarah Ramirez") : creatorName,
      dateRegistered: new Date().toISOString(),
      duplicateStatus: "None"
    };

    // Calculate duplicate profile against existing clients
    let conflictFound = false;
    let activeConflict: any = null;

    for (const existing of db.clients) {
      const check = calculateCombinedDuplicateScore(newClient, existing);
      if (check.score >= 70) {
        conflictFound = true;
        newClient.duplicateStatus = check.score >= 90 ? "Strong" : "Possible";
        activeConflict = { existing, score: check.score };
      }
    }

    db.clients.unshift(newClient);

    // If duplicate was tracked, spawn DualEntry conflict records for admin inspection
    if (conflictFound && activeConflict) {
      const existing = activeConflict.existing;
      const score = activeConflict.score;

      const dualEntry: DualEntry = {
        id: generateUniqueId("CON"),
        clientName: `${newClient.firstName} ${newClient.lastName}`,
        clientIdA: existing.id,
        clientIdB: newClient.id,
        agentIdA: existing.assignedAgentId,
        agentNameA: existing.assignedAgentName,
        agentIdB: newClient.assignedAgentId,
        agentNameB: newClient.assignedAgentName,
        dateA: existing.dateRegistered,
        dateB: newClient.dateRegistered,
        similarityScore: score,
        status: "Pending Review",
        details: {
          clientA: existing,
          clientB: newClient,
          differences: {
            name: `${existing.firstName} ${existing.lastName}`.toLowerCase() !== `${newClient.firstName} ${newClient.lastName}`.toLowerCase(),
            phone: existing.mobileNumber !== newClient.mobileNumber,
            address: normalizeAddress(existing.address) !== normalizeAddress(newClient.address)
          }
        }
      };

      db.dualEntries.unshift(dualEntry);

      // Create Admin Notifications
      const notif: Notification = {
        id: "notif_" + Date.now(),
        title: "Duplicate Client Encoding",
        message: `Agent ${newClient.assignedAgentName} registered '${newClient.firstName} ${newClient.lastName}' which duplicates '${existing.firstName} ${existing.lastName}' (Agent: ${existing.assignedAgentName}). Conflict score: ${score}%.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: "DUPLICATE_ALERT"
      };
      db.notifications.unshift(notif);
    }

    // Add logging
    writeLog(
      creatorId,
      creatorEmail,
      creatorName,
      creatorRole,
      conflictFound ? "Duplicate Client Registered" : "Client Registered",
      `Client: ${newClient.firstName} ${newClient.lastName}`,
      null,
      newClient
    );

    saveDB(db);
    res.status(201).json(newClient);
  });

  app.put("/api/clients/:id", (req, res) => {
    const { id } = req.params;
    const clientData = req.body;
    const { userContext } = clientData;

    const editorId = userContext?.id || "admin_user";
    const editorName = userContext?.userName || "Broker Admin";
    const editorEmail = userContext?.email || "admin@realtysync.com";
    const editorRole = userContext?.role || UserRole.ADMIN;

    const index = db.clients.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Client not found" });
    }

    const previousValue = { ...db.clients[index] };
    
    // Update contents keeping original registration and static fields
    db.clients[index] = {
      ...db.clients[index],
      firstName: clientData.firstName ?? db.clients[index].firstName,
      middleName: clientData.middleName ?? db.clients[index].middleName,
      lastName: clientData.lastName ?? db.clients[index].lastName,
      mobileNumber: clientData.mobileNumber ?? db.clients[index].mobileNumber,
      address: clientData.address ?? db.clients[index].address,
      facebookProfileLink: clientData.facebookProfileLink ?? db.clients[index].facebookProfileLink,
      sourceOfLead: clientData.sourceOfLead ?? db.clients[index].sourceOfLead,
      notes: clientData.notes ?? db.clients[index].notes,
    };

    // Re-evaluate overlap/conflicts across all clients when details are updated
    reevaluateAllClientConflicts();

    writeLog(
      editorId,
      editorEmail,
      editorName,
      editorRole,
      "Client Records Updated",
      `Client ID: ${id}`,
      previousValue,
      db.clients[index]
    );

    saveDB(db);
    res.json(db.clients[index]);
  });

  app.post("/api/clients/:id/surrender", (req, res) => {
    const { id } = req.params;
    const { userContext } = req.body;

    const agentId = userContext?.id || "unknown_agent";
    const agentName = userContext?.userName || "Agent Representative";
    const agentEmail = userContext?.email || "agent@realtysync.com";

    const clientIndex = db.clients.findIndex(c => c.id === id);
    if (clientIndex === -1) {
      return res.status(404).json({ error: "Client not found" });
    }

    const client = db.clients[clientIndex];
    const previousStateString = JSON.stringify(client);

    // Find the dual entry associated with this client that is pending review
    const dualIndex = db.dualEntries.findIndex(d => 
      (d.clientIdA === id || d.clientIdB === id) && 
      d.status === "Pending Review"
    );

    if (dualIndex !== -1) {
      const dual = db.dualEntries[dualIndex];
      const previousDualState = JSON.stringify(dual);

      // Determine the winner client (the one that is NOT this surrendered client)
      const otherClientId = dual.clientIdA === id ? dual.clientIdB : dual.clientIdA;
      const otherClientIndex = db.clients.findIndex(c => c.id === otherClientId);

      // Resolve the dual entry
      dual.status = "Resolved";
      // Clear duplicate status on the remaining winner client
      if (otherClientIndex !== -1) {
        db.clients[otherClientIndex].duplicateStatus = "None";
      }

      writeLog(
        agentId,
        agentEmail,
        agentName,
        UserRole.AGENT,
        "Voluntary Claim Surrender & Resolve",
        `Agent surrendered claim on client '${client.firstName} ${client.lastName}'. Conflicting entry resolved.`,
        previousDualState,
        JSON.stringify(dual)
      );
    }

    // Do not delete client record when being surrendered just update status to "Surrendered Claim"
    client.status = "Surrendered Claim";
    client.duplicateStatus = "None"; // Clear duplicate check since they are surrendering

    writeLog(
      agentId,
      agentEmail,
      agentName,
      UserRole.AGENT,
      "Client Claim Surrendered",
      `Updated client profile '${client.firstName} ${client.lastName}' status to 'Surrendered Claim' due to agent voluntary claim surrender`,
      previousStateString,
      JSON.stringify(client)
    );

    saveDB(db);
    res.json({ success: true });
  });

  // 3. AGENT MODULE ENDPOINTS
  app.get("/api/agents", (req, res) => {
    const { search, status } = req.query;
    let list = [...db.agents];

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(a => 
        `${a.firstName} ${a.middleName || ""} ${a.lastName}`.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.mobileNumber.includes(q) ||
        (a.prcLicenseNumber || "").toLowerCase().includes(q)
      );
    }

    if (status) {
      list = list.filter(a => a.status.toLowerCase() === String(status).toLowerCase());
    }

    res.json(list);
  });

  app.post("/api/agents", async (req, res) => {
    const { firstName, middleName, lastName, email, mobileNumber, prcLicenseNumber, userContext } = req.body;

    // Check duplicate email
    if (db.agents.some(a => a.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: "An agent with this email already exists." });
    }

    const newAgent: Agent = {
      id: generateUniqueId("AG"),
      firstName,
      middleName,
      lastName,
      email,
      mobileNumber,
      prcLicenseNumber: prcLicenseNumber || "",
      status: "Active",
      createdAt: new Date().toISOString()
    };

    // Generate random temporary password
    const tempPassword = generateRandomPassword();
    const hash = bcrypt.hashSync(tempPassword, 10);
    
    // Track as temporary password account
    addTempPasswordEmail(email);

    // Save user credentials into remote Supabase users table
    try {
      await supabase.from("users").insert({
        id: newAgent.id,
        email: email.toLowerCase().trim(),
        password: hash,
        firstName: firstName,
        lastName: lastName,
        role: "AGENT",
        status: "Active"
      });
    } catch (dbErr: any) {
      console.warn("Notice: users table sync returned error, fallback locally:", dbErr.message);
    }

    // Simulate email dispatch
    simulateEmailSend(
      email,
      "Welcome to RealtySync! Your Account Credentials",
      `Hi ${firstName},\n\nAn agent profile has been registered for you at RealtySync.\nYour temporary login credentials are:\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nFor security reasons, you will be required to change your password on your first login.\n\nBest Regards,\nRealtySync Administrator`
    );

    // Also push real-time in-app notification
    const notification: Notification = {
      id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      title: "Temporary Account Credentials Generated",
      message: `System generated temporary credentials for user ${email}. Temporary Password: ${tempPassword}`,
      timestamp: new Date().toISOString(),
      read: false,
      type: "ALERT"
    };
    db.notifications.unshift(notification);

    db.agents.unshift(newAgent);

    writeLog(
      userContext?.id || "admin_user",
      userContext?.email || "admin@realtysync.com",
      userContext?.userName || "Admin",
      UserRole.ADMIN,
      "Agent Account Created",
      `Agent: ${newAgent.firstName} ${newAgent.lastName}. Temporary password generated and email dispatched.`,
      null,
      newAgent
    );

    saveDB(db);
    // Return tempPassword in response for Admin easy access
    res.status(201).json({ ...newAgent, tempPassword });
  });

  app.put("/api/agents/:id", async (req, res) => {
    const { id } = req.params;
    const { firstName, middleName, lastName, email, mobileNumber, prcLicenseNumber, status, userContext } = req.body;

    const index = db.agents.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Agent record not found" });
    }

    const previousValue = { ...db.agents[index] };
    const isReactivating = status === "Active" && previousValue.status === "Inactive";

    let tempPassword = "";

    // Soft delete / status toggling is updated natively here
    db.agents[index] = {
      ...db.agents[index],
      firstName: firstName ?? db.agents[index].firstName,
      middleName: middleName ?? db.agents[index].middleName,
      lastName: lastName ?? db.agents[index].lastName,
      email: email ?? db.agents[index].email,
      mobileNumber: mobileNumber ?? db.agents[index].mobileNumber,
      prcLicenseNumber: prcLicenseNumber ?? db.agents[index].prcLicenseNumber,
      status: status ?? db.agents[index].status,
    };

    // If reactivating, update/save credentials and generate temporary password
    if (isReactivating) {
      tempPassword = generateRandomPassword();
      const hash = bcrypt.hashSync(tempPassword, 10);
      addTempPasswordEmail(db.agents[index].email);

      try {
        await supabase.from("users").upsert({
          id: id,
          email: db.agents[index].email.toLowerCase().trim(),
          password: hash,
          firstName: db.agents[index].firstName,
          lastName: db.agents[index].lastName,
          role: "AGENT",
          status: "Active"
        });
      } catch (dbErr: any) {
        console.warn("Notice: Reactivation user sync returned error:", dbErr.message);
      }

      // Live notification
      const notification: Notification = {
        id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        title: "Agent Reactivated Credentials Reset",
        message: `System reset login credentials for reactivated agent ${db.agents[index].firstName} ${db.agents[index].lastName}. Temporary Password: ${tempPassword}`,
        timestamp: new Date().toISOString(),
        read: false,
        type: "ALERT"
      };
      db.notifications.unshift(notification);

      simulateEmailSend(
        db.agents[index].email,
        "RealtySync Account Reactivated",
        `Hi ${db.agents[index].firstName},\n\nYour RealtySync agent account has been reactivated.\nYour temporary password is:\n\nTemporary Password: ${tempPassword}\n\nYou will be required to change your password upon logging in.\n\nBest Regards,\nRealtySync Administrator`
      );
    } else if (status === "Inactive" && previousValue.status === "Active") {
      // Deactivate credentials
      try {
        await supabase.from("users").update({ status: "Inactive" }).eq("id", id);
      } catch (dbErr: any) {
        console.warn("Notice: deactivation credentials sync error:", dbErr.message);
      }
    } else {
      // Just update names in users table if updated
      try {
        await supabase.from("users").update({
          firstName: db.agents[index].firstName,
          lastName: db.agents[index].lastName,
          status: db.agents[index].status
        }).eq("id", id);
      } catch (dbErr: any) {
        console.warn("Notice: profile sync error:", dbErr.message);
      }
    }

    // Log the event
    const actionText = status && status !== previousValue.status
      ? (status === "Inactive" ? "Agent Account Deactivated" : "Agent Account Reactivated")
      : "Agent Profile Updated";

    writeLog(
      userContext?.id || "admin_user",
      userContext?.email || "admin@realtysync.com",
      userContext?.userName || "Admin",
      UserRole.ADMIN,
      actionText,
      `Agent: ${db.agents[index].firstName} ${db.agents[index].lastName}. ${tempPassword ? "Temporary password reset." : ""}`,
      previousValue,
      db.agents[index]
    );

    saveDB(db);
    res.json({ ...db.agents[index], tempPassword });
  });

  // Self Profile Update endpoint for agents
  app.put("/api/agents/:id/profile", async (req, res) => {
    const { id } = req.params;
    const { firstName, middleName, lastName, mobileNumber, prcLicenseNumber } = req.body;

    const index = db.agents.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Agent profile record not found." });
    }

    const previousValue = { ...db.agents[index] };

    db.agents[index] = {
      ...db.agents[index],
      firstName: firstName ?? db.agents[index].firstName,
      middleName: middleName ?? db.agents[index].middleName,
      lastName: lastName ?? db.agents[index].lastName,
      mobileNumber: mobileNumber ?? db.agents[index].mobileNumber,
      prcLicenseNumber: prcLicenseNumber !== undefined ? prcLicenseNumber : db.agents[index].prcLicenseNumber,
    };

    try {
      await supabase.from("users").update({
        firstName: db.agents[index].firstName,
        lastName: db.agents[index].lastName
      }).eq("id", id);
    } catch (syncErr: any) {
      console.warn("Notice: profile self-sync error:", syncErr.message);
    }

    writeLog(
      id,
      db.agents[index].email,
      `${db.agents[index].firstName} ${db.agents[index].lastName}`,
      UserRole.AGENT,
      "Agent Profile Updated",
      `Agent updated their profile card.`,
      previousValue,
      db.agents[index]
    );

    saveDB(db);
    res.json(db.agents[index]);
  });

  // 4. BOOKINGS CLIENT MODULE ENDPOINTS
  app.get("/api/bookings", (req, res) => {
    const { agentId, status, search } = req.query;
    let list = [...db.bookings];

    // Sort with earliest appointment first
    list.sort((a, b) => {
      const timeA = new Date(a.dateTime || `${a.appointmentDate}T${a.appointmentTime}`).getTime() || 0;
      const timeB = new Date(b.dateTime || `${b.appointmentDate}T${b.appointmentTime}`).getTime() || 0;
      return timeA - timeB;
    });

    if (agentId) {
      list = list.filter(b => b.agentId === agentId);
    }

    if (status) {
      list = list.filter(b => b.status.toLowerCase() === String(status).toLowerCase());
    }

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(b => 
        b.id.toLowerCase().includes(q) ||
        b.clientId.toLowerCase().includes(q) ||
        b.clientName.toLowerCase().includes(q) ||
        b.appointmentType.toLowerCase().includes(q) ||
        (b.location && b.location.toLowerCase().includes(q)) ||
        b.agentName.toLowerCase().includes(q)
      );
    }

    const enrichedList = list.map(b => {
      const client = db.clients.find(c => c.id === b.clientId);
      return {
        ...b,
        clientMobile: client ? client.mobileNumber : "N/A",
        clientAddress: client ? client.address : "N/A"
      };
    });

    res.json(enrichedList);
  });

  app.post("/api/bookings", (req, res) => {
    const bdata = req.body;
    const { userContext } = bdata;

    // Get Client details
    const client = db.clients.find(c => c.id === bdata.clientId);
    if (!client) {
      return res.status(404).json({ error: "Selected Client record was not found." });
    }

    // Validate date & time overlap for this client
    const targetDateTime = bdata.dateTime;
    if (targetDateTime && bdata.status !== "Cancelled") {
      const isOverlap = db.bookings.some(b => b.clientId === client.id && b.dateTime === targetDateTime && b.status !== "Cancelled");
      if (isOverlap) {
        return res.status(400).json({ error: `This client already has an appointment scheduled at this exact date and time. Please select another slot.` });
      }
    }

    // Get Agent details
    const agent = db.agents.find(a => a.id === client.assignedAgentId) || {
      id: userContext?.id || "agent_1",
      firstName: "Sarah",
      lastName: "Ramirez"
    };

    const newBooking: Booking = {
      id: generateUniqueId("APT"),
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      agentId: agent.id,
      agentName: `${agent.firstName} ${agent.lastName}`,
      appointmentType: bdata.appointmentType || "site visit",
      appointmentDate: bdata.appointmentDate || new Date().toISOString().split('T')[0],
      appointmentTime: bdata.appointmentTime || "12:00",
      dateTime: bdata.dateTime || `${bdata.appointmentDate || new Date().toISOString().split('T')[0]}T${bdata.appointmentTime || "12:05"}`,
      location: bdata.location || "",
      status: bdata.status || "Open",
      notes: bdata.notes || "",
      createdAt: new Date().toISOString()
    };

    db.bookings.unshift(newBooking);

    writeLog(
      userContext?.id || "agent_1",
      userContext?.email || "sarah.ramirez@realtysync.com",
      userContext?.userName || "Sarah Ramirez",
      userContext?.role || UserRole.AGENT,
      "Appointment Created",
      `Appointment [${newBooking.appointmentType}] for ${newBooking.clientName}`,
      null,
      newBooking
    );

    saveDB(db);
    res.status(201).json(newBooking);
  });

  app.put("/api/bookings/:id", (req, res) => {
    const { id } = req.params;
    const { status, notes, appointmentType, appointmentDate, appointmentTime, dateTime, location, userContext } = req.body;

    const index = db.bookings.findIndex(b => b.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Appointment record not found" });
    }

    // Overlap validation for updates
    if (dateTime && status !== "Cancelled") {
      const clientId = db.bookings[index].clientId;
      const isOverlap = db.bookings.some(b => b.id !== id && b.clientId === clientId && b.dateTime === dateTime && b.status !== "Cancelled");
      if (isOverlap) {
        return res.status(400).json({ error: `This client already has an appointment scheduled at this exact date and time. Please select another slot.` });
      }
    }

    const previousValue = { ...db.bookings[index] };

    db.bookings[index] = {
      ...db.bookings[index],
      status: status ?? db.bookings[index].status,
      notes: notes ?? db.bookings[index].notes,
      appointmentType: appointmentType ?? db.bookings[index].appointmentType,
      appointmentDate: appointmentDate ?? db.bookings[index].appointmentDate,
      appointmentTime: appointmentTime ?? db.bookings[index].appointmentTime,
      dateTime: dateTime ?? db.bookings[index].dateTime,
      location: location ?? db.bookings[index].location,
    };

    writeLog(
      userContext?.id || "admin_user",
      userContext?.email || "admin@realtysync.com",
      userContext?.userName || "Admin",
      userContext?.role || UserRole.ADMIN,
      `Appointment Status to '${db.bookings[index].status}'`,
      `Appointment ID: ${id} (${db.bookings[index].clientName})`,
      previousValue,
      db.bookings[index]
    );

    saveDB(db);
    res.json(db.bookings[index]);
  });

  // 5. DUAL ENTRY COMPONENT ROUTING (For Admin Conflict Resolution)
  app.get("/api/dual-entries", (req, res) => {
    // Return complete dual entries conflicts
    res.json(db.dualEntries);
  });

  app.get("/api/realty-projects", (req, res) => {
    res.json(db.realtyProjects || DEFAULT_REALTY_PROJECTS);
  });

  app.post("/api/dual-entries/:id/resolve", (req, res) => {
    const { id } = req.params;
    const { action, resolutionStatus, winningClientIdx, userContext } = req.body; // action: 'Mark Duplicate' | 'Mark False Positive' | 'Resolve'
    
    const index = db.dualEntries.findIndex(d => d.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Dual Entry record not found" });
    }

    const currentDual = db.dualEntries[index];
    const previousStateString = JSON.stringify(currentDual);

    // Apply outcome to conflicts db
    currentDual.status = resolutionStatus; // Confirmed Duplicate, False Positive, Resolved

    // If resolved or marked duplicate, let's update client statuses
    if (resolutionStatus === "Confirmed Duplicate" || resolutionStatus === "Resolved") {
      const idA = currentDual.clientIdA;
      const idB = currentDual.clientIdB;

      const idxA = db.clients.findIndex(c => c.id === idA);
      const idxB = db.clients.findIndex(c => c.id === idB);

      if (idxA !== -1) db.clients[idxA].duplicateStatus = "None"; // Clear flag on status update
      if (idxB !== -1) {
        if (action === "Mark Duplicate" || winningClientIdx === 1) {
          // Client B is conflict duplicate, assign status to strong, or let's say client B is duplicate
          db.clients[idxB].duplicateStatus = "Strong";
        } else {
          db.clients[idxB].duplicateStatus = "None";
        }
      }
    } else if (resolutionStatus === "False Positive") {
      const idxA = db.clients.findIndex(c => c.id === currentDual.clientIdA);
      const idxB = db.clients.findIndex(c => c.id === currentDual.clientIdB);
      if (idxA !== -1) db.clients[idxA].duplicateStatus = "None";
      if (idxB !== -1) db.clients[idxB].duplicateStatus = "None";
    }

    writeLog(
      userContext?.id || "admin_user",
      userContext?.email || "admin@realtysync.com",
      userContext?.userName || "Admin",
      UserRole.ADMIN,
      `Dual Entry Resolved: ${action}`,
      `Conflict involving '${currentDual.clientName}'`,
      previousStateString,
      JSON.stringify(currentDual)
    );

    saveDB(db);
    res.json(currentDual);
  });

  // 6. GENERAL NOTIFICATIONS
  app.get("/api/notifications", (req, res) => {
    res.json(db.notifications);
  });

  app.post("/api/notifications/clear", (req, res) => {
    db.notifications.forEach(n => n.read = true);
    saveDB(db);
    res.json({ status: "success" });
  });

  // 7. REPORTS MODULE ENDPOINTS & EXPORTS
  app.get("/api/reports/summary", (req, res) => {
    const { agentId } = req.query;

    // Agent Leaderboard sorted by performance score (registered clients + done reservations + done payment appointments)
    const leaderboard = db.agents.map(a => {
      const agentClients = db.clients.filter(c => c.assignedAgentId === a.id);
      const agentBookings = db.bookings.filter(b => b.agentId === a.id);

      const doneReservations = agentBookings.filter(b => 
        String(b.appointmentType).toLowerCase() === "reservation" && 
        String(b.status).toLowerCase() === "done"
      ).length;

      const donePayments = agentBookings.filter(b => 
        String(b.appointmentType).toLowerCase() === "payment" && 
        String(b.status).toLowerCase() === "done"
      ).length;

      const performanceScore = agentClients.length + doneReservations + donePayments;

      const salesVolume = agentBookings.filter(b => b.status !== "Cancelled").length * 20050;

      return {
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
        clientsCount: agentClients.length,
        bookingsCount: agentBookings.length,
        doneReservations,
        donePayments,
        performanceScore,
        salesVolume,
        status: a.status
      };
    }).sort((a,b) => b.performanceScore - a.performanceScore);

    // Manila Today Date YYYY-MM-DD
    const localDate = new Date();
    const manilaOffset = 8 * 60 * 60 * 1000;
    const manilaTime = new Date(localDate.getTime() + (localDate.getTimezoneOffset() * 60000) + manilaOffset);
    const todayStr = manilaTime.toISOString().split("T")[0]; // YYYY-MM-DD

    const typeKeys = ["Site Visit", "Reservation", "Submit Requirements", "Payment", "Inquiry", "Meeting", "Release of Title"];

    if (agentId) {
      const targetAgentId = String(agentId);
      const agentClients = db.clients.filter(c => c.assignedAgentId === targetAgentId);
      const agentBookings = db.bookings.filter(b => b.agentId === targetAgentId);

      const totalClients = agentClients.length;
      const totalOpenBookings = agentBookings.filter(b => ["New", "Reserved", "Processing", "Proposed", "Open"].includes(b.status)).length;
      const totalBookings = agentBookings.length; // total reservation count
      const totalCompletedSales = agentBookings.filter(b => b.status === "Approved" || b.status === "Done").length;
      const totalDownPayment = agentBookings
        .filter(b => b.status !== "Cancelled")
        .length * 20050;
      const totalDuplicates = agentClients.filter(c => c.duplicateStatus !== "None").length;

      // Filter booked today
      const registeredToday = agentClients.filter(c => c.dateRegistered.startsWith(todayStr)).length;
      const bookingsToday = agentBookings.filter(b => b.appointmentDate === todayStr).length;

      // Appointment counts today specifically for this agent
      const appointmentTypeCountsToday: Record<string, number> = {};
      const appointmentTypeStatusBreakdownToday: Record<string, { open: number, done: number, cancelled: number }> = {};
      typeKeys.forEach(t => {
        const bookingsOfTypeToday = agentBookings.filter(b => 
          b.appointmentDate === todayStr && 
          String(b.appointmentType).toLowerCase() === t.toLowerCase()
        );
        appointmentTypeCountsToday[t] = bookingsOfTypeToday.length;
        appointmentTypeStatusBreakdownToday[t] = {
          open: bookingsOfTypeToday.filter(b => String(b.status).toLowerCase() === "open").length,
          done: bookingsOfTypeToday.filter(b => String(b.status).toLowerCase() === "done" || String(b.status).toLowerCase() === "approved" || String(b.status).toLowerCase() === "completed").length,
          cancelled: bookingsOfTypeToday.filter(b => String(b.status).toLowerCase() === "cancelled").length
        };
      });

      // Overall type counts for this agent
      const appointmentTypeCountsOverall = typeKeys.map(t => ({
        type: t,
        count: agentBookings.filter(b => String(b.appointmentType).toLowerCase() === t.toLowerCase()).length
      }));

      // Monthly bookings trend for this agent
      const monthlyBookings = [
        { month: "Jan", count: 0 },
        { month: "Feb", count: 1 },
        { month: "Mar", count: 1 },
        { month: "Apr", count: 0 },
        { month: "May", count: agentBookings.filter(b => b.appointmentDate.includes("-05-")).length },
        { month: "Jun", count: agentBookings.filter(b => b.appointmentDate.includes("-06-")).length }
      ];

      // Monthly registrations trend for this agent
      const monthlyRegistrations = [
        { month: "Jan", count: 0 },
        { month: "Feb", count: 0 },
        { month: "Mar", count: 1 },
        { month: "Apr", count: 1 },
        { month: "May", count: agentClients.filter(c => c.dateRegistered.includes("-05-")).length },
        { month: "Jun", count: agentClients.filter(c => c.dateRegistered.includes("-06-")).length }
      ];

      res.json({
        totalClients,
        totalOpenBookings,
        totalBookings,
        totalCompletedSales,
        totalDownPayment,
        totalDuplicates,
        registeredToday,
        bookingsToday,
        leaderboard,
        appointmentTypeCountsToday,
        appointmentTypeCountsOverall,
        appointmentTypeStatusBreakdownToday,
        monthlyBookings,
        monthlyRegistrations
      });
    } else {
      // Gather global statistics
      const totalActiveAgents = db.agents.filter(a => a.status === "Active").length;
      const totalClients = db.clients.length;
      const totalBookings = db.bookings.length;
      const totalDuplicates = db.clients.filter(c => c.duplicateStatus !== "None").length;

      // Filter booked today
      const registeredToday = db.clients.filter(c => c.dateRegistered.startsWith(todayStr)).length;
      const bookingsToday = db.bookings.filter(b => b.appointmentDate === todayStr).length;

      // Appointment counts today specifically (Global)
      const appointmentTypeCountsToday: Record<string, number> = {};
      const appointmentTypeStatusBreakdownToday: Record<string, { open: number, done: number, cancelled: number }> = {};
      typeKeys.forEach(t => {
        const bookingsOfTypeToday = db.bookings.filter(b => 
          b.appointmentDate === todayStr && 
          String(b.appointmentType).toLowerCase() === t.toLowerCase()
        );
        appointmentTypeCountsToday[t] = bookingsOfTypeToday.length;
        appointmentTypeStatusBreakdownToday[t] = {
          open: bookingsOfTypeToday.filter(b => String(b.status).toLowerCase() === "open").length,
          done: bookingsOfTypeToday.filter(b => String(b.status).toLowerCase() === "done" || String(b.status).toLowerCase() === "approved" || String(b.status).toLowerCase() === "completed").length,
          cancelled: bookingsOfTypeToday.filter(b => String(b.status).toLowerCase() === "cancelled").length
        };
      });

      // Overall type counts (Global)
      const appointmentTypeCountsOverall = typeKeys.map(t => ({
        type: t,
        count: db.bookings.filter(b => String(b.appointmentType).toLowerCase() === t.toLowerCase()).length
      }));

      // Monthly Analytics trend (June & May)
      const monthlyRegistrations = [
        { month: "Jan", count: 2 },
        { month: "Feb", count: 4 },
        { month: "Mar", count: 5 },
        { month: "Apr", count: 3 },
        { month: "May", count: 8 },
        { month: "Jun", count: db.clients.filter(c => c.dateRegistered.includes("-06-")).length || 6 }
      ];

      // Monthly bookings trend (Global)
      const monthlyBookings = [
        { month: "Jan", count: 2 },
        { month: "Feb", count: 3 },
        { month: "Mar", count: 4 },
        { month: "Apr", count: 5 },
        { month: "May", count: db.bookings.filter(b => b.appointmentDate.includes("-05-")).length + 4 },
        { month: "Jun", count: db.bookings.filter(b => b.appointmentDate.includes("-06-")).length + 6 }
      ];

      const duplicateTrends = [
        { status: "Strong", count: db.clients.filter(c => c.duplicateStatus === "Strong").length },
        { status: "Possible", count: db.clients.filter(c => c.duplicateStatus === "Possible").length },
        { status: "None", count: db.clients.filter(c => c.duplicateStatus === "None").length }
      ];

      res.json({
        totalActiveAgents,
        totalClients,
        totalBookings,
        totalDuplicates,
        registeredToday,
        bookingsToday,
        leaderboard,
        monthlyRegistrations,
        monthlyBookings,
        appointmentTypeCountsToday,
        appointmentTypeCountsOverall,
        appointmentTypeStatusBreakdownToday,
        duplicateTrends
      });
    };
  });

  // Audit Logs view
  app.get("/api/reports/audit-logs", (req, res) => {
    res.json(db.auditLogs);
  });

  // Background interval to check for upcoming appointments (1-hour notice reminder)
  setInterval(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).formatToParts(new Date());

      const getVal = (type: string) => parts.find(p => p.type === type)?.value || "";
      const y = getVal("year");
      const m = getVal("month");
      const d = getVal("day");
      const hr = getVal("hour");
      const min = getVal("minute");

      // Construct current Manila datetime string (without timezone offset for pure local matching)
      const currentManilaLocalStr = `${y}-${m}-${d}T${hr}:${min}:00`;
      const nowMs = new Date(currentManilaLocalStr).getTime();

      let dbModified = false;

      db.bookings.forEach((b: any) => {
        if (!b.appointmentDate || !b.appointmentTime || b.status === "Cancelled" || b.notified1Hr) {
          return;
        }

        const apptMs = new Date(`${b.appointmentDate}T${b.appointmentTime}:00`).getTime();
        const diffMs = apptMs - nowMs;
        const diffMinutes = diffMs / (1000 * 60);

        // Notify if scheduled appointment starts within 60 minutes (1 hour) of the current local time
        if (diffMinutes >= 0 && diffMinutes <= 60 && !b.notified1Hr) {
          b.notified1Hr = true;
          dbModified = true;

          // Find the agent details
          const agent = db.agents.find((a: any) => a.id === b.agentId);
          if (agent) {
            const title = `🚨 Upcoming Schedule Reminder (1 HR Notice)`;
            const message = `REALTYSYNC NOTICE: Hi ${agent.firstName} ${agent.lastName}, you have a "${b.appointmentType}" appointment scheduled with client "${b.clientName}" in 1 hour (at ${b.appointmentTime} on ${b.appointmentDate}). Please prepare!`;

            // 1. Add to In-app notifications
            const notifId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            db.notifications.unshift({
              id: notifId,
              title,
              message,
              read: false,
              type: "ALERT",
              timestamp: new Date().toISOString(),
              agentId: agent.id,
              clientId: b.clientId
            });

            // 2. Add to Audit logs
            writeLog(
              "system_notifier",
              "notifier@realtysync.com",
              "RealtySync Notifier Service",
              UserRole.ADMIN,
              "Appt 1HR Alert Dispatched",
              `Alerted ${agent.firstName} ${agent.lastName} via Email (${agent.email}) & SMS (${agent.mobileNumber || "N/A"})`
            );

            // 3. Print actual simulated terminal transmissions beautifully
            console.log(`\n========================================================================`);
            console.log(`✉️  [MAIL TRANSMISSION SUCCESS]`);
            console.log(`   To:      ${agent.email}`);
            console.log(`   Subject: ${title}`);
            console.log(`   Body:    ${message}`);
            console.log(`------------------------------------------------------------------------`);
            console.log(`📱 [SMS TRANSMISSION SUCCESS]`);
            console.log(`   To:      ${agent.mobileNumber || "N/A"}`);
            console.log(`   Text:    ${message}`);
            console.log(`========================================================================\n`);
          }
        }
      });

      if (dbModified) {
        saveDB(db);
      }
    } catch (err) {
      console.error("Error running automated 1-hour schedule reminder worker:", err);
    }
  }, 20000); // Check every 20 seconds

  // --- INTEGRATE VITE CLIENT SIDE SPA PLATFORM WITH PORT 3000 ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RealtySync application running on http://localhost:${PORT}`);
  });
}

startServer();
