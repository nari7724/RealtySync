/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { User, Agent, Client, Booking, Notification, AuditLog, DualEntry, UserRole } from "./src/types.ts";
import { calculateCombinedDuplicateScore, normalizeAddress } from "./src/utils/matching.ts";

const DB_FILE = path.join(process.cwd(), "realtysync_db.json");

// Define seed data structure
const DEFAULT_AGENTS: Agent[] = [
  {
    id: "agent_1",
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
    id: "agent_2",
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
    id: "agent_3",
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
    id: "agent_4",
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
    id: "client_1",
    firstName: "Juan",
    middleName: "Dela",
    lastName: "Cruz",
    mobileNumber: "09171234567",
    address: "123 Mabini Street, Manila",
    facebookProfileLink: "facebook.com/juan.delacruz",
    sourceOfLead: "Facebook Ad",
    notes: "Particularly interested in 2-bedroom units.",
    assignedAgentId: "agent_1",
    assignedAgentName: "Sarah Ramirez",
    dateRegistered: "2026-05-12T11:00:00Z",
    duplicateStatus: "None"
  },
  // Exact Mobile and Name conflict logged by James Lim later:
  {
    id: "client_2",
    firstName: "Juan",
    middleName: "",
    lastName: "Delacruz",
    mobileNumber: "09171234567",
    address: "123 Mabini St., Metro Manila",
    facebookProfileLink: "facebook.com/juan.delacruz",
    sourceOfLead: "Direct Walk-In",
    notes: "Wants to reserve unit this week.",
    assignedAgentId: "agent_2",
    assignedAgentName: "James Lim",
    dateRegistered: "2026-06-01T15:20:00Z",
    duplicateStatus: "Strong"
  },
  {
    id: "client_3",
    firstName: "Johnathan",
    middleName: "Paul",
    lastName: "Smith",
    mobileNumber: "09189876543",
    address: "Lot 5, Villa Sol, Angeles City",
    facebookProfileLink: "facebook.com/jpsmith",
    sourceOfLead: "Broker Referral",
    notes: "High budget commercial investor.",
    assignedAgentId: "agent_3",
    assignedAgentName: "Maria Santos",
    dateRegistered: "2026-06-05T09:12:00Z",
    duplicateStatus: "None"
  },
  {
    id: "client_4",
    firstName: "Johnny",
    middleName: "",
    lastName: "Smith",
    mobileNumber: "09189876543", // Same Phone!
    address: "Villa Sol Subdivision, Angeles City",
    facebookProfileLink: "facebook.com/jpsmith", // Same FB!
    sourceOfLead: "Flyer",
    notes: "Looking for commercial lease.",
    assignedAgentId: "agent_1",
    assignedAgentName: "Sarah Ramirez",
    dateRegistered: "2026-06-14T01:30:00Z", // Created fresh today!
    duplicateStatus: "Strong"
  }
];

const DEFAULT_BOOKINGS: Booking[] = [
  {
    id: "booking_1",
    clientId: "client_1",
    clientName: "Juan Dela Cruz",
    agentId: "agent_1",
    agentName: "Sarah Ramirez",
    project: "Solinea Resort Towers",
    property: "Tower 2 Unit 15C",
    reservationDate: "2026-05-15",
    reservationAmount: 25000,
    status: "Approved",
    notes: "Full payment made via bank transfer.",
    createdAt: "2026-05-15T12:00:00Z",
  },
  {
    id: "booking_2",
    clientId: "client_3",
    clientName: "Johnathan Smith",
    agentId: "agent_3",
    agentName: "Maria Santos",
    project: "Avida Towers Prime",
    property: "Unit 102 (Commercial Space Ground Floor)",
    reservationDate: "2026-06-08",
    reservationAmount: 50000,
    status: "Processing",
    notes: "Awaiting documents signature.",
    createdAt: "2026-06-08T10:00:00Z",
  }
];

