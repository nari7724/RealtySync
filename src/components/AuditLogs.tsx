/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { History, Search, Filter, Loader2, UserCheck, Trash, RefreshCw, Calendar } from "lucide-react";
import { AuditLog } from "../types.ts";

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    const matchSearch = 
      log.userName.toLowerCase().includes(q) ||
      log.userEmail.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q);
    
    const matchRole = roleFilter ? log.userRole === roleFilter : true;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6" id="audit-logs-tab">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            Audit Trail & Compliance Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Immutable tracker registry monitor recording all administrative actions, agent registrations, deactivations, and conflict resolutions.</p>
        </div>

        <button 
          onClick={fetchLogs}
          className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-lg shadow-sm hover:shadow transition-all font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Ledger
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search records by Actor, Email, Action, or Target Module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 focus:outline-none focus:border-teal-500 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 border-t md:border-none pt-3 md:pt-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 min-w-[150px] cursor-pointer"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">ADMIN Only</option>
            <option value="AGENT">AGENT Only</option>
          </select>
        </div>
      </div>

      {/* Ledger Table Rendering */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-16 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-teal-700 dark:text-teal-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Querying secure compliance vault...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-16 text-center shadow-sm text-slate-450 dark:text-slate-500">
          <p className="text-sm text-slate-500 dark:text-slate-400">No matching security entries found matching filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden" id="audit-ledger-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Authorized User / Actor</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Action Event</th>
                  <th className="px-6 py-4">Affected Entity</th>
                  <th className="px-6 py-4">Value Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/60 text-sm">
                {(() => {
                  const sorted = [...filteredLogs].sort((a, b) => {
                    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return timeB - timeA;
                  });
                  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                  return paginated.map((log, index) => (
                    <tr 
                      key={log.id} 
                      className={`${
                        index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/30 dark:bg-slate-950/20"
                      } hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-350 dark:text-slate-650" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">{log.userName}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">{log.userEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
                          log.userRole === "ADMIN" 
                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/40" 
                            : "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-900/40"
                        }`}>
                          {log.userRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-semibold text-xs py-1 px-2.5 rounded-lg ${
                          log.action.includes("Duplicate") || log.action.includes("Deactivated") 
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300" 
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{log.entity}</td>
                      <td className="px-6 py-4 min-w-[300px]">
                        {log.newValue ? (
                          <div className="space-y-1.5 max-w-sm">
                            {log.previousValue && (
                              <div className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                <span className="font-bold uppercase text-[9px] mr-1">Prev:</span>
                                {log.previousValue}
                              </div>
                            )}
                            <div className="text-xs text-teal-850 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/30 p-2 border border-teal-100/50 dark:border-teal-900/50 rounded break-all max-h-24 overflow-y-auto font-mono">
                              <span className="font-bold uppercase text-[9px] mr-1 bg-teal-200/50 dark:bg-teal-900/50 px-1 py-0.5 rounded text-teal-900 dark:text-teal-200">New:</span> 
                              {log.newValue}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-450 dark:text-slate-500 italic">None logged.</span>
                        )}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination Footer */}
          {(() => {
            const totalItems = filteredLogs.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            if (totalPages <= 1) return null;
            return (
              <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between rounded-b-xl">
                <span className="text-xs text-slate-500 dark:text-slate-400">Page {currentPage} of {totalPages} ({totalItems} entries total)</span>
                <div className="flex gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-semibold"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-semibold"
                  >
                    Next
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
