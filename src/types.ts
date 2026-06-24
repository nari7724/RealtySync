/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "ADMIN",
  AGENT = "AGENT"
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  token?: string;
  status: "Active" | "Inactive";
  forcePasswordChange?: boolean;
}

export interface Agent {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  prcLicenseNumber: string;
  status: "Active" | "Inactive";
  createdAt: string;
}

export type AppointmentType = "Site Visit" | "Reservation" | "Submit Requirements" | "Payment" | "Inquiry" | "Meeting" | "Release of Title";
export type AppointmentStatus = "Open" | "Done" | "Cancelled" | "New" | "Approved" | "Scheduled" | "Completed" | "Reserved" | "Processing";

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientMobile?: string;
  agentId: string;
  agentName: string;
  appointmentType: AppointmentType;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  dateTime: string; // YYYY-MM-DDTHH:MM
  location?: string; // only for site visit
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  notified1Hr?: boolean;
}

export type BookingStatus = AppointmentStatus;
export type Booking = Appointment;

export interface Client {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  mobileNumber: string;
  address: string;
  facebookProfileLink?: string;
  sourceOfLead: string;
  notes?: string;
  assignedAgentId: string;
  assignedAgentName: string;
  dateRegistered: string;
  duplicateStatus: "None" | "Possible" | "Strong";
  status?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  score: number;
  status: "Strong Duplicate" | "Possible Duplicate" | "No Duplicate";
  existingAgentName?: string;
  existingAgentId?: string;
  existingRegistrationDate?: string;
  existingClientId?: string;
  scoreBreakdown?: {
    nameSimilarity: number;
    phoneMatch: number;
    addressSimilarity: number;
  };
}

export type DualEntryStatus = "Pending Review" | "Confirmed Duplicate" | "False Positive" | "Resolved";

export interface DualEntry {
  id: string;
  clientName: string;
  clientIdA: string;
  clientIdB: string;
  agentIdA: string;
  agentNameA: string;
  agentIdB: string;
  agentNameB: string;
  dateA: string;
  dateB: string;
  similarityScore: number;
  status: DualEntryStatus;
  details: {
    clientA: Client;
    clientB: Client;
    differences: {
      name: boolean;
      phone: boolean;
      address: boolean;
    };
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "DUPLICATE_ALERT" | "INFO" | "SYSTEM" | "ALERT";
  agentId?: string;
  clientId?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entity: string;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
}

export interface Project {
  id: string;
  projectName: string;
  developersName: string;
  location: string;
  minimumCut: string;
  pricePerSqm: number;
}