const DEFAULT_DUAL_ENTRIES: DualEntry[] = [
  {
    id: "dual_1",
    clientName: "Juan Dela Cruz",
    clientIdA: "client_1",
    clientIdB: "client_2",
    agentIdA: "agent_1",
    agentNameA: "Sarah Ramirez",
    agentIdB: "agent_2",
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
    id: "dual_2",
    clientName: "Johnathan Smith",
    clientIdA: "client_3",
    clientIdB: "client_4",
    agentIdA: "agent_3",
    agentNameA: "Maria Santos",
    agentIdB: "agent_1",
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

// Load database state from disk or initialize with seed data
function loadDB(): {
  agents: Agent[];
  clients: Client[];
  bookings: Booking[];
  dualEntries: DualEntry[];
  notifications: Notification[];
  auditLogs: AuditLog[];
} {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading mock file database, recreating:", err);
  }

  // Create default state
  const state = {
    agents: DEFAULT_AGENTS,
    clients: DEFAULT_CLIENTS,
    bookings: DEFAULT_BOOKINGS,
    dualEntries: DEFAULT_DUAL_ENTRIES,
    notifications: DEFAULT_NOTIFICATIONS,
    auditLogs: DEFAULT_AUDIT_LOGS,
  };
  saveDB(state);
  return state;
}

function saveDB(state: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing mock file database:", err);
  }
}

// Memory database instance
let db = loadDB();

