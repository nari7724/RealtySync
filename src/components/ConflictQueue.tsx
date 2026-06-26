/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MessageModal } from "./MessageModal.tsx";
import { 
  Layers, 
  Search, 
  Filter, 
  ArrowRight, 
  Check, 
  X, 
  HelpCircle, 
  Loader2, 
  AlertTriangle,
  HeartCrack,
  Calendar,
  Sparkles,
  Link2,
  FileCheck,
  Eye
} from "lucide-react";
import { DualEntry, DualEntryStatus, Client } from "../types.ts";

interface ConflictQueueProps {
  onResolve: () => void;
  currentUser: any;
  initialSelectedConflictId?: string | null;
  onClearInitialSelectedConflictId?: () => void;
}

export function ConflictQueue({ 
  onResolve, 
  currentUser, 
  initialSelectedConflictId, 
  onClearInitialSelectedConflictId 
}: ConflictQueueProps) {
  const [conflicts, setConflicts] = useState<DualEntry[]>([]);
  const [rawEntries, setRawEntries] = useState<DualEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "resolved">("pending");
  const [resolvedSearch, setResolvedSearch] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState("all");
  const [viewingResolvedDetail, setViewingResolvedDetail] = useState<DualEntry | null>(null);
  const [resolvedCurrentPage, setResolvedCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [selectedConflict, setSelectedConflict] = useState<DualEntry | null>(null);
  const [resolving, setResolving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [msgModal, setMsgModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ isOpen: false, type: "success", title: "", message: "" });

  // Load Conflicts
  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dual-entries");
      if (res.ok) {
        const data = await res.json();
        setRawEntries(data);
        
        // Fulfill instruction: "Remove Conflicting Client details when conflict has been reviewed and resolved."
        const pendingConflicts = data.filter((entry: any) => {
          const s = (entry.status || "").toLowerCase();
          return s === "pending" || s === "pending review";
        });
        
        // Sort with latest record first
        const sorted = pendingConflicts.sort((a: any, b: any) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
        
        setConflicts(sorted);
        setCurrentPage(1);

        if (initialSelectedConflictId) {
          const matched = sorted.find((e: any) => e.id === initialSelectedConflictId);
          if (matched) {
            setSelectedConflict(matched);
            setActiveTab("pending");
          }
        }
      }
    } catch (err) {
      console.error("Error loading dual entries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  useEffect(() => {
    if (initialSelectedConflictId && conflicts.length > 0) {
      const matched = conflicts.find(e => e.id === initialSelectedConflictId);
      if (matched) {
        setSelectedConflict(matched);
      }
      onClearInitialSelectedConflictId?.();
    }
  }, [initialSelectedConflictId, conflicts]);

  const handleOpenDetail = (entry: DualEntry) => {
    setSelectedConflict(entry);
  };

  const handleResolveAction = async (action: "Mark Duplicate" | "Mark False Positive" | "Resolve", resolutionStatus: DualEntryStatus, winningClientIdx?: number) => {
    if (!selectedConflict) return;

    setConfirmDialog({
      title: "Resolve Overlapping Conflict",
      message: `Are you sure you want to resolve this match as '${action}'?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setResolving(true);
        try {
          const res = await fetch(`/api/dual-entries/${selectedConflict.id}/resolve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              resolutionStatus,
              winningClientIdx,
              userContext: {
                id: currentUser.id,
                email: currentUser.email,
                userName: `${currentUser.firstName} ${currentUser.lastName}`
              }
            }),
          });

          if (res.ok) {
            setSelectedConflict(null);
            fetchConflicts();
            onResolve();
            setMsgModal({
              isOpen: true,
              type: "success",
              title: "Conflict Resolved",
              message: `The conflict has been successfully resolved as '${action}'!`
            });
          } else {
            const errObj = await res.json();
            setMsgModal({
              isOpen: true,
              type: "error",
              title: "Resolution Failed",
              message: errObj.error || "Failed to resolve conflict."
            });
          }
        } catch (err: any) {
          console.error("Error resolving dual entry:", err);
          setMsgModal({
            isOpen: true,
            type: "error",
            title: "Resolution Failed",
            message: err.message || "An unexpected error occurred."
          });
        } finally {
          setResolving(false);
        }
      }
    });
  };

  // Difference highlight helper
  const renderValueAndDiff = (val: string, hasDiff: boolean) => {
    return (
      <span className={hasDiff ? "text-amber-800 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900/60" : "text-slate-800 dark:text-slate-300"}>
        {val || "—"}
      </span>
    );
  };

  // Derived Resolved Conflicts list
  const resolvedConflicts = rawEntries.filter((entry: any) => {
    const s = (entry.status || "").toLowerCase();
    const isPending = s === "pending" || s === "pending review";
    return !isPending;
  });

  const filteredResolved = resolvedConflicts.filter((entry: any) => {
    // Search filter
    const searchLower = resolvedSearch.toLowerCase();
    const matchesSearch = 
      entry.id.toLowerCase().includes(searchLower) ||
      entry.clientName.toLowerCase().includes(searchLower) ||
      (entry.agentNameA || "").toLowerCase().includes(searchLower) ||
      (entry.agentNameB || "").toLowerCase().includes(searchLower) ||
      (entry.clientIdA || "").toLowerCase().includes(searchLower) ||
      (entry.clientIdB || "").toLowerCase().includes(searchLower);

    // Dropdown filter
    const resolutionType = (entry.resolution || "").toLowerCase();
    const matchesFilter = 
      resolvedFilter === "all" ||
      (resolvedFilter === "false-positive" && resolutionType.includes("false positive")) ||
      (resolvedFilter === "duplicate" && resolutionType.includes("duplicate")) ||
      (resolvedFilter === "agent-b" && (resolutionType.includes("agent b") || resolutionType.includes("resolved") || resolutionType.includes("approved")));

    return matchesSearch && matchesFilter;
  }).sort((a: any, b: any) => {
    const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tB - tA; // latest resolved first
  });

  return (
    <div className="space-y-6" id="conflict-queue-module">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-teal-700 dark:text-teal-400" />
            Dual Entry Tracking Module
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review overlapping client submissions between multiple agents, inspect details side-by-side, and resolve booking ownership conflicts.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 self-start sm:self-auto shrink-0 font-sans">
          <button
            onClick={() => {
              setActiveTab("pending");
              setSelectedConflict(null);
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
            }`}
          >
            Pending Claims
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "pending" 
                ? "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400" 
                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              {conflicts.length}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("resolved");
              setViewingResolvedDetail(null);
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "resolved"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
            }`}
          >
            Resolved Archives
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "resolved" 
                ? "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400" 
                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              {filteredResolved.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === "pending" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Overlaps List Queue */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="bg-slate-50 dark:bg-slate-950 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Active Duplication Claims
            </h2>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <Loader2 className="w-6 h-6 text-teal-700 animate-spin mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-450">Scanning ledger conflicts...</p>
            </div>
          ) : conflicts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-450 dark:text-slate-400 dark:bg-slate-900">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-teal-600 mb-3 border border-slate-100 dark:border-slate-800">
                <FileCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Dual Conflicts Registered</p>
              <p className="text-xs text-slate-400 mt-1">All agent registries are cleanly indexed with 100% duplicate protection.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-150 dark:divide-slate-800 dark:bg-slate-900">
                {conflicts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((entry) => {
                  const isSelected = selectedConflict?.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => handleOpenDetail(entry)}
                      id={`conflict-card-${entry.id}`}
                      className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-all block relative border-l-3 ${
                        isSelected 
                          ? "border-l-teal-600 bg-teal-50/20 dark:bg-teal-950/20" 
                          : (entry.status === "Pending" || entry.status === "Pending Review")
                            ? "border-l-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800/40" 
                            : "border-l-slate-300 dark:border-l-slate-700"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5 gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{entry.clientName}</h3>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          entry.similarityScore >= 95 
                            ? "bg-red-100/80 dark:bg-red-950/80 text-red-700 dark:text-red-400" 
                            : "bg-amber-100/80 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400"
                        }`}>
                          {entry.similarityScore}% Risk
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Agent A:</span>
                          <span className="truncate">{entry.agentNameA}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Agent B:</span>
                          <span className="truncate">{entry.agentNameB}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100/70 dark:border-slate-800/70">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          (entry.status === "Pending" || entry.status === "Pending Review")
                            ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900" 
                            : entry.status === "False Positive"
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-700"
                              : "bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-150 dark:border-green-900"
                        }`}>
                          {entry.status}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Simple Pagination Footer */}
              {conflicts.length > itemsPerPage && (
                <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0">
                  <span className="text-[10px] text-slate-500">
                    Page {currentPage} of {Math.ceil(conflicts.length / itemsPerPage)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-semibold"
                    >
                      Prev
                    </button>
                    <button
                      disabled={currentPage === Math.ceil(conflicts.length / itemsPerPage)}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Side: Detailed Comparison Frame */}
        <div className="lg:col-span-2 space-y-6">
          {selectedConflict ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden" id="conflict-detail-view">
              {/* Card Header */}
              <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-md font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    Dual Entry Audit: {selectedConflict.clientName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Overlap Match Score: <strong className="text-amber-600 dark:text-amber-400">{selectedConflict.similarityScore}% Match</strong></p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                  (selectedConflict.status === "Pending" || selectedConflict.status === "Pending Review") ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}>
                  {selectedConflict.status}
                </span>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {/* Visual Connector tag */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-xs pointer-events-none">
                  VS
                </div>

                {/* Left Side: Agent A Submission */}
                <div className="space-y-4 border border-slate-100 dark:border-slate-800 rounded-xl p-4.5 bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Original Entry (Agent A)</span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mt-0.5">{selectedConflict.details.clientA.firstName} {selectedConflict.details.clientA.lastName}</h3>
                    </div>
                    <span className="text-[10px] font-bold bg-teal-900/10 text-teal-700 dark:text-teal-400 border border-teal-150 dark:border-teal-900 px-2 py-0.5 rounded-full uppercase">
                      Client A
                    </span>
                  </div>

                  <div className="space-y-3.5 text-sm">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Assigned Agent</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedConflict.agentNameA}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Registration Date</div>
                      <div className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 animate-pulse">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {new Date(selectedConflict.dateA).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Encoded Full Name</div>
                      <div>
                        {renderValueAndDiff(
                          `${selectedConflict.details.clientA.firstName} ${selectedConflict.details.clientA.middleName || ""} ${selectedConflict.details.clientA.lastName}`,
                          selectedConflict.details.differences.name
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Mobile Number</div>
                      <div>
                        {renderValueAndDiff(
                          selectedConflict.details.clientA.mobileNumber,
                          selectedConflict.details.differences.phone
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Address</div>
                      <div>
                        {renderValueAndDiff(
                          selectedConflict.details.clientA.address,
                          selectedConflict.details.differences.address
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Lead Source</div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium">{selectedConflict.details.clientA.sourceOfLead}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">FB Profile Link</div>
                      <div className="text-slate-700 dark:text-slate-300 font-mono text-xs truncate">{selectedConflict.details.clientA.facebookProfileLink || "—"}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Agent Notes</div>
                      <div className="text-slate-600 dark:text-slate-300 text-xs italic bg-white dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800">{selectedConflict.details.clientA.notes || "No notes logged."}</div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Agent B Submission */}
                <div className="space-y-4 border border-slate-100 dark:border-slate-800 rounded-xl p-4.5 bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Duplicate Claim (Agent B)</span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mt-0.5">{selectedConflict.details.clientB.firstName} {selectedConflict.details.clientB.lastName}</h3>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-900/10 text-amber-700 dark:text-amber-400 border border-amber-150 dark:border-amber-900 px-2 py-0.5 rounded-full uppercase">
                      Client B
                    </span>
                  </div>

                  <div className="space-y-3.5 text-sm">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Assigned Agent</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedConflict.agentNameB}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Registration Date</div>
                      <div className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 animate-pulse">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {new Date(selectedConflict.dateB).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Encoded Full Name</div>
                      <div>
                        {renderValueAndDiff(
                          `${selectedConflict.details.clientB.firstName} ${selectedConflict.details.clientB.middleName || ""} ${selectedConflict.details.clientB.lastName}`,
                          selectedConflict.details.differences.name
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Mobile Number</div>
                      <div>
                        {renderValueAndDiff(
                          selectedConflict.details.clientB.mobileNumber,
                          selectedConflict.details.differences.phone
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Address</div>
                      <div>
                        {renderValueAndDiff(
                          selectedConflict.details.clientB.address,
                          selectedConflict.details.differences.address
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Lead Source</div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium">{selectedConflict.details.clientB.sourceOfLead}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">FB Profile Link</div>
                      <div className="text-slate-700 dark:text-slate-300 font-mono text-xs truncate">{selectedConflict.details.clientB.facebookProfileLink || "—"}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Agent Notes</div>
                      <div className="text-slate-600 dark:text-slate-300 text-xs italic bg-white dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800">{selectedConflict.details.clientB.notes || "No notes logged."}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conflict Status Log Timeline of Activities */}
              <div className="px-6 pb-6 pt-2 border-t border-slate-550 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3.5">
                  Timeline of Claim Milestones
                </h4>
                <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  <div className="flex items-start gap-4 text-xs relative">
                    <div className="w-4 h-4 rounded-full bg-teal-100 border border-teal-500 shrink-0 z-10 flex items-center justify-center text-teal-800 font-bold">1</div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 font-sans">Original Profile Registered</p>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">Licensed agent <strong>{selectedConflict.agentNameA}</strong> successfully filed this profile under tracking systems.</p>
                      <span className="text-[10px] text-slate-400 block mt-1">{new Date(selectedConflict.dateA).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 text-xs relative">
                    <div className="w-4 h-4 rounded-full bg-amber-100 border border-amber-500 shrink-0 z-10 flex items-center justify-center text-amber-800 font-bold">2</div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 font-sans pb-0.5">Duplicate Submission Prompted</p>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">Agent <strong>{selectedConflict.agentNameB}</strong> claimed this client. Matching algorithms detected a <strong>{selectedConflict.similarityScore}% Risk Rating</strong>. Overrode warnings to complete registration anyway.</p>
                      <span className="text-[10px] text-slate-400 block mt-1">{new Date(selectedConflict.dateB).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrative Resolution Actions */}
              {(selectedConflict.status === "Pending" || selectedConflict.status === "Pending Review") && (
                <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-800 p-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="text-sm">
                    <strong className="text-slate-905 dark:text-slate-200 block font-semibold text-slate-900">Conflict Resolution Decision:</strong>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Determine ownership or dismiss overlapping client profiles below.</span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => handleResolveAction("Mark False Positive", "False Positive")}
                      disabled={resolving}
                      id="btn-resolve-false-positive"
                      className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 font-semibold rounded-lg text-xs cursor-pointer"
                    >
                      Mark False Positive
                    </button>
                    <button
                      onClick={() => handleResolveAction("Mark Duplicate", "Confirmed Duplicate", 0)} // original client A is core
                      disabled={resolving}
                      id="btn-resolve-confirmed-duplicate"
                      className="px-4 py-2 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 hover:bg-amber-150 border border-amber-200 dark:border-amber-900 font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Mark Duplicate (Keep Agent A)
                    </button>
                    <button
                      onClick={() => handleResolveAction("Resolve", "Resolved", 1)} // merge, Client B takes ownership
                      disabled={resolving}
                      id="btn-resolve-merge-b"
                      className="px-4 py-2 bg-teal-700 text-white hover:bg-teal-800 font-bold rounded-lg text-xs shadow-sm cursor-pointer"
                    >
                      Approve Agent B Claim
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center h-[600px] flex flex-col items-center justify-center">
              <Layers className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-350">No Conflict Selected</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Select any pending claim from the queue to run side-by-side variance analysis and confirm database ownership.</p>
            </div>
          )}
        </div>
      </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={resolvedSearch}
                onChange={(e) => {
                  setResolvedSearch(e.target.value);
                  setResolvedCurrentPage(1);
                }}
                placeholder="Search resolved claims..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-750 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-hidden font-medium text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter:
              </span>
              <select
                value={resolvedFilter}
                onChange={(e) => {
                  setResolvedFilter(e.target.value);
                  setResolvedCurrentPage(1);
                }}
                className="w-full md:w-56 px-3 py-1.5 border border-slate-200 dark:border-slate-750 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-semibold focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-hidden cursor-pointer"
              >
                <option value="all">All Resolutions</option>
                <option value="false-positive">False Positives</option>
                <option value="duplicate">Duplicates (Agent A original)</option>
                <option value="agent-b">Approved Agent B claim</option>
              </select>
            </div>
          </div>

          {/* Table list of resolved conflicts */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-800/85 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="py-3 px-4">Conflict ID</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Claimant Agent A</th>
                  <th className="py-3 px-4">Claimant Agent B</th>
                  <th className="py-3 px-4">Date Resolved</th>
                  <th className="py-3 px-4">Resolution Action</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredResolved.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-450 dark:text-slate-500 font-medium bg-slate-50/10 dark:bg-transparent">
                      <FileCheck className="w-8 h-8 text-slate-300 dark:text-slate-650 mx-auto mb-2" />
                      No resolved conflicts match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredResolved
                    .slice((resolvedCurrentPage - 1) * itemsPerPage, resolvedCurrentPage * itemsPerPage)
                    .map((entry: any) => {
                      const resolutionType = (entry.resolution || "").toLowerCase();
                      let badgeStyle = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                      if (resolutionType.includes("false positive")) {
                        badgeStyle = "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200/50 dark:border-green-900/40";
                      } else if (resolutionType.includes("duplicate")) {
                        badgeStyle = "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40";
                      } else if (resolutionType.includes("agent b") || resolutionType.includes("approved") || resolutionType.includes("resolved")) {
                        badgeStyle = "bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border border-teal-200/50 dark:border-teal-900/40";
                      }

                      const dateStr = entry.updatedAt || entry.createdAt || entry.dateB || entry.dateA;

                      return (
                        <tr 
                          key={entry.id} 
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-850/20 text-slate-700 dark:text-slate-300 transition-colors font-medium"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {entry.id}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                            {entry.clientName}
                          </td>
                          <td className="py-3 px-4">
                            <div>{entry.agentNameA || "—"}</div>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {entry.agentIdA}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div>{entry.agentNameB || "—"}</div>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {entry.agentIdB}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {dateStr ? new Date(dateStr).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeStyle}`}>
                              {entry.resolution || "Resolved"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setViewingResolvedDetail(entry)}
                              className="px-2.5 py-1 text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:text-white hover:bg-teal-700 rounded-md border border-teal-200 dark:border-teal-900/60 transition-colors cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredResolved.length > itemsPerPage && (
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-450 dark:text-slate-500">
                Showing {Math.min(filteredResolved.length, (resolvedCurrentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredResolved.length, resolvedCurrentPage * itemsPerPage)} of {filteredResolved.length} records
              </span>
              <div className="flex gap-2">
                <button
                  disabled={resolvedCurrentPage === 1}
                  onClick={() => setResolvedCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-md border text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Prev
                </button>
                <button
                  disabled={resolvedCurrentPage * itemsPerPage >= filteredResolved.length}
                  onClick={() => setResolvedCurrentPage(prev => prev + 1)}
                  className="px-3 py-1.5 rounded-md border text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {viewingResolvedDetail && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden text-left flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-600" />
                  Resolved claim audit details
                </h3>
                <p className="text-slate-450 dark:text-slate-500 text-[11px] font-medium font-mono uppercase">Conflict ID: {viewingResolvedDetail.id}</p>
              </div>
              <button
                onClick={() => setViewingResolvedDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Resolution Action Summary */}
              <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100/60 dark:border-teal-900/40 rounded-xl space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">Resolution summary</div>
                <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  <div><span className="font-bold text-slate-800 dark:text-slate-200">Resolution Decision:</span> {viewingResolvedDetail.resolution || "Resolved"}</div>
                  <div><span className="font-bold text-slate-800 dark:text-slate-200">Date Resolved:</span> {new Date(viewingResolvedDetail.updatedAt || viewingResolvedDetail.createdAt || "").toLocaleString()}</div>
                </div>
              </div>

              {/* Side by side overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Agent A Submission */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 space-y-4">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500 border-b pb-1.5 border-slate-100 dark:border-slate-800">
                    Agent A Submission Details
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">Submitter Agent:</span>
                      <strong className="text-slate-900 dark:text-slate-100">{viewingResolvedDetail.agentNameA}</strong>
                      <div className="text-[10px] font-mono mt-0.5">ID: {viewingResolvedDetail.agentIdA}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">Client Profile:</span>
                      <strong className="text-slate-900 dark:text-slate-100">
                        {viewingResolvedDetail.details?.clientA 
                          ? `${viewingResolvedDetail.details.clientA.firstName} ${viewingResolvedDetail.details.clientA.lastName}` 
                          : viewingResolvedDetail.clientName}
                      </strong>
                      <div className="text-[10px] font-mono mt-0.5">ID: {viewingResolvedDetail.clientIdA}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">Submission Date:</span>
                      <div className="font-mono text-[11px]">
                        {viewingResolvedDetail.dateA ? new Date(viewingResolvedDetail.dateA).toLocaleString() : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent B Submission */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 space-y-4">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500 border-b pb-1.5 border-slate-100 dark:border-slate-800">
                    Agent B Submission Details
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">Submitter Agent:</span>
                      <strong className="text-slate-900 dark:text-slate-100">{viewingResolvedDetail.agentNameB}</strong>
                      <div className="text-[10px] font-mono mt-0.5">ID: {viewingResolvedDetail.agentIdB}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">Client Profile:</span>
                      <strong className="text-slate-900 dark:text-slate-100">
                        {viewingResolvedDetail.details?.clientB 
                          ? `${viewingResolvedDetail.details.clientB.firstName} ${viewingResolvedDetail.details.clientB.lastName}` 
                          : viewingResolvedDetail.clientName}
                      </strong>
                      <div className="text-[10px] font-mono mt-0.5">ID: {viewingResolvedDetail.clientIdB}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">Submission Date:</span>
                      <div className="font-mono text-[11px]">
                        {viewingResolvedDetail.dateB ? new Date(viewingResolvedDetail.dateB).toLocaleString() : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 flex justify-end shrink-0">
              <button
                onClick={() => setViewingResolvedDetail(null)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-800 shadow-2xl max-w-sm w-full overflow-hidden shrink-0 text-left">
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-105 text-sm leading-snug">{confirmDialog.title}</h3>
                <p className="text-slate-505 dark:text-slate-400 text-xs mt-2 leading-relaxed">{confirmDialog.message}</p>
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border dark:border-slate-800"
                >
                  No, Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#00786f] hover:bg-[#005e57] transition-all cursor-pointer shadow-sm animate-scale-up"
                >
                  Confirm & Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <MessageModal
        isOpen={msgModal.isOpen}
        type={msgModal.type}
        title={msgModal.title}
        message={msgModal.message}
        onClose={() => setMsgModal({ ...msgModal, isOpen: false })}
      />
    </div>
  );
}
