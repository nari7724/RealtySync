/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  FileText, 
  History, 
  Bell, 
  LogOut, 
  UserCheck, 
  TrendingUp, 
  Building2,
  ChevronsUpDown,
  ShieldCheck
} from "lucide-react";
import { UserRole } from "../types.ts";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentUser: { id: string; firstName: string; lastName: string; role: UserRole; email: string };
  onLogout: () => void;
  onToggleDemoRole: () => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export function Sidebar({ 
  currentTab, 
  onTabChange, 
  currentUser, 
  unreadCount, 
  onLogout, 
  onToggleDemoRole, 
  onOpenNotifications,
  isDarkMode,
  onToggleTheme
}: SidebarProps) {
  const isAdmin = currentUser.role === UserRole.ADMIN;

  const adminMenu = [
    { id: "dashboard", label: "Command Center", icon: LayoutDashboard },
    { id: "agents", label: "Agents", icon: Users },
    { id: "clients", label: "Client Records", icon: UserCheck },
    { id: "projects", label: "Projects", icon: Building2 },
    { id: "conflicts", label: "Conflict Review", icon: Layers, badgeCount: unreadCount },
    { id: "audit", label: "Audit Trail", icon: History },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  const agentMenu = [
    { id: "dashboard", label: "Command Center", icon: LayoutDashboard },
    { id: "clients", label: "My Clients", icon: UserCheck },
    { id: "bookings", label: "Appointments", icon: TrendingUp },
    { id: "projects", label: "My Projects", icon: Building2 },
    
  ];

  const activeMenu = isAdmin ? adminMenu : agentMenu;

  return (
    <aside className="w-72 bg-[#111827] text-slate-300 flex flex-col h-screen shrink-0 border-r border-slate-950/30 shadow-2xl shadow-slate-950/10" id="realtysync-sidebar">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500 flex items-center justify-center text-slate-950 font-black text-sm tracking-widest shadow-md shadow-cyan-500/20">
            RS
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-tight flex items-center gap-1">
              RealtySync
            </h1>
            <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest">Broker Control Room</span>
          </div>
        </div>
      </div>

      {/* User Information Panel */}
      <div className="p-4 mx-3 my-4 bg-white/[0.06] rounded-lg border border-white/10 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-950 border border-cyan-400/30 flex items-center justify-center text-cyan-200 font-black uppercase text-sm">
            {currentUser.firstName[0]}{currentUser.lastName[0]}
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-white text-sm truncate">{currentUser.firstName} {currentUser.lastName}</div>
            <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-white/10">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black bg-cyan-400/10 text-cyan-200 border border-cyan-400/20 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            {currentUser.role}
          </span>
          <button
            onClick={onToggleDemoRole}
            className="text-[10px] text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
            title="Conveniently toggle demo role in AI Studio preview"
          >
            <ChevronsUpDown className="w-3 h-3" />
            Switch
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1">
        <div className="px-3 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.18em]">
          Workspaces
        </div>
        
        {activeMenu.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              id={`nav-link-${item.id}`}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 group cursor-pointer ${
                isActive 
                  ? "bg-white text-slate-950 shadow-sm"
                  : "hover:bg-white/[0.07] text-slate-400 hover:text-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? "text-cyan-600" : "text-slate-500 group-hover:text-cyan-300"}`} />
                <span>{item.label}</span>
              </div>

              {(item as any).badgeCount !== undefined && (item as any).badgeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                  {(item as any).badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Action Area */}
      <div className="p-4 border-t border-white/10 space-y-2">
        {isAdmin && (
          <button
            onClick={onOpenNotifications}
            id="sidebar-btn-notifications"
            className="w-full flex items-center justify-between text-left text-xs text-slate-300 hover:text-white px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-cyan-300" />
              Notifications
            </span>
            {unreadCount > 0 ? (
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
            ) : null}
          </button>
        )}

        <button
          onClick={onLogout}
          id="sidebar-btn-logout"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Account Session</span>
        </button>
      </div>
    </aside>
  );
}
