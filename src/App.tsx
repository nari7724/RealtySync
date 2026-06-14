/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
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
  X
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

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("realtysync_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [authEmail, setAuthEmail] = useState("admin@realtysync.com");
  const [authRole, setAuthRole] = useState<UserRole>(UserRole.ADMIN);
  const [authPassword, setAuthPassword] = useState("admin123");
  const [authRemember, setAuthRemember] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // General App states
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [refreshStamp, setRefreshStamp] = useState(0);

  // Dashboard Stats summary
  const [statsData, setStatsData] = useState<any | null>(null);

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
      const res = await fetch("/api/reports/summary");
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (err) {
      console.error("Error loading dashboard metrics summary:", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAgents();
      fetchNotifications();
      fetchStats();
    }
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

            {/* Quick Demo Preloaded accounts helper list */}
            <div className="bg-slate-900/40 border border-slate-700/50 p-3 rounded-lg space-y-1.5 text-xs text-slate-300">
              <span className="font-semibold text-teal-400 block mb-1">Preconfigured demo credentials:</span>
              <button 
                type="button"
                onClick={() => {
                  setAuthEmail("admin@realtysync.com");
                  setAuthRole(UserRole.ADMIN);
                }}
                className="w-full text-left font-mono hover:text-white flex justify-between cursor-pointer"
              >
                <span>👤 Admin: admin@realtysync.com</span>
                <span className="text-[10px] text-teal-500 font-bold bg-teal-900/50 px-1 rounded hover:underline">Apply</span>
              </button>
              <button 
                type="button"
                onClick={() => {
                  setAuthEmail("sarah.ramirez@realtysync.com");
                  setAuthRole(UserRole.AGENT);
                }}
                className="w-full text-left font-mono hover:text-white flex justify-between cursor-pointer"
              >
                <span>👤 Agent: sarah.ramirez@realtysync.com</span>
                <span className="text-[10px] text-teal-500 font-bold bg-teal-900/50 px-1 rounded hover:underline">Apply</span>
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Authorized Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthRole(UserRole.ADMIN)}
                    className={`py-2 px-3.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      authRole === UserRole.ADMIN 
                        ? "bg-teal-500/15 text-teal-350 border-teal-500" 
                        : "bg-slate-900/50 text-slate-400 border-slate-700"
                    }`}
                  >
                    Office Broker Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthRole(UserRole.AGENT)}
                    className={`py-2 px-3.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      authRole === UserRole.AGENT 
                        ? "bg-teal-500/15 text-teal-350 border-teal-500" 
                        : "bg-slate-900/50 text-slate-400 border-slate-700"
                    }`}
                  >
                    Operating Agent
                  </button>
                </div>
              </div>

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex selection:bg-teal-500 selection:text-white" id="main-admin-layout">
      {/* Sidebar navigation */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
        currentUser={currentUser}
        unreadCount={unreadNotifCount}
        onLogout={handleLogout}
        onToggleDemoRole={handleToggleDemoRole}
        onOpenNotifications={() => setNotificationsOpen(true)}
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

                <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-lg border border-slate-150 shadow-sm text-xs text-slate-500 font-mono">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>UTC: {new Date().toISOString().substring(11, 19)}</span>
                </div>
              </div>

              {/* Stats Counters Grid */}
              {statsData ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5" id="stats-summary-grid">
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Active Agents</div>
                    <div className="text-2xl font-black text-slate-850">{statsData.totalActiveAgents}</div>
                    <div className="text-[10px] text-teal-600 font-medium mt-1 inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Checked Licences
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total Registrations</div>
                    <div className="text-2xl font-black text-slate-850">{statsData.totalClients}</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-1">
                      {statsData.registeredToday > 0 ? (
                        <span className="text-green-600 font-bold">+ {statsData.registeredToday} Registered Today</span>
                      ) : "Stable acquisition pipeline"}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Reservation Count</div>
                    <div className="text-2xl font-black text-slate-850">{statsData.totalBookings}</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-1">
                      {statsData.bookingsToday > 0 ? (
                        <span className="text-green-600 font-bold">+ {statsData.bookingsToday} reserves today</span>
                      ) : "All properties consolidated"}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="text-xs text-slate-450 font-bold uppercase tracking-wider mb-1">Duplicate Overlaps</div>
                    <div className="text-2xl font-black text-amber-600">{statsData.totalDuplicates}</div>
                    <div className="text-[10px] mt-1">
                      {statsData.totalDuplicates > 0 ? (
                        <span className="text-amber-600 font-bold flex items-center gap-1 cursor-pointer" onClick={() => isAdmin && setCurrentTab("conflicts")}>
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Dual Review Required
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">No conflicts registered</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-pulse bg-white rounded-xl h-28 border border-slate-100"></div>
              )}

              {/* Main Dashboard body layouts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Board Column A: Primary Action Cards / Overlap alarm panels */}
                <div className="lg:col-span-2 space-y-6">
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

                  {/* Core SaaS overview dashboard links */}
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <h2 className="text-md font-bold text-slate-800 uppercase tracking-widest">
                      Operating Actions Hub
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={() => setCurrentTab("clients")}
                        className="bg-slate-50 hover:bg-slate-100/90 border border-slate-150 hover:border-teal-500 rounded-xl p-4.5 text-left transition-all group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded bg-teal-50 text-teal-700 flex items-center justify-center font-bold mb-3">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                          Client registries
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                        </h3>
                        <p className="text-xs text-slate-450 mt-1">Browse client registers, mobile claims, and allocate booking reservation sheets.</p>
                      </button>

                      {isAdmin ? (
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
                          <p className="text-xs text-slate-450 mt-1">Review side-by-side agent overlays, verify telephone claims, and merge customer files.</p>
                        </button>
                      ) : (
                        <button
                          onClick={() => setCurrentTab("register")}
                          className="bg-slate-50 hover:bg-slate-100/90 border border-slate-150 hover:border-teal-500 rounded-xl p-4.5 text-left transition-all group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded bg-teal-50 text-teal-700 flex items-center justify-center font-bold mb-3">
                            <PlusCircle className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                            Construct Client Registries
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </h3>
                          <p className="text-xs text-slate-450 mt-1">Run fuzzy likeness checking and register new real estate customers instantly.</p>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Board Column B: Agent Performance Leaderboard */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Award className="w-4 h-4 text-amber-500" />
                        Performance Leaderboard
                      </h3>
                      {isAdmin && (
                        <button onClick={() => setCurrentTab("reports")} className="text-[10px] text-teal-600 hover:underline font-bold uppercase">
                          All reports
                        </button>
                      )}
                    </div>

                    {statsData?.leaderboard ? (
                      <div className="space-y-3">
                        {statsData.leaderboard.slice(0, 3).map((agent: any, idx: number) => (
                          <div key={agent.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100/80 rounded-xl hover:shadow-sm transition-shadow">
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-slate-250 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs truncate max-w-[120px]">{agent.name}</h4>
                                <span className="text-[9px] text-slate-450 mt-0.5 block font-medium">{agent.clientsCount} clients registered</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-extrabold text-slate-900 text-xs">PHP {(agent.salesVolume).toLocaleString()}</div>
                              <span className="text-[9px] text-teal-600 font-semibold uppercase">{agent.bookingsCount} bookings submitted</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="animate-pulse h-32 bg-slate-50 rounded"></div>
                    )}
                  </div>
                </div>

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
              onTriggerForm={() => setCurrentTab(isAdmin ? "clients" : "register")}
              triggerRefreshStamp={refreshStamp}
            />
          )}

          {currentTab === "register" && !isAdmin && (
            <ClientForm 
              onSuccess={() => {
                forceRefresh();
                setCurrentTab("clients");
              }} 
              onCancel={() => setCurrentTab("dashboard")} 
              agentsList={agentsList} 
              currentUser={currentUser} 
            />
          )}

          {currentTab === "conflicts" && isAdmin && (
            <ConflictQueue onResolve={forceRefresh} currentUser={currentUser} />
          )}

          {currentTab === "audit" && isAdmin && (
            <AuditLogs />
          )}

          {currentTab === "reports" && isAdmin && (
            <ReportsPanel />
          )}

          {currentTab === "bookings" && (
            <BookingList currentUser={currentUser} triggerRefreshStamp={refreshStamp} onAddLog={forceRefresh} />
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
    </div>
  );
}
