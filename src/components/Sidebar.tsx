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
  PlusCircle, 
  TrendingUp, 
  Shield, 
  X,
  Sparkles,
  Sun,
  Moon
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
    { id: "dashboard", label: "Broker Dashboard", icon: LayoutDashboard },
    { id: "agents", label: "Agent Management", icon: Users },
    { id: "clients", label: "Client Records", icon: UserCheck },
    { id: "conflicts", label: "Dual Entry Queue", icon: Layers, badgeCount: unreadCount },
    { id: "audit", label: "Audit Ledger", icon: History },
    { id: "reports", label: "Performance Reports", icon: FileText },
  ];

  const agentMenu = [
    { id: "dashboard", label: "Agent Console", icon: LayoutDashboard },
    { id: "clients", label: "My Clients", icon: UserCheck },
    { id: "register", label: "Register Client", icon: PlusCircle },
    { id: "bookings", label: "My Appointment", icon: TrendingUp },
  ];

  const activeMenu = isAdmin ? adminMenu : agentMenu;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen shrink-0 border-r border-slate-800" id="realtysync-sidebar">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white font-extrabold text-sm tracking-widest shadow-md shadow-teal-500/20">
            RS
          </div>
          <div>
            <h1 className="text-md font-bold text-white tracking-tight flex items-center gap-1">
              RealtySync
            </h1>
            <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">Enterprise Broker Suite</span>
          </div>
        </div>
      </div>

      {/* User Information Panel */}
      <div className="p-4 mx-3 my-4 bg-slate-800/50 rounded-xl border border-slate-800/75 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-900 border border-teal-700 flex items-center justify-center text-teal-300 font-bold uppercase text-sm">
            {currentUser.firstName[0]}{currentUser.lastName[0]}
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-white text-sm truncate">{currentUser.firstName} {currentUser.lastName}</div>
            <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-900/80 text-teal-400 border border-teal-800/90 uppercase">
            {currentUser.role}
          </span>
          <button
            onClick={onToggleDemoRole}
            className="text-[10px] text-slate-400 hover:text-white hover:underline transition-colors cursor-pointer"
            title="Conveniently toggle demo role in AI Studio preview"
          >
            Switch Role
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1">
        <div className="px-3 mb-2 text-[10px] font-medium text-slate-500 uppercase tracking-widest">
          Navigation
        </div>
        
        {activeMenu.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              id={`nav-link-${item.id}`}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group cursor-pointer ${
                isActive 
                  ? "bg-teal-700 text-white shadow-sm" 
                  : "hover:bg-slate-800/80 text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span>{item.label}</span>
              </div>

              {(item as any).badgeCount !== undefined && (item as any).badgeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white animate-pulse">
                  {(item as any).badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Action Area */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        {isAdmin && (
          <button
            onClick={onOpenNotifications}
            id="sidebar-btn-notifications"
            className="w-full flex items-center justify-between text-left text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg bg-slate-800/30 hover:bg-slate-800 border border-slate-800/50 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-teal-400" />
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
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Account Session</span>
        </button>
      </div>
    </aside>
  );
}
