/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Users, 
  UserCheck, 
  Layers, 
  FileText, 
  TrendingUp, 
  History, 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  PlusCircle, 
  ShieldCheck, 
  LayoutDashboard,
  Sparkles,
  Award,
  DollarSign,
  Briefcase,
  AlertCircle,
  HelpCircle,
  Clock,
  UserPlus2,
  Lock,
  ArrowRight,
  ShieldAlert,
  Menu,
  Check,
  ChevronRight,
  X,
  MapPin,
  Bookmark,
  FileCheck,
  MessageSquare,
  Calendar,
  Building2
} from "lucide-react";

import { User, UserRole, Agent, Notification } from "./types.ts";
import { Sidebar } from "./components/Sidebar.tsx";
import { ClientForm } from "./components/ClientForm.tsx";
import { AdminAgents } from "./components/AdminAgents.tsx";
import { ConflictQueue } from "./components/ConflictQueue.tsx";
import { AuditLogs } from "./components/AuditLogs.tsx";
import { ReportsPanel } from "./components/ReportsPanel.tsx";
import { ClientMasterList } from "./components/ClientMasterList.tsx";
import { BookingList } from "./components/BookingList.tsx";
import { DashboardCharts } from "./components/DashboardCharts.tsx";
import { RecentActivity } from "./components/RecentActivity.tsx";
import { MyProjects } from "./components/MyProjects.tsx";
import { AppointmentDetailModal } from "./components/AppointmentDetailModal.tsx";
import { ProfileSettings } from "./components/ProfileSettings.tsx";

function Counter({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }
    const duration = 800; // milliseconds
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [value]);

  return <>{count}</>;
}

const REALTY_PROJECT_ADDRESSES: Record<string, string> = {
  "Avida Towers Riala": "Apas, Cebu IT Park, Cebu City, Cebu",
  "Solinea Resort Condominium": "Cardiff St, Cebu IT Park, Cebu City, Cebu",
  "The Alcoves": "Luz, Cebu City, Cebu",
  "Park Point Residences": "Cardinal Rosales Ave, Cebu City, Cebu",
  "Amara Subdivision": "Catarman, Liloan, Cebu",
  "Amaia Steps Mandaue": "Plaridel St, Mandaue City, Cebu",
  "Cebu IT Park Residences": "Jose Maria del Mar St, Cebu City, Cebu",
  "Marco Polo Residences": "Nivel Hills, Lahug, Cebu City, Cebu"
};

function isBookingDueSoon(apptDate: string, apptTime: string): boolean {
  try {
    if (!apptDate || !apptTime) return false;
    
    // Get Manila today date (YYYY-MM-DD)
    const dtf = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });
    const manilaToday = dtf.format(new Date());
    
    if (apptDate !== manilaToday) {
      return false;
    }
    
    // Get current Manila time
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const hrPart = parts.find(p => p.type === "hour")?.value || "0";
    const minPart = parts.find(p => p.type === "minute")?.value || "0";
    
    const curHrs = parseInt(hrPart, 10);
    const curMins = parseInt(minPart, 10);
    
    // Parse scheduled time
    const [tHrsStr, tMinsStr] = apptTime.split(":");
    const tHrs = parseInt(tHrsStr, 10);
    const tMins = parseInt(apptTime.includes(" ") ? tMinsStr.split(" ")[0] : tMinsStr, 10);
    
    // Calc client differences
    const curTotalMins = curHrs * 60 + curMins;
    const apptTotalMins = tHrs * 60 + tMins;
    const diff = apptTotalMins - curTotalMins;
    
    return diff >= 0 && diff <= 30;
  } catch (e) {
    return false;
  }
}

