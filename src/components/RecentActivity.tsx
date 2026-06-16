/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  History, 
  UserCheck, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Layers, 
  PlusCircle, 
  UserPlus, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Settings
} from "lucide-react";
import { AuditLog, User, UserRole } from "../types.ts";

interface RecentActivityProps {
  logs: AuditLog[];
  loading: boolean;
  currentUser: User | null;
}

export function RecentActivity({ logs, loading, currentUser }: RecentActivityProps) {
  // Format relative time helper
  const getRelativeTime = (timestampStr: string): string => {
    try {
      const past = new Date(timestampStr);
      const now = new Date();
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      return past.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  // Determine which activity entry to draw
  const getActionMetadata = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("duplicate") || act.includes("conflict")) {
      return {
        icon: AlertTriangle,
        colorClass: "bg-amber-50 text-amber-700 border-amber-100",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200/50"
      };
    }
    if (act.includes("resolved") || act.includes("false positive")) {
      return {
        icon: CheckCircle,
        colorClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/50"
      };
    }
    if (act.includes("registered") || act.includes("client registered")) {
      return {
        icon: UserCheck,
        colorClass: "bg-teal-50 text-teal-700 border-teal-100",
        badgeClass: "bg-teal-50 text-teal-700 border-teal-200/50"
      };
    }
    if (act.includes("booking") || act.includes("status to")) {
      return {
        icon: FileText,
        colorClass: "bg-indigo-50 text-indigo-700 border-indigo-100",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/50"
      };
    }
    if (act.includes("agent account") || act.includes("created")) {
      return {
        icon: UserPlus,
        colorClass: "bg-blue-50 text-blue-700 border-blue-100",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200/50"
      };
    }
    return {
      icon: History,
      colorClass: "bg-slate-50 text-slate-700 border-slate-100",
      badgeClass: "bg-slate-50 text-slate-700 border-slate-200/50"
    };
  };

  const isAgent = currentUser?.role === UserRole.AGENT;

  // Filter logs specifically if agent, else show all
  const filteredLogs = logs
    .filter((log) => {
      if (isAgent && currentUser) {
        // Only show actions they did or actions involving their clients (where they are targeted)
        return log.userEmail === currentUser.email || log.userId === currentUser.id;
      }
      return true;
    })
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6" id="dashboard-recent-activity-feed">
      {/* Feed Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 select-none" id="recent-activity-title">
            <History className="w-5 h-5 text-teal-600 animate-pulse" />
            {isAgent ? "My Activity Log Feed" : "Recent Platform Activity Trail"}
          </h3>
          <p className="text-xs text-slate-455">
            {isAgent 
              ? "Immutable log registry tracking your recent registration actions and client submissions."
              : "Consolidated system events audit trail covering double registrations, broker audits, and status flags."}
          </p>
        </div>
        <div className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 rounded px-2 py-1 font-mono font-semibold">
          LIVE STATUS
        </div>
      </div>

      {/* Connection States */}
      {loading ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium">Synchronizing activity pipeline...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-700">No activity logged</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Any future registration and reservation updates will log here.</p>
        </div>
      ) : (
        /* Timeline Feed */
        <div className="relative pl-4 space-y-5 border-l-2 border-slate-100/80">
          {filteredLogs.map((log) => {
            const meta = getActionMetadata(log.action);
            const IconComponent = meta.icon;

            return (
              <div key={log.id} className="relative group/item" id={`activity-item-${log.id}`}>
                {/* Visual Connector Dot */}
                <div className={`absolute -left-[27px] top-1 w-[12px] h-[12px] rounded-full border-2 border-white ${
                  log.action.toLowerCase().includes("duplicate") ? "bg-amber-500" : "bg-teal-600"
                }`}></div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 bg-slate-50/50 hover:bg-slate-50 p-3.5 border border-slate-100/60 rounded-xl transition-all">
                  <div className="flex items-start gap-3">
                    {/* Circle Icon Indicator */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${meta.colorClass}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-slate-700">
                        <span className="font-extrabold text-slate-900">{log.userName === currentUser?.firstName + " " + currentUser?.lastName ? "You" : log.userName}</span>
                        {" "}<span className="text-slate-500 font-medium font-mono text-[11px]">[{log.action}]</span>{" "}
                        <span className="font-extrabold text-teal-950">{log.entity}</span>
                      </div>
                      
                      {/* Optional display for previous / new changes */}
                      {log.newValue && !log.newValue.startsWith("{") && (
                        <div className="text-[10px] text-slate-500 bg-white border border-slate-100 rounded px-1.5 py-0.5 inline-block font-mono">
                          Value: <span className="font-bold text-slate-800">{log.newValue}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {getRelativeTime(log.timestamp)}
                        </span>
                        {!isAgent && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${meta.badgeClass}`}>
                            {log.userRole}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] text-slate-400 font-mono select-all truncate max-w-[120px]">{log.userEmail}</span>
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-350 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all shrink-0 self-center hidden sm:block" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
