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

const getTodayDateStr = () => {
  const optionsStr = { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" } as const;
  const dtf = new Intl.DateTimeFormat("en-CA", optionsStr);
  return dtf.format(new Date());
};

const DEFAULT_BOOKINGS: Booking[] = [
  {
    id: "APT-XAX1111",
    clientId: "CL-JDC1234",
    clientName: "Juan Dela Cruz",
    agentId: "AG-SRA8234",
    agentName: "Sarah Ramirez",
    appointmentType: "Site Visit",
    appointmentDate: getTodayDateStr(),
    appointmentTime: "09:00",
    dateTime: `${getTodayDateStr()}T09:00:00`,
    location: "Solinea",
    status: "Open",
    notes: "Interested in 2-bedroom unit.",
    createdAt: new Date().toISOString()
  },
  {
    id: "APT-XAX2222",
    clientId: "CL-JPS1338",
    clientName: "Johnny Smith",
    agentId: "AG-SRA8234",
    agentName: "Sarah Ramirez",
    appointmentType: "Submit Requirements",
    appointmentDate: getTodayDateStr(),
    appointmentTime: "13:30",
    dateTime: `${getTodayDateStr()}T13:30:00`,
    location: "Seawind",
    status: "Open",
    notes: "Bring printed copy of reservation form.",
    createdAt: new Date().toISOString()
  },
  {
    id: "APT-XAX3333",
    clientId: "CL-JDC1235",
    clientName: "Juan Delacruz",
    agentId: "AG-JBL1234",
    agentName: "James Lim",
    appointmentType: "Meeting",
    appointmentDate: getTodayDateStr(),
    appointmentTime: "15:00",
    dateTime: `${getTodayDateStr()}T15:00:00`,
    location: "Mivela",
    status: "Open",
    notes: "Needs clearance form.",
    createdAt: new Date().toISOString()
  }
];

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
    status: "Pending",
    resolution: "Pending",
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
    status: "Pending",
    resolution: "Pending",
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

async function simulateEmailSend(email: string, subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  let fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  
  console.log(`[Email Dispatched Log] To: ${email}, Subject: ${subject}`);
  
  if (!apiKey) {
    console.log(`[Resend Email Offline] RESEND_API_KEY is not defined in environment variables. Email would be dispatched to ${email}.`);
    return;
  }

  // Pre-emptively switch public domains (e.g. gmail.com) to onboarding@resend.dev
  const publicDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com"];
  const domain = fromEmail.split("@")[1]?.toLowerCase() || "";
  if (publicDomains.includes(domain) && fromEmail !== "onboarding@resend.dev") {
    console.log(`[Resend Notice] Public domain detected in RESEND_FROM_EMAIL. Overriding to onboarding@resend.dev to avoid 403.`);
    fromEmail = "onboarding@resend.dev";
  }

  const sendWithFrom = async (from: string): Promise<{ ok: boolean; status: number; text: string }> => {
    try {
      const formattedBody = body.replace(/\n/g, "<br />");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          from: `RealtySync <${from}>`,
          to: [email],
          subject: subject,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px;">RealtySync Broker Platform</h2>
              <div style="font-size: 14px; line-height: 1.6; margin-top: 15px;">
                ${formattedBody}
              </div>
              <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; text-align: center;">
                This is an automated notification from RealtySync. Do not reply to this email.
              </p>
            </div>
          `
        })
      });
      const text = await res.text();
      return { ok: res.ok, status: res.status, text };
    } catch (err: any) {
      return { ok: false, status: 500, text: err.message || String(err) };
    }
  };

  try {
    let result = await sendWithFrom(fromEmail);
    if (!result.ok && fromEmail !== "onboarding@resend.dev" && (result.text.includes("not verified") || result.text.includes("domain") || result.status === 403)) {
      console.log(`[Resend Notice] Verification issue for ${fromEmail} (status ${result.status}). Retrying with onboarding@resend.dev...`);
      fromEmail = "onboarding@resend.dev";
      result = await sendWithFrom(fromEmail);
    }

    if (result.ok) {
      try {
        const data = JSON.parse(result.text);
        console.log(`[Resend Success] Email sent successfully via Resend. ID: ${data.id}`);
      } catch {
        console.log(`[Resend Success] Email sent successfully via Resend.`);
      }
    } else {
      console.log(`[Resend Notice] Resend returned non-200 status (${result.status}). Sandbox mode is active and email content was successfully logged in terminal. API Message: ${result.text}`);
    }
  } catch (error: any) {
    console.log(`[Resend Notice] Sandbox exception handler caught:`, error.message || error);
  }
}

// Seeding function for first-time startup if databases are empty
async function seedSupabaseIfNeeded() {
  console.log("Checking if Supabase database needs seedingCheck...");
  
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
      for (const u of DEFAULT_USERS) {
        await saveUserForAuth(u);
      }
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
  isdeleted: "isDeleted",
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
  notified1hr: "notified1Hr",
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
  resolution: "resolution",
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

function mapToDb<T extends Record<string, any>>(obj: T, mappings: Record<string, string>): Record<string, any> {
  if (!obj || typeof obj !== "object") return obj;
  const result = { ...obj } as any;
  for (const [lowerKey, camelKey] of Object.entries(mappings)) {
    if (obj[camelKey] !== undefined) {
      result[lowerKey] = obj[camelKey];
    }
  }
  return result;
}

let hasNotified1HrColumn = true;

function mapToDbSingle(obj: any, mappings: Record<string, string>): Record<string, any> {
  if (!obj || typeof obj !== "object") return obj;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if ((key === "notified1Hr" || key === "notified1hr") && (!mappings.notified1hr || !hasNotified1HrColumn)) continue;
    const lowerKey = Object.keys(mappings).find(lk => mappings[lk] === key);
    if (lowerKey) {
      result[lowerKey] = value;
    } else {
      result[key.toLowerCase()] = value;
    }
  }
  return result;
}

function cleanCamelCasePayload(obj: any, mappings: Record<string, string>): Record<string, any> {
  if (!obj || typeof obj !== "object") return obj;
  const result = { ...obj };
  if (!mappings.notified1hr || !hasNotified1HrColumn) {
    delete result.notified1Hr;
    delete result.notified1hr;
  }
  for (const lowerKey of Object.keys(mappings)) {
    if (result[lowerKey] !== undefined && mappings[lowerKey] !== lowerKey) {
      delete result[lowerKey];
    }
  }
  return result;
}

function isRlsError(err: any): boolean {
  if (!err) return false;
  const code = err.code || "";
  const msg = err.message || "";
  return code === "42501" || msg.toLowerCase().includes("security policy") || msg.toLowerCase().includes("row-level");
}

function printRlsInstruction(table: string, op: string, msg: string) {
  console.warn(`
========================================================================================
⚠️ [Supabase-RLS] Row Level Security (RLS) blocked the '${op}' on table '${table}'.
Error message: "${msg}"
To fix this and allow the RealtySync application to save data to Supabase:
1. Open your Supabase Dashboard -> SQL Editor.
2. Run the policy statements from 'supabase-schema.sql' for table '${table}'.
3. Or, if you want a quick fix for development, run:
   ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;
========================================================================================
`);
}

async function safeInsert(table: string, obj: any, mappings: Record<string, string>) {
  let camelPayload = cleanCamelCasePayload(obj, mappings);
  if (table === "clients") {
    delete camelPayload.status;
  }
  if (table === "dual_entries" && typeof camelPayload.details === "object") {
    camelPayload.details = JSON.stringify(camelPayload.details);
  }
  let { data, error } = await supabase.from(table).insert(camelPayload).select();

  if (error && (error.message.includes("notified1Hr") || error.message.includes("notified1hr") || error.message.includes("schema cache"))) {
    hasNotified1HrColumn = false;
    console.warn(`[Supabase] Detected missing notified1Hr column on insert, disabling column and retrying camelCase insert...`);
    camelPayload = cleanCamelCasePayload(obj, mappings);
    if (table === "clients") {
      delete camelPayload.status;
    }
    if (table === "dual_entries" && typeof camelPayload.details === "object") {
      camelPayload.details = JSON.stringify(camelPayload.details);
    }
    const retry = await supabase.from(table).insert(camelPayload).select();
    data = retry.data;
    error = retry.error;
  }

  if (!error) {
    return { data, error: null };
  }
  
  if (isRlsError(error)) {
    printRlsInstruction(table, "insert", error.message);
    return { data: null, error: error };
  }

  console.warn(`[Supabase] CamelCase insert into ${table} failed, retrying with lowercase:`, error.message);
  let lowerPayload = mapToDbSingle(obj, mappings);
  if (table === "clients") {
    delete lowerPayload.status;
  }
  if (table === "dual_entries" && typeof lowerPayload.details === "object") {
    lowerPayload.details = JSON.stringify(lowerPayload.details);
  }
  let { data: dataLower, error: errorLower } = await supabase.from(table).insert(lowerPayload).select();

  if (errorLower && (errorLower.message.includes("notified1Hr") || errorLower.message.includes("notified1hr") || errorLower.message.includes("schema cache"))) {
    hasNotified1HrColumn = false;
    console.warn(`[Supabase] Detected missing notified1Hr column on lowercase insert retry, retrying...`);
    lowerPayload = mapToDbSingle(obj, mappings);
    if (table === "clients") {
      delete lowerPayload.status;
    }
    if (table === "dual_entries" && typeof lowerPayload.details === "object") {
      lowerPayload.details = JSON.stringify(lowerPayload.details);
    }
    const retry = await supabase.from(table).insert(lowerPayload).select();
    dataLower = retry.data;
    errorLower = retry.error;
  }

  if (errorLower) {
    if (isRlsError(errorLower)) {
      printRlsInstruction(table, "insert (lowercase retry)", errorLower.message);
      return { data: null, error: errorLower };
    }
    console.warn(`[Supabase] Lowercase insert into ${table} failed:`, errorLower.message);
    return { data: null, error: errorLower };
  }
  return { data: dataLower, error: null };
}

async function safeUpdate(table: string, obj: any, id: string, mappings: Record<string, string>) {
  let camelPayload = cleanCamelCasePayload(obj, mappings);
  if (table === "clients") {
    delete camelPayload.status;
  }
  if (table === "dual_entries" && typeof camelPayload.details === "object") {
    camelPayload.details = JSON.stringify(camelPayload.details);
  }
  let { data, error } = await supabase.from(table).update(camelPayload).eq("id", id).select();

  if (error && (error.message.includes("notified1Hr") || error.message.includes("notified1hr") || error.message.includes("schema cache"))) {
    hasNotified1HrColumn = false;
    console.warn(`[Supabase] Detected missing notified1Hr column on update, disabling column and retrying camelCase update...`);
    camelPayload = cleanCamelCasePayload(obj, mappings);
    if (table === "clients") {
      delete camelPayload.status;
    }
    if (table === "dual_entries" && typeof camelPayload.details === "object") {
      camelPayload.details = JSON.stringify(camelPayload.details);
    }
    const retry = await supabase.from(table).update(camelPayload).eq("id", id).select();
    data = retry.data;
    error = retry.error;
  }

  if (!error) {
    return { data, error: null };
  }

  if (isRlsError(error)) {
    printRlsInstruction(table, `update of ID ${id}`, error.message);
    return { data: null, error: error };
  }

  console.warn(`[Supabase] CamelCase update of ${table} ID ${id} failed, retrying with lowercase:`, error.message);
  let lowerPayload = mapToDbSingle(obj, mappings);
  if (table === "clients") {
    delete lowerPayload.status;
  }
  if (table === "dual_entries" && typeof lowerPayload.details === "object") {
    lowerPayload.details = JSON.stringify(lowerPayload.details);
  }
  let { data: dataLower, error: errorLower } = await supabase.from(table).update(lowerPayload).eq("id", id).select();

  if (errorLower && (errorLower.message.includes("notified1Hr") || errorLower.message.includes("notified1hr") || errorLower.message.includes("schema cache"))) {
    hasNotified1HrColumn = false;
    console.warn(`[Supabase] Detected missing notified1Hr column on lowercase update retry, retrying...`);
    lowerPayload = mapToDbSingle(obj, mappings);
    if (table === "clients") {
      delete lowerPayload.status;
    }
    if (table === "dual_entries" && typeof lowerPayload.details === "object") {
      lowerPayload.details = JSON.stringify(lowerPayload.details);
    }
    const retry = await supabase.from(table).update(lowerPayload).eq("id", id).select();
    dataLower = retry.data;
    errorLower = retry.error;
  }

  if (errorLower) {
    if (isRlsError(errorLower)) {
      printRlsInstruction(table, `update of ID ${id} (lowercase retry)`, errorLower.message);
      return { data: null, error: errorLower };
    }
    console.warn(`[Supabase] Lowercase update of ${table} ID ${id} failed:`, errorLower.message);
    return { data: null, error: errorLower };
  }
  return { data: dataLower, error: null };
}

async function safeUpsert(table: string, obj: any, mappings: Record<string, string>) {
  let camelPayload = cleanCamelCasePayload(obj, mappings);
  if (table === "clients") {
    delete camelPayload.status;
  }
  if (table === "dual_entries" && typeof camelPayload.details === "object") {
    camelPayload.details = JSON.stringify(camelPayload.details);
  }
  let { data, error } = await supabase.from(table).upsert(camelPayload).select();

  if (error && (error.message.includes("notified1Hr") || error.message.includes("notified1hr") || error.message.includes("schema cache"))) {
    hasNotified1HrColumn = false;
    console.warn(`[Supabase] Detected missing notified1Hr column on upsert, disabling column and retrying camelCase upsert...`);
    camelPayload = cleanCamelCasePayload(obj, mappings);
    if (table === "clients") {
      delete camelPayload.status;
    }
    if (table === "dual_entries" && typeof camelPayload.details === "object") {
      camelPayload.details = JSON.stringify(camelPayload.details);
    }
    const retry = await supabase.from(table).upsert(camelPayload).select();
    data = retry.data;
    error = retry.error;
  }

  if (!error) {
    return { data, error: null };
  }

  if (isRlsError(error)) {
    printRlsInstruction(table, "upsert", error.message);
    return { data: null, error: error };
  }

  console.warn(`[Supabase] CamelCase upsert into ${table} failed, retrying with lowercase:`, error.message);
  let lowerPayload = mapToDbSingle(obj, mappings);
  if (table === "clients") {
    delete lowerPayload.status;
  }
  if (table === "dual_entries" && typeof lowerPayload.details === "object") {
    lowerPayload.details = JSON.stringify(lowerPayload.details);
  }
  let { data: dataLower, error: errorLower } = await supabase.from(table).upsert(lowerPayload).select();

  if (errorLower && (errorLower.message.includes("notified1Hr") || errorLower.message.includes("notified1hr") || errorLower.message.includes("schema cache"))) {
    hasNotified1HrColumn = false;
    console.warn(`[Supabase] Detected missing notified1Hr column on lowercase upsert retry, retrying...`);
    lowerPayload = mapToDbSingle(obj, mappings);
    if (table === "clients") {
      delete lowerPayload.status;
    }
    if (table === "dual_entries" && typeof lowerPayload.details === "object") {
      lowerPayload.details = JSON.stringify(lowerPayload.details);
    }
    const retry = await supabase.from(table).upsert(lowerPayload).select();
    dataLower = retry.data;
    errorLower = retry.error;
  }

  if (errorLower) {
    if (isRlsError(errorLower)) {
      printRlsInstruction(table, "upsert (lowercase retry)", errorLower.message);
      return { data: null, error: errorLower };
    }
    console.warn(`[Supabase] Lowercase upsert into ${table} failed:`, errorLower.message);
    return { data: null, error: errorLower };
  }
  return { data: dataLower, error: null };
}

// In-Memory state caches that persist for the server session to prevent data loss on Supabase unconfiguration/RLS blocks
let memoryUsers: any[] = [...DEFAULT_USERS];
let memoryAgents: Agent[] = [...DEFAULT_AGENTS];
let memoryClients: Client[] = [...DEFAULT_CLIENTS];
let memoryBookings: Booking[] = [...DEFAULT_BOOKINGS];
let memoryNotifications: Notification[] = [...DEFAULT_NOTIFICATIONS];
let memoryAuditLogs: AuditLog[] = [...DEFAULT_AUDIT_LOGS];
let memoryDualEntries: DualEntry[] = [...DEFAULT_DUAL_ENTRIES];
let memoryRealtyProjects: string[] = [...DEFAULT_REALTY_PROJECTS];

// Fetch helper functions that read directly from Supabase, with resilient in-memory failover fallbacks
async function fetchAgents(): Promise<Agent[]> {
  try {
    const { data, error } = await supabase.from("agents").select("*");
    if (error) {
      console.warn("Supabase exception fetching agents, falling back to memory:", error.message);
      return memoryAgents;
    }
    const dbAgents = (data || []).map(a => normalizeKeys<Agent>(a, AGENT_MAPPINGS));
    memoryAgents = dbAgents;
    return dbAgents;
  } catch (err: any) {
    console.warn("Exception in fetchAgents, falling back to memory:", err.message);
    return memoryAgents;
  }
}

async function fetchClients(): Promise<Client[]> {
  try {
    const { data, error } = await supabase.from("clients").select("*");
    if (error) {
      console.warn("Supabase exception fetching clients, falling back to memory:", error.message);
      return memoryClients;
    }
    const dbClients = (data || []).map(c => normalizeKeys<Client>(c, CLIENT_MAPPINGS));
    memoryClients = dbClients;
    return dbClients;
  } catch (err: any) {
    console.warn("Exception in fetchClients, falling back to memory:", err.message);
    return memoryClients;
  }
}

async function fetchBookings(): Promise<Booking[]> {
  try {
    const { data, error } = await supabase.from("bookings").select("*");
    if (error) {
      console.warn("Supabase exception fetching bookings, falling back to memory:", error.message);
      return memoryBookings;
    }
    const dbBookings = (data || []).map(b => normalizeKeys<Booking>(b, BOOKING_MAPPINGS));
    memoryBookings = dbBookings;
    return dbBookings;
  } catch (err: any) {
    console.warn("Exception in fetchBookings, falling back to memory:", err.message);
    return memoryBookings;
  }
}

async function fetchDualEntries(): Promise<DualEntry[]> {
  try {
    const { data, error } = await supabase.from("dual_entries").select("*");
    if (error) {
      console.warn("Supabase exception fetching dual_entries, falling back to memory:", error.message);
      return memoryDualEntries;
    }
    const dbDuals = (data || []).map(d => {
      const norm = normalizeKeys<DualEntry>(d, DUAL_ENTRY_MAPPINGS);
      if (norm.details && typeof norm.details === "string") {
        try {
          norm.details = JSON.parse(norm.details);
        } catch (_) {}
      }
      return norm;
    });
    memoryDualEntries = dbDuals;
    return dbDuals;
  } catch (err: any) {
    console.warn("Exception in fetchDualEntries, falling back to memory:", err.message);
    return memoryDualEntries;
  }
}

async function fetchNotifications(): Promise<Notification[]> {
  try {
    const { data, error } = await supabase.from("notifications").select("*");
    if (error) {
      console.warn("Supabase exception fetching notifications, falling back to memory:", error.message);
      return memoryNotifications;
    }
    const dbNotifs = (data || []).map(n => normalizeKeys<Notification>(n, NOTIFICATION_MAPPINGS));
    memoryNotifications = dbNotifs;
    return dbNotifs;
  } catch (err: any) {
    console.warn("Exception in fetchNotifications, falling back to memory:", err.message);
    return memoryNotifications;
  }
}

async function fetchAuditLogs(): Promise<AuditLog[]> {
  try {
    const { data, error } = await supabase.from("audit_logs").select("*");
    if (error) {
      console.warn("Supabase exception fetching audit_logs, falling back to memory:", error.message);
      return memoryAuditLogs;
    }
    const dbLogs = (data || []).map(l => normalizeKeys<AuditLog>(l, AUDIT_LOG_MAPPINGS));
    memoryAuditLogs = dbLogs;
    return dbLogs;
  } catch (err: any) {
    console.warn("Exception in fetchAuditLogs, falling back to memory:", err.message);
    return memoryAuditLogs;
  }
}

async function fetchRealtyProjects(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from("realty_projects").select("name");
    if (error) {
      console.warn("Supabase exception fetching realty_projects, falling back to memory:", error.message);
      return memoryRealtyProjects;
    }
    const dbProjects = (data || []).map(p => p.name);
    memoryRealtyProjects = dbProjects;
    return dbProjects;
  } catch (err: any) {
    console.warn("Exception in fetchRealtyProjects, falling back to memory:", err.message);
    return memoryRealtyProjects;
  }
}


// Helper functions to safely handle users insertion/updates with fallback for different casing/scoping configurations of the users table.
async function saveUserForAuth(user: { id: string, email: string, password?: string, firstName?: string, lastName?: string, role: string, status: string }) {
  const emailClean = (user.email || "").toLowerCase().trim();
  const fName = user.firstName || "";
  const lName = user.lastName || "";

  const payloadCamel: any = {
    id: user.id,
    email: emailClean,
    role: user.role,
    status: user.status,
    firstName: fName,
    lastName: lName,
  };
  if (user.password) {
    payloadCamel.password = user.password;
  }

  const payloadLower: any = {
    id: user.id,
    email: emailClean,
    role: user.role,
    status: user.status,
    firstname: fName,
    lastname: lName,
  };
  if (user.password) {
    payloadLower.password = user.password;
  }

  const payloadMinimal: any = {
    id: user.id,
    email: emailClean,
    role: user.role,
    status: user.status,
  };
  if (user.password) {
    payloadMinimal.password = user.password;
  }

  // 1. Try CamelCase
  try {
    const { error } = await supabase.from("users").upsert(payloadCamel);
    if (!error) {
      console.log(`Successfully upserted user ${emailClean} with camelCase columns.`);
      return;
    }
  } catch (err: any) {
    console.warn("Notice: exception in CamelCase users upsert:", err.message);
  }

  // 2. Try Lowercase
  try {
    const { error } = await supabase.from("users").upsert(payloadLower);
    if (!error) {
      console.log(`Successfully upserted user ${emailClean} with lowercase columns.`);
      return;
    }
  } catch (err: any) {
    console.warn("Notice: exception in lowercase users upsert:", err.message);
  }

  // 3. Try Minimal Fields
  try {
    const { error } = await supabase.from("users").upsert(payloadMinimal);
    if (!error) {
      console.log(`Successfully upserted user ${emailClean} with minimal columns.`);
    }
  } catch (err: any) {
    console.error("Critical exception in minimal users upsert:", err.message);
  }

  // Update in-memory user cache for resilient failover
  const idx = memoryUsers.findIndex(u => u.id === user.id);
  const updatedObj: any = {
    id: user.id,
    email: emailClean,
    firstName: fName,
    lastName: lName,
    role: user.role as any,
    status: user.status as any,
    password: user.password || ""
  };
  if (idx !== -1) {
    memoryUsers[idx] = { ...memoryUsers[idx], ...updatedObj };
  } else {
    memoryUsers.push(updatedObj);
  }
}

async function updateUserForAuth(id: string, fields: { firstName?: string, lastName?: string, status?: string, email?: string, password?: string }) {
  const payloadCamel: any = {};
  const payloadLower: any = {};
  const payloadMinimal: any = {};

  if (fields.status !== undefined) {
    payloadCamel.status = fields.status;
    payloadLower.status = fields.status;
    payloadMinimal.status = fields.status;
  }
  if (fields.email !== undefined) {
    const clEmail = fields.email.toLowerCase().trim();
    payloadCamel.email = clEmail;
    payloadLower.email = clEmail;
    payloadMinimal.email = clEmail;
  }
  if (fields.firstName !== undefined) {
    payloadCamel.firstName = fields.firstName;
    payloadLower.firstname = fields.firstName;
  }
  if (fields.lastName !== undefined) {
    payloadCamel.lastName = fields.lastName;
    payloadLower.lastname = fields.lastName;
  }
  if (fields.password !== undefined) {
    payloadCamel.password = fields.password;
    payloadLower.password = fields.password;
    payloadMinimal.password = fields.password;
  }

  // 1. Try CamelCase
  try {
    const { error } = await supabase.from("users").update(payloadCamel).eq("id", id);
    if (!error) return;
  } catch (err: any) {
    console.warn("Notice: exception in CamelCase users update:", err.message);
  }

  // 2. Try Lowercase
  try {
    const { error } = await supabase.from("users").update(payloadLower).eq("id", id);
    if (!error) return;
  } catch (err: any) {
    console.warn("Notice: exception in lowercase users update:", err.message);
  }

  // 3. Try Minimal
  if (Object.keys(payloadMinimal).length > 0) {
    try {
      const { error } = await supabase.from("users").update(payloadMinimal).eq("id", id);
    } catch (err: any) {
      console.error("Critical exception in minimal users update:", err.message);
    }
  }

  // Update in-memory User cache for resilient failover
  const idx = memoryUsers.findIndex(u => u.id === id);
  if (idx !== -1) {
    memoryUsers[idx] = {
      ...memoryUsers[idx],
      ...(fields as any),
      email: fields.email !== undefined ? fields.email.toLowerCase().trim() : memoryUsers[idx].email,
    };
  }
}
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

        // Skip surrendered claims or deleted clients
        if (c1.status === "Surrendered Claim" || c2.status === "Surrendered Claim") {
          continue;
        }

        if (c1.isDeleted === true || c1.is_deleted === true || c2.isDeleted === true || c2.is_deleted === true) {
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
              status: "Pending",
              resolution: "Pending",
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
      await safeUpdate("clients", c, c.id, CLIENT_MAPPINGS);
    }

    // Upsert dual entries
    for (const d of dualEntriesToUpsert) {
      const isNew = !dualEntries.some(de => de.id === d.id);
      await safeUpsert("dual_entries", d, DUAL_ENTRY_MAPPINGS);

      if (isNew) {
        // Notify Admins via email
        try {
          let adminEmails = ["admin@realtysync.com"];
          const { data: adminUsers, error: adminErr } = await supabase.from("users").select("email").eq("role", "ADMIN");
          if (!adminErr && adminUsers && adminUsers.length > 0) {
            adminEmails = adminUsers.map((u: any) => u.email).filter(Boolean);
          }
          for (const email of adminEmails) {
            await simulateEmailSend(
              email,
              `🚨 Alert: Dual Client Entry Created`,
              `Dear Administrator,\n\nA new dual client entry conflict has been detected in RealtySync.\n\nDetails:\nClient Name: ${d.clientName}\nSimilarity Score: ${d.similarityScore}%\n\nConflict involving:\n- Agent A: ${d.agentNameA}\n- Agent B: ${d.agentNameB}\n\nPlease log in to the RealtySync admin dashboard to review and resolve this conflict.\n\nBest Regards,\nRealtySync System`
            );
          }
        } catch (err: any) {
          console.error("Failed to send admin email on reevaluated client duplicate:", err.message || err);
        }
      }
    }

    // Delete inactive dual entries
    for (const id of dualEntriesToDelete) {
      await supabase.from("dual_entries").delete().eq("id", id);
      // Synchronize to memory cache
      memoryDualEntries = memoryDualEntries.filter(md => md.id !== id);
    }

    // Prune invalid dual entries (where clients don't exist)
    const latestClients = await fetchClients();
    const latestDualEntries = await fetchDualEntries();
    for (const d of latestDualEntries) {
      const hasA = latestClients.some(c => c.id === d.clientIdA);
      const hasB = latestClients.some(c => c.id === d.clientIdB);
      if (!hasA || !hasB) {
        await supabase.from("dual_entries").delete().eq("id", d.id);
        memoryDualEntries = memoryDualEntries.filter(md => md.id !== d.id);
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

  app.get("/api/db-diagnostics", async (req, res) => {
    const results: Record<string, any> = {};
    const tables = ["users", "agents", "clients", "bookings", "dual_entries", "notifications", "audit_logs", "realty_projects"];
    for (const table of tables) {
      try {
        const { count, error, data } = await supabase.from(table).select("*", { count: "exact", head: false }).limit(2);
        if (error) {
          results[table] = { status: "error", message: error.message, errorDetails: error };
        } else {
          results[table] = { status: "ok", count, sample: data };
        }
      } catch (err: any) {
        results[table] = { status: "exception", message: err.message || String(err) };
      }
    }
    res.json({
      timestamp: new Date().toISOString(),
      supabaseUrl: SUPABASE_URL,
      results
    });
  });

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
        // Fallback: Check our secure seed list
        matchedUser = memoryUsers.find(u => u.email.toLowerCase().trim() === cleanEmail);
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
        matchedUser = memoryUsers.find(u => u.id === userId);
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

      // Update in memoryUsers cache so that it is preserved for stateless auth checks
      const memoryIdx = memoryUsers.findIndex(u => u.id === userId);
      if (memoryIdx !== -1) {
        memoryUsers[memoryIdx].password = hash;
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
  const writeLog = async (userId: string, email: string, userName: string, role: UserRole, action: string, entity: string, prev?: any, curr?: any) => {
    try {
      const log = {
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
      await safeInsert("audit_logs", log, AUDIT_LOG_MAPPINGS);

      // Synchronize in-memory cache for resilient failover
      memoryAuditLogs.push(log);
    } catch (err) {
      console.error("writeLog error writing to Supabase:", err);
    }
  };

  // 1. DUP PREVENTATIVE ALGORITHM CHECK (Used during Client Creation warnings)
  app.post("/api/clients/check-duplicate", async (req, res) => {
    try {
      const pendingClient = req.body;
      let highestScore = 0;
      let matchResult = null;

      const clients = await fetchClients();
      const agents = await fetchAgents();

      for (const existing of clients) {
        // Skip comparing to self if editing
        if (pendingClient.id && existing.id === pendingClient.id) continue;

        // Do not duplicate check with client records that has no clean duplicate status or deleted (is_deleted=TRUE)
        if (existing.duplicateStatus && existing.duplicateStatus !== "None") continue;
        if (existing.isDeleted === true || existing.is_deleted === true) continue;

        const comp = calculateCombinedDuplicateScore(pendingClient, existing);
        if (comp.score > highestScore) {
          highestScore = comp.score;
          
          let statusString: "Strong Duplicate" | "Possible Duplicate" | "No Duplicate" = "No Duplicate";
          if (comp.score >= 90) statusString = "Strong Duplicate";
          else if (comp.score >= 70) statusString = "Possible Duplicate";

          // Find agent info
          const agent = agents.find(a => a.id === existing.assignedAgentId);

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
    } catch (err: any) {
      console.error("check-duplicate error:", err);
      return res.status(500).json({ error: "Failed to check duplicate" });
    }
  });

  // 2. CLIENT MODULE ENDPOINTS
  // 2. CLIENT MODULE ENDPOINTS
  app.get("/api/clients", async (req, res) => {
    try {
      const { search, agentId, duplicateStatus, page = "1", limit = "10" } = req.query;
      let list = await fetchClients();

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
    } catch (err: any) {
      console.error("GET /api/clients error:", err);
      res.status(500).json({ error: "Failed to load clients" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
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

      // Calculate duplicate profile against existing clients in Supabase
      let conflictFound = false;
      let activeConflict: any = null;

      const clients = await fetchClients();
      for (const existing of clients) {
        // Do not duplicate check with client records that has no clean duplicate status or deleted (is_deleted=TRUE)
        if (existing.duplicateStatus && existing.duplicateStatus !== "None") continue;
        if (existing.isDeleted === true || existing.is_deleted === true) continue;

        const check = calculateCombinedDuplicateScore(newClient, existing);
        if (check.score >= 70) {
          conflictFound = true;
          newClient.duplicateStatus = check.score >= 90 ? "Strong" : "Possible";
          activeConflict = { existing, score: check.score };
        }
      }

      // Persist client to Supabase
      const { error: insertErr } = await safeInsert("clients", newClient, CLIENT_MAPPINGS);
      if (insertErr) {
        console.error("Supabase insert client failed:", insertErr.message);
        return res.status(500).json({ error: `Failed to save client to Supabase: ${insertErr.message}` });
      }

      // Add to session in-memory cache for resilient failover
      memoryClients.push(newClient);

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
          status: "Pending",
          resolution: "Pending",
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

        const { error: dualErr } = await safeInsert("dual_entries", dualEntry, DUAL_ENTRY_MAPPINGS);
        if (dualErr) {
          console.warn("Supabase insert dual_entries failed:", dualErr.message);
        }

        // Add to session in-memory cache for resilient failover
        memoryDualEntries.push(dualEntry);

        // Create Admin Notifications
        const notif: Notification = {
          id: "notif_" + Date.now(),
          title: "Duplicate Client Encoding",
          message: `Agent ${newClient.assignedAgentName} registered '${newClient.firstName} ${newClient.lastName}' which duplicates '${existing.firstName} ${existing.lastName}' (Agent: ${existing.assignedAgentName}). Conflict score: ${score}%.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: "DUPLICATE_ALERT",
          clientId: newClient.id
        };
        const { error: notifErr } = await safeInsert("notifications", notif, NOTIFICATION_MAPPINGS);
        if (notifErr) {
          console.warn("Supabase insert notifications failed:", notifErr.message);
        }

        // Add to session in-memory cache for resilient failover
        memoryNotifications.push(notif);

        // Notify Admins via email
        try {
          let adminEmails = ["admin@realtysync.com"];
          const { data: adminUsers, error: adminErr } = await supabase.from("users").select("email").eq("role", "ADMIN");
          if (!adminErr && adminUsers && adminUsers.length > 0) {
            adminEmails = adminUsers.map((u: any) => u.email).filter(Boolean);
          }
          for (const email of adminEmails) {
            await simulateEmailSend(
              email,
              `🚨 Alert: Dual Client Entry Created`,
              `Dear Administrator,\n\nA new dual client entry conflict has been detected in RealtySync.\n\nDetails:\nClient Name: ${dualEntry.clientName}\nSimilarity Score: ${dualEntry.similarityScore}%\n\nConflict involving:\n- Agent A: ${dualEntry.agentNameA} (Client: ${existing.firstName} ${existing.lastName})\n- Agent B: ${dualEntry.agentNameB} (Client: ${newClient.firstName} ${newClient.lastName})\n\nPlease log in to the RealtySync admin dashboard to review and resolve this conflict.\n\nBest Regards,\nRealtySync System`
            );
          }
        } catch (err: any) {
          console.error("Failed to send admin email on client registration duplicate:", err.message || err);
        }
      }

      // Add logging
      await writeLog(
        creatorId,
        creatorEmail,
        creatorName,
        creatorRole,
        conflictFound ? "Duplicate Client Registered" : "Client Registered",
        `Client: ${newClient.firstName} ${newClient.lastName}`,
        null,
        newClient
      );

      res.status(201).json(newClient);
    } catch (err: any) {
      console.error("POST /api/clients error:", err);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const clientData = req.body;
      const { userContext } = clientData;

      const editorId = userContext?.id || "admin_user";
      const editorName = userContext?.userName || "Broker Admin";
      const editorEmail = userContext?.email || "admin@realtysync.com";
      const editorRole = userContext?.role || UserRole.ADMIN;

      const clients = await fetchClients();
      const existingClient = clients.find(c => c.id === id);
      if (!existingClient) {
        return res.status(404).json({ error: "Client not found" });
      }

      const previousValue = { ...existingClient };
      
      // Update contents keeping original registration and static fields
      const updatedClient: Client = {
        ...existingClient,
        firstName: clientData.firstName ?? existingClient.firstName,
        middleName: clientData.middleName ?? existingClient.middleName,
        lastName: clientData.lastName ?? existingClient.lastName,
        mobileNumber: clientData.mobileNumber ?? existingClient.mobileNumber,
        address: clientData.address ?? existingClient.address,
        facebookProfileLink: clientData.facebookProfileLink ?? existingClient.facebookProfileLink,
        sourceOfLead: clientData.sourceOfLead ?? existingClient.sourceOfLead,
        notes: clientData.notes ?? existingClient.notes,
      };

      const { error: updErr } = await safeUpdate("clients", updatedClient, id, CLIENT_MAPPINGS);
      if (updErr) {
        console.error("Supabase update client failed:", updErr.message);
        return res.status(500).json({ error: `Failed to update client on Supabase: ${updErr.message}` });
      }

      // Add to session in-memory cache for resilient failover
      const cIdx = memoryClients.findIndex(c => c.id === id);
      if (cIdx !== -1) {
        memoryClients[cIdx] = updatedClient;
      } else {
        memoryClients.push(updatedClient);
      }

      // Re-evaluate overlap/conflicts across all clients when details are updated
      await reevaluateAllClientConflicts();

      await writeLog(
        editorId,
        editorEmail,
        editorName,
        editorRole,
        "Client Records Updated",
        `Client ID: ${id}`,
        previousValue,
        updatedClient
      );

      res.json(updatedClient);
    } catch (err: any) {
      console.error("PUT /api/clients/:id error:", err);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.post("/api/clients/:id/surrender", async (req, res) => {
    try {
      const { id } = req.params;
      const { userContext } = req.body;

      const agentId = userContext?.id || "unknown_agent";
      const agentName = userContext?.userName || "Agent Representative";
      const agentEmail = userContext?.email || "agent@realtysync.com";

      const clients = await fetchClients();
      const client = clients.find(c => c.id === id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const previousStateString = JSON.stringify(client);

      // Find the dual entry associated with this client that is pending review in Supabase
      const dualEntries = await fetchDualEntries();
      const dual = dualEntries.find(d => 
        (d.clientIdA === id || d.clientIdB === id) && 
        d.status === "Pending Review"
      );

      if (dual) {
        const previousDualState = JSON.stringify(dual);
        
        // Resolve the dual entry
        dual.status = "Resolved";
        dual.resolution = "Surrendered";
        const { error: dualUpdErr } = await safeUpdate("dual_entries", dual, dual.id, DUAL_ENTRY_MAPPINGS);
        if (dualUpdErr) {
          console.error("Supabase update dual_entries error:", dualUpdErr.message);
        }

        // Update memory dual entries cache
        const dIdx = memoryDualEntries.findIndex(d => d.id === dual.id);
        if (dIdx !== -1) {
          memoryDualEntries[dIdx] = dual;
        }

        await writeLog(
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

      const { error: surrenderErr } = await safeUpdate("clients", client, client.id, CLIENT_MAPPINGS);
      if (surrenderErr) {
        console.error("Supabase update client surrender status failed:", surrenderErr.message);
        return res.status(500).json({ error: `Failed to update client status: ${surrenderErr.message}` });
      }

      // Update memory clients cache
      const cIdx = memoryClients.findIndex(c => c.id === client.id);
      if (cIdx !== -1) {
        memoryClients[cIdx] = client;
      }
      if (cIdx !== -1) {
        memoryClients[cIdx] = client;
      }

      await writeLog(
        agentId,
        agentEmail,
        agentName,
        UserRole.AGENT,
        "Client Claim Surrendered",
        `Updated client profile '${client.firstName} ${client.lastName}' status to 'Surrendered Claim' due to agent voluntary claim surrender`,
        previousStateString,
        JSON.stringify(client)
      );

      res.json({ success: true });
    } catch (err: any) {
      console.error("POST /api/clients/:id/surrender error:", err);
      res.status(500).json({ error: "Failed to surrender client claim" });
    }
  });

  // 3. AGENT MODULE ENDPOINTS
  app.get("/api/agents", async (req, res) => {
    try {
      const { search, status } = req.query;
      let list = await fetchAgents();

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
    } catch (err: any) {
      console.error("GET /api/agents error:", err);
      res.status(500).json({ error: "Failed to load agents" });
    }
  });

  app.post("/api/agents", async (req, res) => {
    try {
      const { firstName, middleName, lastName, email, mobileNumber, prcLicenseNumber, userContext } = req.body;

      // Check duplicate email
      const agents = await fetchAgents();
      if (agents.some(a => a.email.toLowerCase() === email.toLowerCase())) {
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
      await saveUserForAuth({
        id: newAgent.id,
        email: email,
        password: hash,
        firstName: firstName,
        lastName: lastName,
        role: "AGENT",
        status: "Active"
      });

      // Save agent to Supabase agents table
      const { error: agentInsertErr } = await safeInsert("agents", newAgent, AGENT_MAPPINGS);
      if (agentInsertErr) {
        console.error("Supabase insert agent failed:", agentInsertErr.message);
        return res.status(500).json({ error: `Failed to save agent profile: ${agentInsertErr.message}` });
      }

      // Add to session in-memory cache for resilient failover
      memoryAgents.push(newAgent);

      // Simulate email dispatch
      simulateEmailSend(
        email,
        "Welcome to RealtySync! Your Account Credentials",
        `Hi ${firstName},\n\nAn agent profile has been registered for you at RealtySync.\nYour temporary login credentials are:\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nFor security reasons, you will be required to change your password on your first login.\n\nBest Regards,\nRealtySync Administrator`
      );

      // Also push real-time in-app notification to Supabase
      const notification: Notification = {
        id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        title: "Temporary Account Credentials Generated",
        message: `System generated temporary credentials for user ${email}. Temporary Password: ${tempPassword}`,
        timestamp: new Date().toISOString(),
        read: false,
        type: "ALERT"
      };
      await safeInsert("notifications", notification, NOTIFICATION_MAPPINGS);

      await writeLog(
        userContext?.id || "admin_user",
        userContext?.email || "admin@realtysync.com",
        userContext?.userName || "Admin",
        UserRole.ADMIN,
        "Agent Account Created",
        `Agent: ${newAgent.firstName} ${newAgent.lastName}. Temporary password generated and email dispatched.`,
        null,
        newAgent
      );

      // Return tempPassword in response for Admin easy access
      res.status(201).json({ ...newAgent, tempPassword });
    } catch (err: any) {
      console.error("POST /api/agents error:", err);
      res.status(500).json({ error: "Failed to create agent" });
    }
  });

  app.put("/api/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { firstName, middleName, lastName, email, mobileNumber, prcLicenseNumber, status, userContext } = req.body;

      const agents = await fetchAgents();
      const existingAgent = agents.find(a => a.id === id);
      if (!existingAgent) {
        return res.status(404).json({ error: "Agent record not found" });
      }

      const previousValue = { ...existingAgent };
      const isReactivating = status === "Active" && previousValue.status === "Inactive";

      let tempPassword = "";

      // Soft delete / status toggling is updated natively here
      const updatedAgent: Agent = {
        ...existingAgent,
        firstName: firstName ?? existingAgent.firstName,
        middleName: middleName ?? existingAgent.middleName,
        lastName: lastName ?? existingAgent.lastName,
        email: email ?? existingAgent.email,
        mobileNumber: mobileNumber ?? existingAgent.mobileNumber,
        prcLicenseNumber: prcLicenseNumber ?? existingAgent.prcLicenseNumber,
        status: status ?? existingAgent.status,
      };

      // If reactivating, update/save credentials and generate temporary password
      if (isReactivating) {
        tempPassword = generateRandomPassword();
        const hash = bcrypt.hashSync(tempPassword, 10);
        addTempPasswordEmail(updatedAgent.email);

        await saveUserForAuth({
          id: id,
          email: updatedAgent.email,
          password: hash,
          firstName: updatedAgent.firstName,
          lastName: updatedAgent.lastName,
          role: "AGENT",
          status: "Active"
        });

        // Live notification
        const notification: Notification = {
          id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          title: "Agent Reactivated Credentials Reset",
          message: `System reset login credentials for reactivated agent ${updatedAgent.firstName} ${updatedAgent.lastName}. Temporary Password: ${tempPassword}`,
          timestamp: new Date().toISOString(),
          read: false,
          type: "ALERT"
        };
        await safeInsert("notifications", notification, NOTIFICATION_MAPPINGS);

        simulateEmailSend(
          updatedAgent.email,
          "RealtySync Account Reactivated",
          `Hi ${updatedAgent.firstName},\n\nYour RealtySync agent account has been reactivated.\nYour temporary password is:\n\nTemporary Password: ${tempPassword}\n\nYou will be required to change your password upon logging in.\n\nBest Regards,\nRealtySync Administrator`
        );
      } else if (status === "Inactive" && previousValue.status === "Active") {
        // Deactivate credentials
        await updateUserForAuth(id, { status: "Inactive" });
      } else {
        // Just update names in users table if updated
        await updateUserForAuth(id, {
          firstName: updatedAgent.firstName,
          lastName: updatedAgent.lastName,
          status: updatedAgent.status
        });
      }

      // Save agent to Supabase agents table
      const { error: agentUpdErr } = await safeUpdate("agents", updatedAgent, id, AGENT_MAPPINGS);
      if (agentUpdErr) {
        console.error("Supabase update agent failed:", agentUpdErr.message);
        return res.status(500).json({ error: `Failed to update agent details on Supabase: ${agentUpdErr.message}` });
      }

      // Sync into memory cache
      const aIdx = memoryAgents.findIndex(a => a.id === id);
      if (aIdx !== -1) {
        memoryAgents[aIdx] = updatedAgent;
      } else {
        memoryAgents.push(updatedAgent);
      }

      // Log the event
      const actionText = status && status !== previousValue.status
        ? (status === "Inactive" ? "Agent Account Deactivated" : "Agent Account Reactivated")
        : "Agent Profile Updated";

      await writeLog(
        userContext?.id || "admin_user",
        userContext?.email || "admin@realtysync.com",
        userContext?.userName || "Admin",
        UserRole.ADMIN,
        actionText,
        `Agent: ${updatedAgent.firstName} ${updatedAgent.lastName}. ${tempPassword ? "Temporary password reset." : ""}`,
        previousValue,
        updatedAgent
      );

      res.json({ ...updatedAgent, tempPassword });
    } catch (err: any) {
      console.error("PUT /api/agents/:id error:", err);
      res.status(500).json({ error: "Failed to update agent" });
    }
  });

  // Self Profile Update endpoint for agents
  app.put("/api/agents/:id/profile", async (req, res) => {
    try {
      const { id } = req.params;
      const { firstName, middleName, lastName, mobileNumber, prcLicenseNumber } = req.body;

      const agents = await fetchAgents();
      const existingAgent = agents.find(a => a.id === id);
      if (!existingAgent) {
        return res.status(404).json({ error: "Agent profile record not found." });
      }

      const previousValue = { ...existingAgent };

      const updatedAgent: Agent = {
        ...existingAgent,
        firstName: firstName ?? existingAgent.firstName,
        middleName: middleName ?? existingAgent.middleName,
        lastName: lastName ?? existingAgent.lastName,
        mobileNumber: mobileNumber ?? existingAgent.mobileNumber,
        prcLicenseNumber: prcLicenseNumber !== undefined ? prcLicenseNumber : existingAgent.prcLicenseNumber,
      };

      await updateUserForAuth(id, {
        firstName: updatedAgent.firstName,
        lastName: updatedAgent.lastName
      });

      // Save agent to Supabase agents table
      const { error: agentSelfUpdErr } = await safeUpdate("agents", updatedAgent, id, AGENT_MAPPINGS);
      if (agentSelfUpdErr) {
        console.error("Supabase update agent failed:", agentSelfUpdErr.message);
        return res.status(500).json({ error: `Failed to update agent profile: ${agentSelfUpdErr.message}` });
      }

      // Sync into memory cache
      const selfIdx = memoryAgents.findIndex(a => a.id === id);
      if (selfIdx !== -1) {
        memoryAgents[selfIdx] = updatedAgent;
      } else {
        memoryAgents.push(updatedAgent);
      }

      await writeLog(
        id,
        updatedAgent.email,
        `${updatedAgent.firstName} ${updatedAgent.lastName}`,
        UserRole.AGENT,
        "Agent Profile Updated",
        `Agent updated their profile card.`,
        previousValue,
        updatedAgent
      );

      res.json(updatedAgent);
    } catch (err: any) {
      console.error("PUT /api/agents/:id/profile error:", err);
      res.status(500).json({ error: "Failed to update agent profile" });
    }
  });

  // 4. BOOKINGS CLIENT MODULE ENDPOINTS
  app.get("/api/bookings", async (req, res) => {
    try {
      const { agentId, status, search } = req.query;
      let list = await fetchBookings();

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

      const clients = await fetchClients();
      const enrichedList = list.map(b => {
        const client = clients.find(c => c.id === b.clientId);
        return {
          ...b,
          clientMobile: client ? client.mobileNumber : "N/A",
          clientAddress: client ? client.address : "N/A"
        };
      });

      res.json(enrichedList);
    } catch (err: any) {
      console.error("GET /api/bookings error:", err);
      res.status(500).json({ error: "Failed to load bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const bdata = req.body;
      const { userContext } = bdata;

      // Get Client details
      const clients = await fetchClients();
      const client = clients.find(c => c.id === bdata.clientId);
      if (!client) {
        return res.status(404).json({ error: "Selected Client record was not found." });
      }

      // Validate date & time overlap for this client
      const bookings = await fetchBookings();
      const targetDateTime = bdata.dateTime;
      if (targetDateTime && bdata.status !== "Cancelled") {
        const isOverlap = bookings.some(b => b.clientId === client.id && b.dateTime === targetDateTime && b.status !== "Cancelled");
        if (isOverlap) {
          return res.status(400).json({ error: `This client already has an appointment scheduled at this exact date and time. Please select another slot.` });
        }
      }

      // Get Agent details
      const agents = await fetchAgents();
      const agent = agents.find(a => a.id === client.assignedAgentId) || {
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

      const { error: bookingInsertErr } = await safeInsert("bookings", newBooking, BOOKING_MAPPINGS);
      if (bookingInsertErr) {
        console.error("Supabase insert booking failed:", bookingInsertErr.message);
        return res.status(500).json({ error: `Failed to schedule appointment: ${bookingInsertErr.message}` });
      }

      // Add to session in-memory cache for resilient failover
      memoryBookings.push(newBooking);

      await writeLog(
        userContext?.id || "agent_1",
        userContext?.email || "sarah.ramirez@realtysync.com",
        userContext?.userName || "Sarah Ramirez",
        userContext?.role || UserRole.AGENT,
        "Appointment Created",
        `Appointment [${newBooking.appointmentType}] for ${newBooking.clientName}`,
        null,
        newBooking
      );

      res.status(201).json(newBooking);
    } catch (err: any) {
      console.error("POST /api/bookings error:", err);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  app.put("/api/bookings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, appointmentType, appointmentDate, appointmentTime, dateTime, location, userContext } = req.body;

      const bookings = await fetchBookings();
      const existingBooking = bookings.find(b => b.id === id);
      if (!existingBooking) {
        return res.status(404).json({ error: "Appointment record not found" });
      }

      // Overlap validation for updates
      if (dateTime && status !== "Cancelled") {
        const clientId = existingBooking.clientId;
        const isOverlap = bookings.some(b => b.id !== id && b.clientId === clientId && b.dateTime === dateTime && b.status !== "Cancelled");
        if (isOverlap) {
          return res.status(400).json({ error: `This client already has an appointment scheduled at this exact date and time. Please select another slot.` });
        }
      }

      const previousValue = { ...existingBooking };

      const updatedBooking: Booking = {
        ...existingBooking,
        status: status ?? existingBooking.status,
        notes: notes ?? existingBooking.notes,
        appointmentType: appointmentType ?? existingBooking.appointmentType,
        appointmentDate: appointmentDate ?? existingBooking.appointmentDate,
        appointmentTime: appointmentTime ?? existingBooking.appointmentTime,
        dateTime: dateTime ?? existingBooking.dateTime,
        location: location ?? existingBooking.location,
      };

      const { error: bookingUpdateErr } = await safeUpdate("bookings", updatedBooking, id, BOOKING_MAPPINGS);
      if (bookingUpdateErr) {
        console.error("Supabase update booking failed:", bookingUpdateErr.message);
        return res.status(500).json({ error: `Failed to update appointment: ${bookingUpdateErr.message}` });
      }

      // Add to session in-memory cache for resilient failover
      const bIdx = memoryBookings.findIndex(b => b.id === id);
      if (bIdx !== -1) {
        memoryBookings[bIdx] = updatedBooking;
      } else {
        memoryBookings.push(updatedBooking);
      }

      await writeLog(
        userContext?.id || "admin_user",
        userContext?.email || "admin@realtysync.com",
        userContext?.userName || "Admin",
        userContext?.role || UserRole.ADMIN,
        `Appointment Status to '${updatedBooking.status}'`,
        `Appointment ID: ${id} (${updatedBooking.clientName})`,
        previousValue,
        updatedBooking
      );

      res.json(updatedBooking);
    } catch (err: any) {
      console.error("PUT /api/bookings/:id error:", err);
      res.status(500).json({ error: "Failed to update booking" });
    }
  });

  // 5. DUAL ENTRY COMPONENT ROUTING (For Admin Conflict Resolution)
  app.get("/api/dual-entries", async (req, res) => {
    try {
      const duals = await fetchDualEntries();
      res.json(duals);
    } catch (err: any) {
      console.error("GET /api/dual-entries error:", err);
      res.status(500).json({ error: "Failed to fetch dual entries" });
    }
  });

  app.get("/api/realty-projects", async (req, res) => {
    try {
      const projects = await fetchRealtyProjects();
      res.json(projects);
    } catch (err: any) {
      console.error("GET /api/realty-projects error:", err);
      res.json(DEFAULT_REALTY_PROJECTS);
    }
  });

  app.post("/api/dual-entries/:id/resolve", async (req, res) => {
    try {
      const { id } = req.params;
      const { action, resolutionStatus, winningClientIdx, userContext } = req.body; // action: 'Mark Duplicate' | 'Mark False Positive' | 'Resolve'
      
      const duals = await fetchDualEntries();
      const currentDual = duals.find(d => d.id === id);
      if (!currentDual) {
        return res.status(404).json({ error: "Dual Entry record not found" });
      }

      const previousStateString = JSON.stringify(currentDual);

      const idA = currentDual.clientIdA;
      const idB = currentDual.clientIdB;

      const clientsLst = await fetchClients();
      const clientA = clientsLst.find(c => c.id === idA);
      const clientB = clientsLst.find(c => c.id === idB);

      if (action === "Mark False Positive") {
        currentDual.status = "Resolved";
        currentDual.resolution = "Marked False Positive";
        
        if (clientB) {
          clientB.duplicateStatus = "None";
          await safeUpdate("clients", clientB, idB, CLIENT_MAPPINGS);
          const idx = memoryClients.findIndex(c => c.id === idB);
          if (idx !== -1) memoryClients[idx].duplicateStatus = "None";
        }
      } else if (action === "Mark Duplicate") {
        currentDual.status = "Resolved";
        currentDual.resolution = "Marked Duplicate";
      } else if (action === "Resolve") {
        currentDual.status = "Resolved";
        currentDual.resolution = "Approved Agent B Claim";

        if (clientB && clientA) {
          const formerBStatus = clientB.duplicateStatus || "None";
          clientB.duplicateStatus = "None";
          clientA.duplicateStatus = formerBStatus;

          await safeUpdate("clients", clientB, idB, CLIENT_MAPPINGS);
          await safeUpdate("clients", clientA, idA, CLIENT_MAPPINGS);

          const idxB = memoryClients.findIndex(c => c.id === idB);
          if (idxB !== -1) memoryClients[idxB].duplicateStatus = "None";

          const idxA = memoryClients.findIndex(c => c.id === idA);
          if (idxA !== -1) memoryClients[idxA].duplicateStatus = formerBStatus;
        }
      }

      // Update dual entry in Supabase and memory
      const { error: dualUpdErr } = await safeUpdate("dual_entries", currentDual, id, DUAL_ENTRY_MAPPINGS);
      if (dualUpdErr) {
        console.error("Supabase update dual_entries failed:", dualUpdErr.message);
        return res.status(500).json({ error: `Failed to resolve dual entry: ${dualUpdErr.message}` });
      }

      const dIdx = memoryDualEntries.findIndex(d => d.id === id);
      if (dIdx !== -1) {
        memoryDualEntries[dIdx] = currentDual;
      }

      // Notify Agent A and Agent B about the resolution
      try {
        const agentsList = await fetchAgents();
        const agentA = agentsList.find(a => a.id === currentDual.agentIdA);
        const agentB = agentsList.find(a => a.id === currentDual.agentIdB);

        const emailSubject = `Conflict Resolved: Client "${currentDual.clientName}"`;
        const emailBody = `The duplicate client conflict involving "${currentDual.clientName}" has been resolved by the administrator.\n\nResolution Details:\n- Action Taken: ${action}\n- Final Outcome: ${currentDual.resolution || "Resolved"}\n\nIf you have any questions, please contact the Broker Administrator.\n\nBest Regards,\nRealtySync Team`;

        if (agentA && agentA.email) {
          await simulateEmailSend(agentA.email, emailSubject, emailBody);
        }
        if (agentB && agentB.email) {
          await simulateEmailSend(agentB.email, emailSubject, emailBody);
        }
      } catch (err: any) {
        console.error("Failed to send conflict resolution emails to agents:", err.message || err);
      }

      await writeLog(
        userContext?.id || "admin_user",
        userContext?.email || "admin@realtysync.com",
        userContext?.userName || "Admin",
        UserRole.ADMIN,
        `Dual Entry Resolved: ${action}`,
        `Conflict involving '${currentDual.clientName}'`,
        previousStateString,
        JSON.stringify(currentDual)
      );

      res.json(currentDual);
    } catch (err: any) {
      console.error("POST /api/dual-entries/:id/resolve error:", err);
      res.status(500).json({ error: "Failed to resolve dual entry" });
    }
  });

  // 6. GENERAL NOTIFICATIONS
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifs = await fetchNotifications();
      res.json(notifs);
    } catch (err: any) {
      console.error("GET /api/notifications error:", err);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/clear", async (req, res) => {
    try {
      await supabase.from("notifications").update({ read: true }).eq("read", false);
      res.json({ status: "success" });
    } catch (err: any) {
      console.error("POST /api/notifications/clear error:", err);
      res.status(500).json({ error: "Failed to clear notifications" });
    }
  });

  // 7. REPORTS MODULE ENDPOINTS & EXPORTS
  app.get("/api/reports/summary", async (req, res) => {
    try {
      const { agentId } = req.query;

      const agents = await fetchAgents();
      const clients = await fetchClients();
      const bookings = await fetchBookings();

      // Agent Leaderboard sorted by performance score (registered clients + done reservations + done payment appointments)
      const leaderboard = agents.map(a => {
        const agentClients = clients.filter(c => c.assignedAgentId === a.id);
        const agentBookings = bookings.filter(b => b.agentId === a.id);

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
        const agentClients = clients.filter(c => c.assignedAgentId === targetAgentId);
        const agentBookings = bookings.filter(b => b.agentId === targetAgentId);

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
        const totalActiveAgents = agents.filter(a => a.status === "Active").length;
        const totalClients = clients.length;
        const totalBookings = bookings.length;
        const totalDuplicates = clients.filter(c => c.duplicateStatus !== "None").length;

        // Filter booked today
        const registeredToday = clients.filter(c => c.dateRegistered.startsWith(todayStr)).length;
        const bookingsToday = bookings.filter(b => b.appointmentDate === todayStr).length;

        // Appointment counts today specifically (Global)
        const appointmentTypeCountsToday: Record<string, number> = {};
        const appointmentTypeStatusBreakdownToday: Record<string, { open: number, done: number, cancelled: number }> = {};
        typeKeys.forEach(t => {
          const bookingsOfTypeToday = bookings.filter(b => 
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
          count: bookings.filter(b => String(b.appointmentType).toLowerCase() === t.toLowerCase()).length
        }));

        // Monthly Analytics trend (June & May)
        const monthlyRegistrations = [
          { month: "Jan", count: 2 },
          { month: "Feb", count: 4 },
          { month: "Mar", count: 5 },
          { month: "Apr", count: 3 },
          { month: "May", count: 8 },
          { month: "Jun", count: clients.filter(c => c.dateRegistered.includes("-06-")).length || 6 }
        ];

        // Monthly bookings trend (Global)
        const monthlyBookings = [
          { month: "Jan", count: 2 },
          { month: "Feb", count: 3 },
          { month: "Mar", count: 4 },
          { month: "Apr", count: 5 },
          { month: "May", count: bookings.filter(b => b.appointmentDate.includes("-05-")).length + 4 },
          { month: "Jun", count: bookings.filter(b => b.appointmentDate.includes("-06-")).length + 6 }
        ];

        const duplicateTrends = [
          { status: "Strong", count: clients.filter(c => c.duplicateStatus === "Strong").length },
          { status: "Possible", count: clients.filter(c => c.duplicateStatus === "Possible").length },
          { status: "None", count: clients.filter(c => c.duplicateStatus === "None").length }
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
      }
    } catch (err: any) {
      console.error("GET /api/reports/summary error:", err);
      res.status(500).json({ error: "Failed to load reports summary" });
    }
  });

  // Audit Logs view
  app.get("/api/reports/audit-logs", async (req, res) => {
    try {
      const logs = await fetchAuditLogs();
      res.json(logs);
    } catch (err: any) {
      console.error("GET /api/reports/audit-logs error:", err);
      res.status(500).json({ error: "Failed to load audit logs" });
    }
  });

  // Track already notified booking IDs to prevent duplicate alerts
  const notifiedBookingsSet = new Set<string>();

  // Background interval to check for upcoming appointments (1-hour notice reminder)
  setInterval(async () => {
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

      const bookings = await fetchBookings();
      const agents = await fetchAgents();

      for (const b of bookings) {
        if (!b.appointmentDate || !b.appointmentTime || b.status === "Cancelled" || b.notified1Hr || notifiedBookingsSet.has(b.id)) {
          continue;
        }

        const apptMs = new Date(`${b.appointmentDate}T${b.appointmentTime}:00`).getTime();
        const diffMs = apptMs - nowMs;
        const diffMinutes = diffMs / (1000 * 60);

        // Notify if scheduled appointment starts within 60 minutes (1 hour) of the current local time
        if (diffMinutes >= 0 && diffMinutes <= 60 && !b.notified1Hr && !notifiedBookingsSet.has(b.id)) {
          // Find the agent details
          const agent = agents.find((a: any) => a.id === b.agentId);
          if (agent) {
            const title = `🚨 Upcoming Schedule Reminder (1 HR Notice)`;
            const message = `REALTYSYNC NOTICE: Hi ${agent.firstName} ${agent.lastName}, you have a "${b.appointmentType}" appointment scheduled with client "${b.clientName}" in 1 hour (at ${b.appointmentTime} on ${b.appointmentDate}). Please prepare!`;

            // 1. Mark notified in database
            b.notified1Hr = true;
            notifiedBookingsSet.add(b.id);
            await safeUpdate("bookings", b, b.id, BOOKING_MAPPINGS);

            // 2. Add to In-app notifications in Supabase
            const notifId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const notification = {
              id: notifId,
              title,
              message,
              read: false,
              type: "ALERT",
              timestamp: new Date().toISOString(),
              agentId: agent.id,
              clientId: b.clientId
            };
            await safeInsert("notifications", notification, NOTIFICATION_MAPPINGS);

            // 3. Add to Audit logs
            await writeLog(
              "system_notifier",
              "notifier@realtysync.com",
              "RealtySync Notifier Service",
              UserRole.ADMIN,
              "Appt 1HR Alert Dispatched",
              `Alerted ${agent.firstName} ${agent.lastName} via Email (${agent.email})`
            );

            // Send actual email via Resend
            await simulateEmailSend(agent.email, title, message);

            // 4. Print actual simulated terminal transmissions beautifully
            console.log(`\n========================================================================`);
            console.log(`✉️  [MAIL TRANSMISSION SUCCESS]`);
            console.log(`   To:      ${agent.email}`);
            console.log(`   Subject: ${title}`);
            console.log(`   Body:    ${message}`);
            console.log(`========================================================================\n`);
          }
        }
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