// Build custom server
async function startServer() {
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

  // Auth Endpoint (Remember-Me & role payload simulated)
  app.post("/api/auth/login", (req, res) => {
    const { email, role, password } = req.body;
    
    // Default system credentials
    if (email === "admin@realtysync.com") {
      const token = "admin-secret-token";
      return res.json({
        id: "admin_user",
        email: "admin@realtysync.com",
        firstName: "Broker",
        lastName: "Admin",
        role: UserRole.ADMIN,
        status: "Active",
        token
      });
    }

    // Check agents list
    const agent = db.agents.find(a => a.email.toLowerCase() === email?.toLowerCase());
    if (agent) {
      if (agent.status === "Inactive") {
        return res.status(403).json({ error: "Access Denied: This Agent account has been deactivated." });
      }
      return res.json({
        id: agent.id,
        email: agent.email,
        firstName: agent.firstName,
        lastName: agent.lastName,
        role: UserRole.AGENT,
        status: "Active",
        token: `agent-token-${agent.id}`
      });
    }

    // Generic login for testing
    if (role === UserRole.ADMIN) {
      return res.json({
        id: "admin_user",
        email: email || "admin@realtysync.com",
        firstName: "Broker",
        lastName: "Owner",
        role: UserRole.ADMIN,
        token: "admin-secret-token",
        status: "Active"
      });
    } else {
      // Find or create fallback active agent
      const customAgent = db.agents[0];
      return res.json({
        id: customAgent.id,
        email: email || customAgent.email,
        firstName: customAgent.firstName,
        lastName: customAgent.lastName,
        role: UserRole.AGENT,
        token: `agent-token-${customAgent.id}`,
        status: "Active"
      });
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

    // Filter by Search (Global Client Name, Mobile, Facebook, or Agent Name)
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(c => 
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
      id: "client_" + Date.now(),
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
        id: "dual_" + Date.now(),
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
        a.prcLicenseNumber.includes(q)
      );
    }

    if (status) {
      list = list.filter(a => a.status.toLowerCase() === String(status).toLowerCase());
    }

    res.json(list);
  });

  app.post("/api/agents", (req, res) => {
    const { firstName, middleName, lastName, email, mobileNumber, prcLicenseNumber, userContext } = req.body;

    // Check duplicate email
    if (db.agents.some(a => a.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: "An agent with this email already exists." });
    }

    const newAgent: Agent = {
      id: "agent_" + Date.now(),
      firstName,
      middleName,
      lastName,
      email,
      mobileNumber,
      prcLicenseNumber,
      status: "Active",
      createdAt: new Date().toISOString()
    };

    db.agents.unshift(newAgent);

    writeLog(
      userContext?.id || "admin_user",
      userContext?.email || "admin@realtysync.com",
      userContext?.userName || "Admin",
      UserRole.ADMIN,
      "Agent Account Created",
      `Agent: ${newAgent.firstName} ${newAgent.lastName}`,
      null,
      newAgent
    );

    saveDB(db);
    res.status(201).json(newAgent);
  });

  app.put("/api/agents/:id", (req, res) => {
    const { id } = req.params;
    const { firstName, middleName, lastName, email, mobileNumber, prcLicenseNumber, status, userContext } = req.body;

    const index = db.agents.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Agent record not found" });
    }

    const previousValue = { ...db.agents[index] };

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
      `Agent: ${db.agents[index].firstName} ${db.agents[index].lastName}`,
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

    if (agentId) {
      list = list.filter(b => b.agentId === agentId);
    }

    if (status) {
      list = list.filter(b => b.status.toLowerCase() === String(status).toLowerCase());
    }

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(b => 
        b.clientName.toLowerCase().includes(q) ||
        b.project.toLowerCase().includes(q) ||
        b.property.toLowerCase().includes(q) ||
        b.agentName.toLowerCase().includes(q)
      );
    }

    res.json(list);
  });

  app.post("/api/bookings", (req, res) => {
    const bdata = req.body;
    const { userContext } = bdata;

    // Get Client details
    const client = db.clients.find(c => c.id === bdata.clientId);
    if (!client) {
      return res.status(404).json({ error: "Selected Client record was not found." });
    }

    // Get Agent details
    const agent = db.agents.find(a => a.id === client.assignedAgentId) || {
      id: userContext?.id || "agent_1",
      firstName: "Sarah",
      lastName: "Ramirez"
    };

    const newBooking: Booking = {
      id: "booking_" + Date.now(),
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      agentId: agent.id,
      agentName: `${agent.firstName} ${agent.lastName}`,
      project: bdata.project,
      property: bdata.property,
      reservationDate: bdata.reservationDate || new Date().toISOString().split('T')[0],
      reservationAmount: Number(bdata.reservationAmount) || 0,
      status: bdata.status || "New",
      notes: bdata.notes || "",
      createdAt: new Date().toISOString()
    };

    db.bookings.unshift(newBooking);

    writeLog(
      userContext?.id || "agent_1",
      userContext?.email || "sarah.ramirez@realtysync.com",
      userContext?.userName || "Sarah Ramirez",
      userContext?.role || UserRole.AGENT,
      "Booking Record Created",
      `Booking on ${newBooking.project} for ${newBooking.clientName}`,
      null,
      newBooking
    );

    saveDB(db);
    res.status(201).json(newBooking);
  });

  app.put("/api/bookings/:id", (req, res) => {
    const { id } = req.params;
    const { status, notes, project, property, reservationAmount, userContext } = req.body;

    const index = db.bookings.findIndex(b => b.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Booking record not found" });
    }

    const previousValue = { ...db.bookings[index] };

    db.bookings[index] = {
      ...db.bookings[index],
      status: status ?? db.bookings[index].status,
      notes: notes ?? db.bookings[index].notes,
      project: project ?? db.bookings[index].project,
      property: property ?? db.bookings[index].property,
      reservationAmount: reservationAmount !== undefined ? Number(reservationAmount) : db.bookings[index].reservationAmount,
    };

    writeLog(
      userContext?.id || "admin_user",
      userContext?.email || "admin@realtysync.com",
      userContext?.userName || "Admin",
      userContext?.role || UserRole.ADMIN,
      `Booking Status to '${db.bookings[index].status}'`,
      `Booking ID: ${id} (${db.bookings[index].clientName})`,
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
    // Gather statistics
    const totalActiveAgents = db.agents.filter(a => a.status === "Active").length;
    const totalClients = db.clients.length;
    const totalBookings = db.bookings.length;
    const totalDuplicates = db.clients.filter(c => c.duplicateStatus !== "None").length;

    // Filter booked today
    const todayStr = new Date().toISOString().split("T")[0];
    const registeredToday = db.clients.filter(c => c.dateRegistered.startsWith(todayStr)).length;
    const bookingsToday = db.bookings.filter(b => b.createdAt.startsWith(todayStr)).length;

    // Agent Leaderboard
    const leaderboard = db.agents.map(a => {
      const agentClients = db.clients.filter(c => c.assignedAgentId === a.id);
      const agentBookings = db.bookings.filter(b => b.agentId === a.id);
      const approvedAmount = agentBookings
        .filter(b => b.status === "Approved" || b.status === "Reserved")
        .reduce((sum, b) => sum + b.reservationAmount, 0);

      return {
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
        clientsCount: agentClients.length,
        bookingsCount: agentBookings.length,
        salesVolume: approvedAmount,
        status: a.status
      };
    }).sort((a,b) => b.salesVolume - a.salesVolume);

    // Monthly Analytics trend (June & May)
    const monthlyRegistrations = [
      { month: "Jan", count: 2 },
      { month: "Feb", count: 4 },
      { month: "Mar", count: 5 },
      { month: "Apr", count: 3 },
      { month: "May", count: 8 },
      { month: "Jun", count: db.clients.filter(c => c.dateRegistered.includes("-06-")).length || 6 }
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
      duplicateTrends
    });
  });

  // Audit Logs view
  app.get("/api/reports/audit-logs", (req, res) => {
    res.json(db.auditLogs);
  });

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
