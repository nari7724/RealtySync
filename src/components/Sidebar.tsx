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
  X,
  Sparkles,
  Settings,
  Mail
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
  mobileOpen?: boolean;
  onMobileClose?: () => void;
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
  onToggleTheme,
  mobileOpen = false,
  onMobileClose
}: SidebarProps) {
  const isAdmin = currentUser.role === UserRole.ADMIN;

  const adminMenu = [
    { id: "dashboard", label: "Broker Dashboard", icon: LayoutDashboard },
    { id: "agents", label: "Agent Management", icon: Users },
    { id: "clients", label: "Client Records", icon: UserCheck },
    { id: "bookings", label: "Appointments", icon: TrendingUp },
    { id: "conflicts", label: "Dual Entry Queue", icon: Layers, badgeCount: unreadCount },
    { id: "audit", label: "Audit Ledger", icon: History },
    { id: "reports", label: "Performance Reports", icon: FileText },
  ];

  const agentMenu = [
    { id: "dashboard", label: "Agent Console", icon: LayoutDashboard },
    { id: "clients", label: "My Clients", icon: UserCheck },
    { id: "bookings", label: "My Appointments", icon: TrendingUp },
  ];

  const activeMenu = isAdmin ? adminMenu : agentMenu;

  return (
    <aside className={`w-68 bg-slate-950 text-slate-300 flex flex-col h-screen shrink-0 border-r border-slate-900 shadow-xl fixed lg:static inset-y-0 left-0 z-50 transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-200 ease-in-out`} id="realtysync-sidebar">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white font-black text-sm tracking-widest shadow-lg shadow-teal-500/25">
            RS
          </div>
          <div>
            <h1 className="text-15px font-bold text-white tracking-tight flex items-center gap-1">
              RealtySync
            </h1>
            <span className="text-[9.5px] text-teal-400 font-bold uppercase tracking-widest">Enterprise Broker Suite</span>
          </div>
        </div>
        {onMobileClose && (
          <button 
            onClick={onMobileClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded cursor-pointer"
            id="sidebar-mobile-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Information Panel */}
      <div className="p-4 mx-3 my-4 bg-slate-900/60 rounded-xl border border-slate-900/80 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-950 border border-teal-800 flex items-center justify-center text-teal-300 font-bold uppercase text-sm shrink-0">
            {currentUser.firstName[0]}{currentUser.lastName[0]}
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-white text-xs tracking-tight truncate">
              {currentUser.firstName} {currentUser.lastName}
            </div>
            <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-1 pt-2.5 border-t border-slate-900/85">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-teal-950 text-teal-300 border border-teal-900/80 uppercase tracking-wider">
            {currentUser.role === UserRole.ADMIN ? "Admin" : "Agent"}
          </span>
          <button 
            type="button"
            onClick={() => onTabChange("settings")}
            className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold tracking-tight transition-colors flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Settings className="w-3 h-3 text-teal-500 animate-spin-slow" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto pt-2 scrollbar-thin scrollbar-thumb-slate-900">
        <div className="px-3 mb-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Main Console
        </div>
        
        {activeMenu.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              id={`nav-link-${item.id}`}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                isActive 
                  ? "bg-teal-600 text-white shadow-md shadow-teal-500/10" 
                  : "hover:bg-slate-900 text-slate-400 hover:text-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span>{item.label}</span>
              </div>

              {(item as any).badgeCount !== undefined && (item as any).badgeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                  {(item as any).badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Action Area */}
      <div className="p-4 border-t border-slate-905 bg-slate-1010/30 space-y-2 mt-auto">
        {isAdmin && (
          <button
            onClick={onOpenNotifications}
            id="sidebar-btn-notifications"
            className="w-full flex items-center justify-between text-left text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg bg-slate-900/30 hover:bg-slate-900 border border-slate-900/60 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-teal-400" />
              Recent Alerts
            </span>
            {unreadCount > 0 ? (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            ) : null}
          </button>
        )}

        <button
          onClick={onLogout}
          id="sidebar-btn-logout"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          <span>Exit Account Session</span>
        </button>
      </div>
    </aside>
  );
}