export function formatTimeWithAMPM(timeStr: string | undefined): string {
  if (!timeStr) return "—";
  if (timeStr.toLowerCase().endsWith("am") || timeStr.toLowerCase().endsWith("pm")) {
    return timeStr;
  }
  try {
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutesStr = parts[1].split(" ")[0];
      const minutes = parseInt(minutesStr, 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours === 0 ? 12 : hours;
        const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${hours}:${displayMinutes} ${ampm}`;
      }
    }
  } catch (e) {
    // ignore
  }
  return timeStr;
}

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("realtysync_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Forced password change states
  const [forcedNewPassword, setForcedNewPassword] = useState("");
  const [forcedConfirmPassword, setForcedConfirmPassword] = useState("");
  const [forcedLoading, setForcedLoading] = useState(false);
  const [forcedError, setForcedError] = useState<string | null>(null);
  const [forcedSuccess, setForcedSuccess] = useState<string | null>(null);

  const handleForcedPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForcedError(null);
    setForcedSuccess(null);

    if (!forcedNewPassword || !forcedConfirmPassword) {
      setForcedError("Please fill out both password fields.");
      return;
    }

    if (forcedNewPassword.length < 6) {
      setForcedError("Password must be at least 6 characters long.");
      return;
    }

    if (forcedNewPassword !== forcedConfirmPassword) {
      setForcedError("Passwords do not match.");
      return;
    }

    setForcedLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id,
          newPassword: forcedNewPassword,
        }),
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Password change failed.");
      }

      setForcedSuccess("Password updated successfully! Welcome to RealtySync.");
      
      // Delay clear to show success response message overlay
      setTimeout(() => {
        const updated = { ...currentUser!, forcePasswordChange: false };
        setCurrentUser(updated);
        localStorage.setItem("realtysync_user", JSON.stringify(updated));
        setForcedNewPassword("");
        setForcedConfirmPassword("");
        setForcedSuccess(null);
      }, 1500);
    } catch (err: any) {
      setForcedError(err.message || "Failed to submit password update.");
    } finally {
      setForcedLoading(false);
    }
  };

  // Selected earliest booking details modal
  const [selectedEarliestBooking, setSelectedEarliestBooking] = useState<any | null>(null);
  const [isEditingEarliest, setIsEditingEarliest] = useState(false);
  const [earliestEditForm, setEarliestEditForm] = useState({ appointmentTime: "", location: "" });
  const [earliestSaving, setEarliestSaving] = useState(false);
  const [earliestError, setEarliestError] = useState("");

  const [authEmail, setAuthEmail] = useState("");
  const [authRole, setAuthRole] = useState<UserRole>(UserRole.ADMIN);
  const [authPassword, setAuthPassword] = useState("");
  const [authRemember, setAuthRemember] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // General App states
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [autoOpenAddClient, setAutoOpenAddClient] = useState(false);
  const [showEarliestConfirm, setShowEarliestConfirm] = useState(false);
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [refreshStamp, setRefreshStamp] = useState(0);

  // Dashboard Stats summary
  const [statsData, setStatsData] = useState<any | null>(null);

  // Recent Activities list state
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Admin Auto-refresh rate for leaderboard & stats (in minutes, 0 means Manual/Off)
  const [refreshInterval, setRefreshInterval] = useState<number>(0);

  // Theme state
  const isDarkMode = false;
  const setIsDarkMode = () => {};

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("realtysync-theme", "light");
  }, []);

  // Clock state in Manila time (Asia/Manila)
  const [manilaTime, setManilaTime] = useState("");

  // Earliest 3 appointments for the active day
  const [earliestBookings, setEarliestBookings] = useState<any[]>([]);

  // 7-day completed appointments trend for sparkline (performance metrics)
  const [completedBookingsTrend, setCompletedBookingsTrend] = useState<any[]>([]);

  // Agent claims conflicts list (real-time)
  const [agentConflicts, setAgentConflicts] = useState<any[]>([]);

  const fetchAgentConflicts = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/dual-entries");
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((entry: any) => {
          if (currentUser.role === UserRole.ADMIN) {
            return entry.status === "Pending Review";
          }
          return (entry.agentIdA === currentUser.id || entry.agentIdB === currentUser.id) &&
                 entry.status === "Pending Review";
        });
        const sorted = filtered.sort((a: any, b: any) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
        setAgentConflicts(sorted);
      }
    } catch (err) {
      console.error("Error fetching agent conflicts:", err);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Manila",
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      const formatted = new Intl.DateTimeFormat("en-US", options).format(new Date());
      setManilaTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch lists of active agents for drop downs
  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents?status=Active");
      if (res.ok) {
        const data = await res.json();
        setAgentsList(data);
      }
    } catch (err) {
      console.error("Error fetching active agents dropdown list:", err);
    }
  };

  // Fetch notification states
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error parsing notifications panel:", err);
    }
  };

  // Fetch Dashboard core KPIs
  const fetchStats = async () => {
    try {
      let url = "/api/reports/summary";
      if (currentUser && currentUser.role === UserRole.AGENT) {
        url += `?agentId=${currentUser.id}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (err) {
      console.error("Error loading dashboard metrics summary:", err);
    }
  };

  // Fetch recent platform audit/compliance activities
  const fetchRecentActivities = async () => {
    setActivitiesLoading(true);
    try {
      const res = await fetch("/api/reports/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setRecentActivities(data);
      }
    } catch (err) {
      console.error("Error fetching recent activities feed:", err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Fetch agent's top 3 earliest appointments for the active day
  const fetchEarliestBookings = async () => {
    try {
      let url = "/api/bookings";
      if (currentUser && currentUser.role === UserRole.AGENT) {
        url += `?agentId=${currentUser.id}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const list = await res.json();
        
        // Filter to only today's date in Asia/Manila 
        const optionsStr = { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" } as const;
        const dtf = new Intl.DateTimeFormat("en-CA", optionsStr);
        const manilaToday = dtf.format(new Date()); // Outputs YYYY-MM-DD
        
        const todayBookings = list.filter((b: any) => 
          b.appointmentDate === manilaToday && 
          String(b.status).toLowerCase() === "open"
        );
        
        // Sort by time ascending
        todayBookings.sort((a: any, b: any) => {
          const tA = a.appointmentTime || "00:00";
          const tB = b.appointmentTime || "00:00";
          return tA.localeCompare(tB);
        });

        setEarliestBookings(todayBookings.slice(0, 3));

        // Calculate Sparkline completed trends for the last 7 days (including today)
        const trend = [];
        for (let i = 6; i >= 0; i--) {
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - i);
          const dateStr = dtf.format(pastDate); // "YYYY-MM-DD" in Manila timezone
          const label = pastDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" });

          // Count completed appointments for this specific date
          const count = list.filter((b: any) => 
            b.appointmentDate === dateStr &&
            ["done", "completed", "approved"].includes(String(b.status).toLowerCase())
          ).length;

          trend.push({ dateStr, label, count });
        }
        setCompletedBookingsTrend(trend);
      }
    } catch (err) {
      console.error("Error fetching earliest bookings list:", err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    // Load initial on mount/user role changes
    fetchAgents();
    fetchNotifications();
    fetchStats();
    fetchRecentActivities();
    fetchEarliestBookings();
    if (currentUser.role === UserRole.AGENT) {
      fetchAgentConflicts();
    }

    // Enable high-frequency background polling (every 3 seconds) for truly real-time
    // asynchronous updates without requiring a full manual browser reload.
    const pollInterval = setInterval(() => {
      fetchStats();
      fetchNotifications();
      fetchRecentActivities();
      fetchEarliestBookings();
      if (currentUser.role === UserRole.AGENT) {
        fetchAgentConflicts();
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [currentUser, refreshStamp]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          role: authRole,
          password: authPassword
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login authorization failed.");
      }

      const userData = await res.json();
      setCurrentUser(userData);
      
      if (authRemember) {
        localStorage.setItem("realtysync_user", JSON.stringify(userData));
      }
      
      setCurrentTab("dashboard");
    } catch (err: any) {
      setAuthError(err.message || "An unexpected network error was recorded.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("realtysync_user");
  };

  const handleToggleDemoRole = () => {
    if (!currentUser) return;
    
    // Convenient workspace hot-switching for AI Studio review!
    const newRole = currentUser.role === UserRole.ADMIN ? UserRole.AGENT : UserRole.ADMIN;
    const newEmail = newRole === UserRole.ADMIN ? "admin@realtysync.com" : "sarah.ramirez@realtysync.com";
    const newFirst = newRole === UserRole.ADMIN ? "Broker" : "Sarah";
    const newLast = newRole === UserRole.ADMIN ? "Admin" : "Ramirez";
    
    const switchedUser: User = {
      id: newRole === UserRole.ADMIN ? "admin_user" : "agent_1",
      email: newEmail,
      firstName: newFirst,
      lastName: newLast,
      role: newRole,
      status: "Active"
    };

    setCurrentUser(switchedUser);
    localStorage.setItem("realtysync_user", JSON.stringify(switchedUser));
    setCurrentTab("dashboard");
  };

  const handleClearNotifications = async () => {
    try {
      const res = await fetch("/api/notifications/clear", { method: "POST" });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const forceRefresh = () => {
    setRefreshStamp(prev => prev + 1);
  };

  const handleSaveEarliestEdit = async () => {
    if (!selectedEarliestBooking) return;
    if (!earliestEditForm.appointmentTime) {
      setEarliestError("Please select a valid appointment time.");
      return;
    }
    if (!earliestEditForm.location.trim()) {
      setEarliestError("Please select/enter a valid location.");
      return;
    }

    setShowEarliestConfirm(true);
  };

  const handleConfirmSaveEarliest = async () => {
    if (!currentUser || !selectedEarliestBooking) return;
    setShowEarliestConfirm(false);
    setEarliestSaving(true);
    setEarliestError("");
    try {
      const combinedDateTime = `${selectedEarliestBooking.appointmentDate}T${earliestEditForm.appointmentTime}`;
      const res = await fetch(`/api/bookings/${selectedEarliestBooking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentTime: earliestEditForm.appointmentTime,
          dateTime: combinedDateTime,
          location: earliestEditForm.location,
          userContext: {
            id: currentUser.id,
            userName: `${currentUser.firstName} ${currentUser.lastName}`,
            role: currentUser.role
          }
        })
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Failed to update appointment.");
      }

      const updatedBooking = {
        ...selectedEarliestBooking,
        appointmentTime: earliestEditForm.appointmentTime,
        dateTime: combinedDateTime,
        location: earliestEditForm.location,
      };
      setSelectedEarliestBooking(updatedBooking);
      setIsEditingEarliest(false);
      forceRefresh();
    } catch (err: any) {
      setEarliestError(err.message || "An unexpected error occurred while saving.");
    } finally {
      setEarliestSaving(false);
    }
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  if (!currentUser) {
    // --- RENDER LOGIN VIEW ---
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-teal-500 selection:text-white" id="login-layout-frame">
        <div className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[-20rem]" aria-hidden="true">
          <div className="relative left-1/2 -z-10 aspect-1155/678 w-[36rem] max-w-none -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-teal-500 to-indigo-700 opacity-20 sm:w-[72rem]"></div>
        </div>

        <div className="max-w-md w-full space-y-6">
          {/* Brand Card heading */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center mx-auto text-white font-extrabold text-lg shadow-xl shadow-teal-500/10 mb-4 tracking-widest">
              RS
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">RealtySync</h1>
            <p className="text-sm text-slate-400 mt-2">Broker Agent Operations & Duplicate Client Tracking Platform</p>
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-8 space-y-6">
            <h2 className="text-xl font-semibold text-white tracking-tight">Authenticate Workspace</h2>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-405 p-3.5 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}



            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5" htmlFor="email-input">E-mail Address</label>
                <div className="relative">
                  <UserPlus2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    id="email-input"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="e.g. broker@realtysync.com"
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm focus:outline-none focus:border-teal-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5" htmlFor="email-password">Secret Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    id="email-password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={authRemember}
                    onChange={(e) => setAuthRemember(e.target.checked)}
                    className="rounded border-slate-700 text-teal-600 focus:ring-0 bg-slate-900 focus:ring-offset-0"
                  />
                  <span>Keep me remembered on this machine</span>
                </label>
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white font-semibold text-sm rounded-lg shadow-lg hover:shadow-teal-500/5 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {authLoading ? "Initializing..." : "Unlock Dashboard Workspace"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER COMPREHENSIVE FULL-STACK CONTROL PLANE ---
  const isAdmin = currentUser.role === UserRole.ADMIN;

  if (currentUser && currentUser.forcePasswordChange) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-teal-500 selection:text-white" id="force-password-change-view">
        <div className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[-20rem]" aria-hidden="true">
          <div className="relative left-1/2 -z-10 aspect-[1155/678] w-[36rem] max-w-none -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-teal-500 to-indigo-700 opacity-20 sm:w-[72rem]"></div>
        </div>

        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center mx-auto text-white font-extrabold text-lg shadow-xl shadow-teal-500/10 mb-4 tracking-widest animate-pulse">
              RS
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Security Required</h1>
            <p className="text-sm text-slate-405 mt-2">Change your password before utilizing RealtySync</p>
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-705 shadow-2xl p-8 space-y-6">
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-xl text-xs leading-relaxed">
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500" />
              <span>
                Your profile is configured with a temporary password. You are required to update your security password credentials upon first sign-in.
              </span>
            </div>

            {forcedSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-305 p-3.5 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500 animate-bounce" />
                <span>{forcedSuccess}</span>
              </div>
            )}

            {forcedError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-405 p-3.5 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 animate-wiggle" />
                <span>{forcedError}</span>
              </div>
            )}

            <form onSubmit={handleForcedPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">New Security Password</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={forcedNewPassword}
                  onChange={(e) => setForcedNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors placeholder:text-slate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={forcedConfirmPassword}
                  onChange={(e) => setForcedConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors placeholder:text-slate-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2.5 border border-slate-700 rounded-lg text-xs text-slate-300 hover:bg-slate-700 font-bold transition-all cursor-pointer"
                >
                  Cancel & Sign Out
                </button>
                <button
                  type="submit"
                  disabled={forcedLoading}
                  className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-750 text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-teal-500/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {forcedLoading ? "Updating..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex selection:bg-teal-500 selection:text-white" id="main-admin-layout">
      {/* Sidebar navigation */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
        currentUser={currentUser}
        unreadCount={unreadNotifCount}
        onLogout={handleLogout}
        onToggleDemoRole={handleToggleDemoRole}
        onOpenNotifications={() => setNotificationsOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => {}}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen p-8 relative flex flex-col justify-between">
        
        {/* Render Active View Tab */}
        <div className="space-y-8 animate-fade-in mb-12">
          
          {currentTab === "dashboard" && (
            <div className="space-y-6">
              {/* Dynamic Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                    <Sparkles className="w-6 h-6 text-teal-600 fill-teal-600" />
                    Howdy, {currentUser.firstName}!
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    {isAdmin 
                      ? "Broker Admin System Portal. Oversee double client claim compliance logs below." 
                      : "Broker Operating Console. Maintain your lead accountability list and reservation stream."}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-lg border border-slate-150 shadow-sm text-xs text-slate-500 font-mono font-bold">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>Manila: {manilaTime}</span>
                </div>
              </div>

              {/* Stats Counters Grid: Total count of each appointment type for today */}
              {statsData ? (
                isAdmin ? (
                  <div className="space-y-4">
                    {/* Conflicts Queue Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <motion.div 
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="group relative bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-[10px] text-slate-450 dark:text-slate-500 font-extrabold uppercase tracking-widest pt-1 leading-none">
                            Conflicts Queue
                          </div>
                          <span className="p-1.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 text-amber-600 dark:text-amber-450 shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        </div>
                        <div>
                          <div className="text-3xl font-black text-slate-800 dark:text-slate-100">
                            <Counter value={statsData.totalDuplicates || 0} />
                          </div>
                          <div className="text-[9px] text-slate-450 dark:text-slate-500 mt-1 font-semibold font-mono uppercase tracking-wide">
                            Pending Integrity Conflicts
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Top 3 most urgent dual entries */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                      <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800/85 pb-3">
                        <h2 className="text-md font-bold text-slate-850 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                          Most Urgent Overlaps Queue (Top 3)
                        </h2>
                        <button
                          onClick={() => setCurrentTab("conflicts")}
                          className="text-xs text-amber-600 hover:text-amber-750 font-bold hover:underline bg-transparent"
                        >
                          View All Queue
                        </button>
                      </div>
                      {agentConflicts.length === 0 ? (
                        <p className="text-xs text-slate-455 text-center py-4 font-medium">No pending integrity conflicts in queue.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {agentConflicts.slice(0, 3).map((conflict) => (
                            <div key={conflict.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="space-y-1 text-xs">
                                <div className="font-bold text-slate-950">
                                  Client Profile: {conflict.clientNameA || "Unnamed Client"}
                                </div>
                                <div className="text-[11px] text-slate-500 space-y-0.5">
                                  <div><span className="font-semibold text-slate-600">Claimant Agent A:</span> {conflict.agentNameA} (ID: {conflict.agentIdA})</div>
                                  <div><span className="font-semibold text-slate-600">Claimant Agent B:</span> {conflict.agentNameB} (ID: {conflict.agentIdB})</div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedConflictId(conflict.id);
                                  setCurrentTab("conflicts");
                                }}
                                className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-[11px] font-bold text-white transition-all cursor-pointer shadow-sm"
                              >
                                Resolve Overlap
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  (() => {
                    const itemsList: any[] = [
                      { type: "Site Visit", icon: MapPin, text: "Site Visit Today", textCol: "text-teal-700 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/40", tooltip: "Active scheduled site visits with prospective real estate buyers today." },
                      { type: "Reservation", icon: Bookmark, text: "Reservation Today", textCol: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40", tooltip: "Direct property downpayment and booking slots reserved today." },
                      { type: "Submit Requirements", icon: FileCheck, text: "Requirements Today", textCol: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", tooltip: "Verify buyer documentary requirements and submissions today." },
                      { type: "Payment", icon: CheckCircle, text: "Payment Today", textCol: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40", tooltip: "Brokerage client amortizations and installment payouts due today." },
                      { type: "Inquiry", icon: MessageSquare, text: "Inquiry Today", textCol: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40", tooltip: "Initial inquiry requests, consultations, and prospect leads scheduled today." },
                      { type: "Meeting", icon: Users, text: "Meeting Today", textCol: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40", tooltip: "Face-to-face or virtual corporate meetings with prospective realty leads today." },
                      { type: "Release of Title", icon: FileText, text: "Title Release Today", textCol: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40", tooltip: "Official property ownership document and Title Deed handovers scheduled today." },
                    ].filter(item => {
                      const count = statsData.appointmentTypeCountsToday?.[item.type] || 0;
                      return count > 0;
                    });

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-summary-grid">
                        {itemsList.map((item, idx) => {
                          const count = statsData.appointmentTypeCountsToday?.[item.type] || 0;
                          const IconComp = item.icon;

                          return (
                            <motion.div 
                              key={item.type} 
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.35, delay: idx * 0.1, ease: "easeOut" }}
                              className="group relative bg-white dark:bg-slate-900 p-4.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 flex flex-col justify-between"
                            >
                              {/* Hover Tooltip Popup */}
                              <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-slate-900 border border-slate-800 text-white text-[10px] rounded-lg p-2.5 text-center font-bold pointer-events-none shadow-lg leading-normal">
                                {item.tooltip}
                                {/* Tail Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                              </div>

                              <div className="flex justify-between items-start mb-2">
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest pt-1 leading-none">
                                  {item.text}
                                </div>
                                <span className={`p-1.5 rounded-lg ${item.bg} ${item.textCol} shrink-0`}>
                                  <IconComp className="w-3.5 h-3.5" />
                                </span>
                              </div>

                              <div>
                                <div className="space-y-2.5 mt-1">
                                  <div className="flex justify-between items-baseline border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                                      <Counter value={count} />
                                    </span>
                                    <span className="text-[9px] text-slate-450 dark:text-slate-500 font-extrabold font-mono uppercase tracking-widest">
                                      Total Today
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-mono font-bold">
                                    <div className="rounded-lg bg-sky-50 dark:bg-sky-950/40 py-1.5 border border-sky-100 dark:border-sky-900/30">
                                      <div className="text-sky-700 dark:text-sky-400">
                                        {statsData.appointmentTypeStatusBreakdownToday?.[item.type]?.open ?? 0}
                                      </div>
                                      <div className="text-[8px] text-sky-500 dark:text-sky-550 font-extrabold uppercase tracking-wider mt-0.5">Open</div>
                                    </div>
                                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 py-1.5 border border-emerald-100 dark:border-emerald-900/30">
                                      <div className="text-emerald-700 dark:text-emerald-400">
                                        {statsData.appointmentTypeStatusBreakdownToday?.[item.type]?.done ?? 0}
                                      </div>
                                      <div className="text-[8px] text-emerald-500 dark:text-emerald-555 font-extrabold uppercase tracking-wider mt-0.5">Done</div>
                                    </div>
                                    <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 py-1.5 border border-rose-100 dark:border-rose-900/30">
                                      <div className="text-rose-700 dark:text-rose-400">
                                        {statsData.appointmentTypeStatusBreakdownToday?.[item.type]?.cancelled ?? 0}
                                      </div>
                                      <div className="text-[8px] text-rose-500 dark:text-rose-555 font-extrabold uppercase tracking-wider mt-0.5">Cancelled</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })()
                )
              ) : (
                <div className="animate-pulse bg-white dark:bg-slate-900 rounded-xl h-28 border border-slate-100 dark:border-slate-800"></div>
              )}

              {/* Main Dashboard body layouts */}
              <div className="space-y-6">
                
                {/* Board: Primary Action Cards / Overlap alarm panels */}
                <div className="space-y-6">
                  {/* Newly discovered conflicts table log for Admins */}
                  {isAdmin && notifications.length > 0 && (
                    <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                        <div className="flex items-center gap-1.5 text-amber-800 font-bold text-sm uppercase tracking-wide">
                          <ShieldAlert className="w-4 h-4" />
                          Duplicate Entry Alerts ({unreadNotifCount} unread)
                        </div>
                        <button onClick={() => setCurrentTab("conflicts")} className="text-xs hover:underline text-amber-800 font-semibold inline-flex items-center gap-1">
                          Review All Conflicts <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {notifications.slice(0, 2).map((notif) => (
                          <div key={notif.id} className="bg-white/80 border border-amber-100 rounded-lg p-3.5 text-xs text-slate-700 flex justify-between gap-4 items-start shadow-sm">
                            <div>
                              <strong className="block text-slate-900 mb-0.5">{notif.title}</strong>
                              <p className="text-slate-600 leading-normal">{notif.message}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold underline shrink-0">{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Today's Earliest Open Appointments (Agents Role Only) */}
                  {!isAdmin && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800/85 pb-3">
                        <div className="space-y-0.5">
                          <h2 className="text-md font-bold text-slate-850 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                            <Clock className="w-4 h-4 text-teal-600 animate-pulse" />
                            Today's Earliest Open Appointments
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Staged schedule order for your topmost earliest active open bookings today.</p>
                        </div>
                      </div>

                      {earliestBookings.length > 0 ? (
                        <div className="space-y-3.5">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800/85 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider">
                                  <th className="py-2.5 px-3">Appointment ID</th>
                                  <th className="py-2.5 px-3">Date & Time</th>
                                  <th className="py-2.5 px-3">Project / Location</th>
                                  <th className="py-2.5 px-3">Client Details</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 dark:divide-slate-850/65">
                                {earliestBookings.map((b, index) => (
                                  <tr 
                                    key={b.id} 
                                    className={`text-xs text-slate-705 dark:text-slate-300 ${
                                      index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/40 dark:bg-slate-950/20"
                                    } hover:bg-slate-50 dark:hover:bg-slate-805/65 hover:scale-[1.01] hover:shadow-2xs transition-all duration-200 ease-in-out origin-left transform cursor-default`}
                                  >
                                    <td className="py-3 px-3 whitespace-nowrap font-medium">
                                      <button 
                                        onClick={() => {
                                          setSelectedEarliestBooking(b);
                                          setIsEditingEarliest(false);
                                          setEarliestEditForm({ appointmentTime: b.appointmentTime || "", location: b.location || "" });
                                          setEarliestError("");
                                        }}
                                        className="font-mono font-extrabold text-teal-650 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 hover:underline bg-teal-50 dark:bg-teal-950/40 border border-teal-100/70 dark:border-teal-900/40 px-2.5 py-1 rounded cursor-pointer transition-colors text-left"
                                        title="Click to view full appointment details"
                                      >
                                        {b.id}
                                      </button>
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap">
                                      <div className="text-slate-900 dark:text-slate-200">{b.appointmentDate}</div>
                                      <div className="text-slate-500 dark:text-slate-450 text-[11px] font-medium mt-1.5 flex flex-col sm:flex-row sm:items-center gap-1.5">
                                        <span>{formatTimeWithAMPM(b.appointmentTime)}</span>
                                        {isBookingDueSoon(b.appointmentDate, b.appointmentTime) && (
                                          <span className="inline-flex items-center gap-0.5 bg-red-100 border border-red-200 dark:border-red-900 dark:bg-red-950/80 text-red-700 dark:text-red-350 font-extrabold px-1.5 py-0.5 rounded text-[9px] animate-pulse select-none shrink-0" title="Occurring within standard 30 min window!">
                                            <Clock className="w-2.5 h-2.5" /> DUE SOON
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 max-w-[200px] font-medium text-slate-655 dark:text-slate-400">
                                      <div className="font-bold text-slate-900 dark:text-slate-200">{b.location || "—"}</div>
                                      {b.location && REALTY_PROJECT_ADDRESSES[b.location] && (
                                        <div className="text-[10px] text-slate-455 dark:text-slate-550 mt-1 leading-snug font-medium italic">
                                          Location: {REALTY_PROJECT_ADDRESSES[b.location]}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="font-medium">
                                        <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">ID: {b.clientId}</span>
                                        <div className="font-bold text-slate-900 dark:text-slate-200">{b.clientName}</div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-450 font-mono mt-0.5">{b.clientMobile || "—"}</div>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Status Legend Indicator */}
                          <div className="bg-slate-50/40 dark:bg-slate-950/30 rounded-lg p-3 border border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-550 dark:text-slate-400 font-medium">
                            <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px]">Legend Indicators:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-0.5 bg-red-100 border border-red-200 dark:border-red-900 dark:bg-red-950/85 text-red-700 dark:text-red-350 font-extrabold px-1.5 py-0.5 rounded text-[8.5px] scale-95 select-none shrink-0 tracking-wider">
                                DUE SOON
                              </span>
                              <span>Occurring within standard 30-minute grace window.</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-extrabold text-teal-650 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40 px-1.5 py-0.5 rounded text-[8.5px] scale-95 select-none shrink-0 tracking-wider">
                                APT-ID
                              </span>
                              <span>Click Booking ID to trigger full schedule details card.</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-805/80">
                            <button 
                              onClick={() => setCurrentTab("bookings")}
                              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-750 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              View All Appointments <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100/60 dark:border-slate-800/60 rounded-xl p-6 text-center">
                          <Calendar className="w-8 h-8 text-slate-400 dark:text-slate-650 mx-auto mb-2 opacity-80" />
                          <p className="text-xs text-slate-530 dark:text-slate-400 font-bold">No scheduled appointments</p>
                          <div className="pt-3 border-t border-slate-100/20 mt-3">
                            <button 
                              onClick={() => setCurrentTab("bookings")}
                              className="text-xs font-bold text-teal-600 hover:text-teal-750 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              View All Appointments <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                  {/* Real-time Agent Client Conflicts Alert Card (Client Details Conflicts) */}
                  {!isAdmin && (
                    <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded bg-rose-50 text-rose-600 animate-pulse">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              Client Details Conflicts ({agentConflicts.length})
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">Real-time indicators showing conflicting claims on client registry entries with other active agents.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-rose-50 border border-slate-150 font-bold text-rose-750 px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
                          Pipeline Integrity Scan
                        </span>
                      </div>

                      {agentConflicts.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs text-amber-800 bg-amber-50/60 border border-amber-100 rounded-lg p-3 leading-relaxed font-semibold animate-pulse">
                            ⚠️ <strong>Attention:</strong> The clients listed below are requested by other active realty agents. These files are flagged for Administrator arbitration to determine sole client representation. Your system priority remains active pending final review.
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                  <th className="py-2 px-3">Conflicting Client</th>
                                  <th className="py-2 px-3">Overlapping Agent</th>
                                  <th className="py-2 px-3">My Date</th>
                                  <th className="py-2 px-3">Their Date</th>
                                  <th className="py-2 px-3">Similarity</th>
                                  <th className="py-2 px-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {agentConflicts.map((conf, index) => {
                                  // Determine which agent is current user and which is opposing agent
                                  const isUserA = conf.agentIdA === currentUser.id;
                                  const otherAgentName = isUserA ? conf.agentNameB : conf.agentNameA;
                                  const myDate = isUserA ? conf.dateA : conf.dateB;
                                  const opposingDate = isUserA ? conf.dateB : conf.dateA;
                                  
                                  return (
                                    <tr 
                                      key={conf.id} 
                                      className={`${
                                        index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/40 dark:bg-slate-950/20"
                                      } hover:bg-slate-50/50 transition-colors`}
                                    >
                                      <td className="py-2.5 px-3">
                                        <div className="font-bold text-slate-950">{conf.clientName}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">ID: {isUserA ? conf.clientIdA : conf.clientIdB}</div>
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-705">
                                        <div className="font-bold text-slate-800">{otherAgentName}</div>
                                        <div className="text-[10px] text-slate-450 font-mono">Agent ID: {isUserA ? conf.agentIdB : conf.agentIdA}</div>
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-emerald-700 font-bold">
                                        {myDate}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-slate-500">
                                        {opposingDate}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                          {conf.similarityScore}% Match
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-right">
                                        <span className="inline-flex items-center gap-1 text-[10px] bg-sky-50 border border-sky-100 text-sky-700 hover:text-sky-805 font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                                          Pending Review
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 text-center flex flex-col items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <p className="text-xs font-bold text-slate-800">Your Lead Pipeline is 100% Secure</p>
                          <p className="text-[11px] text-slate-450 mt-0.5 font-medium">No overlapping agent claims found in the live registry. All commissions and allocation tracks are safe.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Core SaaS overview dashboard links */}
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <h2 className="text-md font-bold text-slate-800 uppercase tracking-widest">
                      Operating Actions Hub
                    </h2>
                    
                    {isAdmin ? (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <button
                          onClick={() => setCurrentTab("agents")}
                          className="bg-slate-50 hover:bg-slate-100/90 border border-slate-150 hover:border-teal-500 rounded-xl p-4.5 text-left transition-all group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded bg-teal-50 text-teal-700 flex items-center justify-center font-bold mb-3">
                            <Users className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                            Manage Agent
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </h3>
                          <p className="text-xs text-slate-455 mt-1">Review active brokerage agent licensing status, verify accounts, and track profiles.</p>
                        </button>

                        <button
                          onClick={() => setCurrentTab("clients")}
                          className="bg-slate-50 hover:bg-slate-100/90 border border-slate-150 hover:border-teal-500 rounded-xl p-4.5 text-left transition-all group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded bg-teal-50 text-teal-700 flex items-center justify-center font-bold mb-3">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                            Manage Client
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </h3>
                          <p className="text-xs text-slate-455 mt-1">Browse client master listings, examine agent details, and analyze duplicate integrity.</p>
                        </button>

                        <button
                          onClick={() => setCurrentTab("bookings")}
                          className="bg-slate-50 hover:bg-slate-100/90 border border-slate-150 hover:border-teal-500 rounded-xl p-4.5 text-left transition-all group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded bg-teal-50 text-teal-700 flex items-center justify-center font-bold mb-3">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                            My Agent Appointments
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </h3>
                          <p className="text-xs text-slate-455 mt-1">Oversee scheduled site bookings, reservation statuses, and timeline compliance.</p>
                        </button>

                        <button
                          onClick={() => setCurrentTab("conflicts")}
                          className="bg-slate-50 hover:bg-slate-100/90 border border-slate-150 hover:border-amber-500 rounded-xl p-4.5 text-left transition-all group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded bg-amber-50 text-amber-700 flex items-center justify-center font-bold mb-3">
                            <Layers className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                            Integrity Overlaps Queue
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </h3>
                          <p className="text-xs text-slate-450 mt-1">Resolve double client claims, audit matching attributes, and assign database ownership.</p>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                          onClick={() => setCurrentTab("clients")}
                          className="bg-slate-50 hover:bg-slate-100/90 border border-slate-150 hover:border-teal-500 rounded-xl p-4.5 text-left transition-all group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded bg-teal-50 text-teal-700 flex items-center justify-center font-bold mb-3">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                            My Clients
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </h3>
                          <p className="text-xs text-slate-455 mt-1">Browse client registers, mobile claims, and allocate booking reservation sheets.</p>
                        </button>

                        <button
                          onClick={() => setCurrentTab("bookings")}
                          className="bg-slate-50 hover:bg-slate-100/90 border border-slate-150 hover:border-teal-500 rounded-xl p-4.5 text-left transition-all group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded bg-teal-50 text-teal-700 flex items-center justify-center font-bold mb-3">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                            Check Appointment
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </h3>
                          <p className="text-xs text-slate-455 mt-1">Review scheduled client timetables, track statuses, and finalize appointments.</p>
                        </button>

                        <button
                          onClick={() => {
                            setAutoOpenAddClient(true);
                            setCurrentTab("clients");
                          }}
                          className="bg-slate-50 hover:bg-slate-105/90 border border-slate-150 hover:border-teal-500 rounded-xl p-4.5 text-left transition-all group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded bg-teal-50 text-teal-700 flex items-center justify-center font-bold mb-3">
                            <PlusCircle className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                            Register Client
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </h3>
                          <p className="text-xs text-slate-455 mt-1">Run fuzzy likeness checking and register new real estate customers instantly.</p>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 7-Day Performance Trend Sparkline Card */}
                  {!isAdmin && completedBookingsTrend.length > 0 && (
                    <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-6 space-y-4 font-sans font-medium tracking-tight text-gray-900">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded bg-teal-50 text-teal-600">
                            <TrendingUp className="w-4 h-4 text-teal-600" />
                          </div>
                          <div className="text-left">
                            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              7-Day Performance Trend
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">Completed site visits, document submittals, and client allocations.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-teal-50 border border-teal-100 font-bold text-teal-700 px-2 py-0.5 rounded uppercase tracking-wider">
                          7D Productivity Indicator
                        </span>
                      </div>

                      <div className="flex flex-col lg:flex-row items-center gap-6 pt-2">
                        {/* Summary Metrics */}
                        <div className="w-full lg:w-1/3 grid grid-cols-2 gap-3 pb-2 lg:pb-0 font-medium font-sans font-medium tracking-tight text-gray-900">
                          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-105">
                            <div className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">Avg Completed</div>
                            <div className="text-lg font-extrabold text-slate-800 mt-1">
                              {(completedBookingsTrend.reduce((acc, t) => acc + t.count, 0) / 7).toFixed(1)} <span className="text-xs text-slate-500 font-medium">Done / day</span>
                            </div>
                          </div>
                          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-105">
                            <div className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">Peak Volume</div>
                            <div className="text-lg font-extrabold text-teal-600 mt-1">
                              {Math.max(...completedBookingsTrend.map(t => t.count))} <span className="text-xs text-slate-500 font-medium">Max</span>
                            </div>
                          </div>
                          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-105 col-span-2">
                            <div className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">Total Completed</div>
                            <div className="text-lg font-extrabold text-slate-900 mt-1 flex justify-between items-center">
                              <span>{completedBookingsTrend.reduce((acc, t) => acc + t.count, 0)} files</span>
                              <span className="text-[10px] bg-slate-100 stroke-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">L7D Trend</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive SVG Sparkline */}
                        <div className="flex-1 w-full bg-slate-50/20 rounded-xl p-4 border border-slate-100/80 relative">
                          <svg viewBox="0 0 500 110" className="w-full h-24 overflow-visible">
                            <defs>
                              <linearGradient id="sparkline-area-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.18" />
                                <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Guidelines */}
                            <line x1="30" y1="15" x2="470" y2="15" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                            <line x1="30" y1="50" x2="470" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                            <line x1="30" y1="85" x2="470" y2="85" stroke="#e2e8f0" strokeWidth="1" />

                            {(() => {
                              const maxVal = Math.max(...completedBookingsTrend.map(t => t.count), 1);
                              const width = 500;
                              const height = 110;
                              const paddingX = 40;
                              const paddingY = 20;

                              const points = completedBookingsTrend.map((t, idx) => {
                                const x = paddingX + idx * ((width - paddingX * 2) / 6);
                                const scaleValue = maxVal === 0 ? 1 : maxVal;
                                const y = height - paddingY - (t.count / scaleValue) * (height - paddingY * 2 - 10);
                                return { x, y, ...t };
                              });

                              const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                              const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

                              return (
                                <>
                                  <path d={areaD} fill="url(#sparkline-area-grad)" />
                                  <path d={pathD} fill="none" stroke="#0d9488" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

                                  {points.map((p, idx) => (
                                    <g key={idx} className="group/node">
                                      <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#0d9488" strokeWidth="2" className="shadow-sm" />
                                      
                                      {/* Counter Label */}
                                      <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[10px] font-mono font-extrabold fill-slate-800" >
                                        {p.count}
                                      </text>

                                      {/* Date Label */}
                                      <text x={p.x} y="103" textAnchor="middle" className="text-[9px] font-mono font-bold fill-slate-400" >
                                        {p.label}
                                      </text>
                                    </g>
                                  ))}
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              {/* Graphical Charts Section */}
              <div className="pt-2">
                <DashboardCharts 
                  statsData={statsData} 
                  isAdmin={isAdmin} 
                  currentUser={currentUser} 
                />
              </div>

              {/* Recent System Activity Timeline Feed */}
              <div className="pt-2">
                <RecentActivity 
                  logs={recentActivities} 
                  loading={activitiesLoading} 
                  currentUser={currentUser} 
                />
              </div>

            </div>
          )}

          {currentTab === "agents" && isAdmin && (
            <AdminAgents currentUser={currentUser} onAddLog={forceRefresh} />
          )}

          {currentTab === "clients" && (
            <ClientMasterList 
              currentUser={currentUser} 
              agentsList={agentsList} 
              onTriggerForm={() => {}}
              triggerRefreshStamp={refreshStamp}
              autoOpenForm={autoOpenAddClient}
              setAutoOpenForm={setAutoOpenAddClient}
              onTabChange={setCurrentTab}
              onSelectConflictId={setSelectedConflictId}
            />
          )}

          {currentTab === "bookings" && (
            <BookingList currentUser={currentUser} triggerRefreshStamp={refreshStamp} onAddLog={forceRefresh} />
          )}

          {currentTab === "projects" && currentUser && (
            <MyProjects currentUser={currentUser} />
          )}

          {currentTab === "conflicts" && isAdmin && (
            <ConflictQueue 
              onResolve={forceRefresh} 
              currentUser={currentUser} 
              initialSelectedConflictId={selectedConflictId}
              onClearInitialSelectedConflictId={() => setSelectedConflictId(null)}
            />
          )}

          {currentTab === "audit" && isAdmin && (
            <AuditLogs />
          )}

          {currentTab === "reports" && isAdmin && (
            <ReportsPanel />
          )}

          {currentTab === "settings" && currentUser && (
            <ProfileSettings 
              currentUser={currentUser}
              onUpdateSession={(updatedDetails) => {
                const newUser = { ...currentUser, ...updatedDetails };
                setCurrentUser(newUser);
                localStorage.setItem("realtysync_user", JSON.stringify(newUser));
              }}
              onAddLog={forceRefresh}
            />
          )}

          

        </div>

        {/* Global Footer element */}
        <footer className="text-center text-xs text-slate-400 pt-8 border-t border-slate-200/80 mt-auto">
          <p>© 2026 RealtySync Broker Platform. All agent registries are strictly monitored and audited.</p>
        </footer>

      </main>

      {/* --- NOTIFICATIONS DRAWER POPUP OVERLAY WINDOW FOR BROKER ADMIN --- */}
      {notificationsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in" id="notifications-overlay-window">
          <div className="bg-white max-w-sm w-full h-full shadow-2xl flex flex-col justify-between overflow-hidden shrink-0">
            {/* Drawer Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-teal-700" />
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Duplicate Review Logs</h3>
              </div>
              <button 
                onClick={() => setNotificationsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 bg-slate-200/50 hover:bg-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-150 p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center text-slate-450 p-8">
                  <p className="text-xs">No active duplicate overlap alerts.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      notif.read ? "bg-slate-50 border-slate-100 text-slate-600" : "bg-amber-50/70 border-amber-100 text-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <strong className="font-bold text-slate-950 text-xs block">{notif.title}</strong>
                      <span className="text-[9px] text-slate-400 shrink-0">{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-600">{notif.message}</p>
                    
                    {!notif.read && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mt-2"></span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Clear button */}
            <div className="bg-slate-50 border-t border-slate-150 p-4 shrink-0 flex gap-2">
              <button
                onClick={handleClearNotifications}
                className="w-full py-2 bg-white hover:bg-slate-100 text-slate-705 border border-slate-205 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Clear All Notifications
              </button>
              <button
                onClick={() => {
                  setNotificationsOpen(false);
                  setCurrentTab("conflicts");
                }}
                className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg text-xs shadow-sm cursor-pointer"
              >
                Inspect Dual Entries
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EARLIEST BOOKING DETAILS MODAL */}
      {selectedEarliestBooking && (
        <AppointmentDetailModal
          booking={selectedEarliestBooking}
          currentUser={currentUser}
          onClose={() => {
            setSelectedEarliestBooking(null);
          }}
          onRefresh={() => {
            forceRefresh();
          }}
        />
      )}

      {/* RENDER-BYPASSED RETIRED MODAL CODE */}
      {false && selectedEarliestBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-xs" id="earliest-detail-overlay">
          <motion.div 
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden shrink-0"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                <div className="text-left">
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                    {isEditingEarliest ? "Edit Appointment Registry" : "Appointment Details"}
                  </h3>
                  <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Reference ID: {selectedEarliestBooking.id}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedEarliestBooking(null);
                  setIsEditingEarliest(false);
                  setEarliestError("");
                }} 
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-slate-605 dark:text-slate-300 text-left">
              {earliestError && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-350 p-3 rounded-lg font-bold text-[11px]">
                  {earliestError}
                </div>
              )}

              {isEditingEarliest ? (
                <div className="space-y-4">
                  {/* Readonly profile indicator */}
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Client Registry details
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{selectedEarliestBooking.clientName}</div>
                      <div className="mt-0.5">Client ID: <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{selectedEarliestBooking.clientId}</span></div>
                    </div>
                  </div>

                  {/* Editable Fields form */}
                  <div className="bg-slate-50/55 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 p-4.5 space-y-3.5">
                    <div className="text-[10px] uppercase font-extrabold text-teal-600 dark:text-teal-400 tracking-wider">
                      Appointment Edit Form
                    </div>

                    {/* Booking Time */}
                    <div className="space-y-1">
                      <label className="block text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                        Booking Time
                      </label>
                      <input
                        type="time"
                        value={earliestEditForm.appointmentTime}
                        onChange={(e) => setEarliestEditForm({ ...earliestEditForm, appointmentTime: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none font-mono text-xs text-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>

                    {/* Site Project Location Selector */}
                    <div className="space-y-1">
                      <label className="block text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                        Project Site Location
                      </label>
                      <select
                        value={Object.keys(REALTY_PROJECT_ADDRESSES).includes(earliestEditForm.location) ? earliestEditForm.location : "Custom"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== "Custom") {
                            setEarliestEditForm({ ...earliestEditForm, location: val });
                          } else {
                            setEarliestEditForm({ ...earliestEditForm, location: "" });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none text-xs text-slate-800 dark:text-slate-100"
                      >
                        {Object.keys(REALTY_PROJECT_ADDRESSES).map((locKey) => (
                          <option key={locKey} value={locKey}>{locKey}</option>
                        ))}
                        <option value="Custom">Custom / Other Address...</option>
                      </select>
                      
                      {(!Object.keys(REALTY_PROJECT_ADDRESSES).includes(earliestEditForm.location) || earliestEditForm.location === "") && (
                        <input
                          type="text"
                          value={earliestEditForm.location}
                          onChange={(e) => setEarliestEditForm({ ...earliestEditForm, location: e.target.value })}
                          placeholder="Enter custom location/address"
                          className="w-full mt-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-705 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none text-xs text-slate-800 dark:text-slate-100"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Client ID / Contact */}
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="text-[9px] uppercase font-extrabold text-teal-600 dark:text-teal-400 tracking-wider flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Client Profile Details
                    </div>
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{selectedEarliestBooking.clientName}</div>
                      <div>Client ID: <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-850 px-1.5 py-0.5 rounded">{selectedEarliestBooking.clientId}</span></div>
                      {selectedEarliestBooking.clientMobile && (
                        <div>Mobile Contact: <span className="font-mono font-semibold text-slate-850 dark:text-slate-200">{selectedEarliestBooking.clientMobile}</span></div>
                      )}
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> Date
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs font-mono">{selectedEarliestBooking.appointmentDate}</div>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> Scheduled Time
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs font-mono">{formatTimeWithAMPM(selectedEarliestBooking.appointmentTime)}</div>
                    </div>
                  </div>

                  {/* Status and Type */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider">
                        Appointment Type:
                      </span>
                      <span className="font-extrabold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 rounded text-xs select-none">
                        {selectedEarliestBooking.appointmentType}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider">
                        Current Status:
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-900">
                        {selectedEarliestBooking.status}
                      </span>
                    </div>

                    {selectedEarliestBooking.location && (
                      <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> Site Project Location:
                        </span>
                        <div className="font-extrabold text-slate-850 dark:text-slate-200 pl-4.5 text-xs">
                          {selectedEarliestBooking.location}
                        </div>
                        {REALTY_PROJECT_ADDRESSES[selectedEarliestBooking.location] && (
                          <div className="pl-4.5 text-[10px] text-slate-455 dark:text-slate-450 font-medium italic">
                            Complete Address: {REALTY_PROJECT_ADDRESSES[selectedEarliestBooking.location]}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedEarliestBooking.notes && (
                      <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider">
                          Remarks / Notes:
                        </span>
                        <p className="text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded border dark:border-slate-800 italic font-medium">
                          "{selectedEarliestBooking.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end items-center gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
              {isEditingEarliest ? (
                <>
                  <button 
                    onClick={() => {
                      setIsEditingEarliest(false);
                      setEarliestError("");
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer mr-auto"
                    disabled={earliestSaving}
                  >
                    Cancel Edit
                  </button>
                  <button 
                    onClick={handleSaveEarliestEdit}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#00786f] hover:bg-[#005e57] transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm"
                    disabled={earliestSaving}
                  >
                    {earliestSaving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setSelectedEarliestBooking(null);
                      setCurrentTab("bookings");
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-350 hover:underline bg-slate-100 dark:bg-slate-805 mr-auto transition-all cursor-pointer"
                  >
                    Go to Bookings Registry
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditingEarliest(true);
                      setEarliestEditForm({
                        appointmentTime: selectedEarliestBooking.appointmentTime || "",
                        location: selectedEarliestBooking.location || ""
                      });
                      setEarliestError("");
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-bold font-sans text-teal-700 bg-teal-50 hover:bg-teal-100 hover:text-teal-800 border border-teal-200 transition-all cursor-pointer"
                  >
                    Edit Appointment
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedEarliestBooking(null);
                      setIsEditingEarliest(false);
                      setEarliestError("");
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 border border-transparent transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {showEarliestConfirm && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-800 shadow-2xl max-w-sm w-full overflow-hidden shrink-0 text-left">
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-105 text-sm leading-snug">Confirm Modification</h3>
                <p className="text-slate-505 dark:text-slate-400 text-xs mt-2 leading-relaxed">Are you sure you want to save and update this appointment's details?</p>
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  onClick={() => setShowEarliestConfirm(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-605 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border dark:border-slate-800"
                >
                  No, Cancel
                </button>
                <button
                  onClick={handleConfirmSaveEarliest}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#00786f] hover:bg-[#005e57] transition-all cursor-pointer shadow-sm animate-scale-up"
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
