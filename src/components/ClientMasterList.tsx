/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  UserCheck, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  Edit3, 
  BookOpen, 
  Loader2, 
  X, 
  Building2, 
  User, 
  Check, 
  ClipboardList,
  Flame,
  Globe,
  ShieldAlert,
  HeartCrack
} from "lucide-react";
import { Client, Agent, Booking, BookingStatus, UserRole } from "../types.ts";
import { ClientForm } from "./ClientForm.tsx";
import { MessageModal } from "./MessageModal.tsx";

interface ClientMasterListProps {
  currentUser: { id: string; firstName: string; lastName: string; role: UserRole };
  agentsList: Agent[];
  onTriggerForm?: () => void;
  triggerRefreshStamp: number;
  autoOpenForm?: boolean;
  setAutoOpenForm?: (val: boolean) => void;
  onTabChange?: (tab: string) => void;
  onSelectConflictId?: (id: string | null) => void;
}

export function ClientMasterList({ 
  currentUser, 
  agentsList, 
  onTriggerForm, 
  triggerRefreshStamp,
  autoOpenForm,
  setAutoOpenForm,
  onTabChange,
  onSelectConflictId
}: ClientMasterListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedDupStatus, setSelectedDupStatus] = useState("");
  const [loading, setLoading] = useState(true);

  // Modals status
  const [bookingClient, setBookingClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedOverlapClient, setSelectedOverlapClient] = useState<Client | null>(null);
  const [allDualEntries, setAllDualEntries] = useState<any[]>([]);
  const [realtyProjects, setRealtyProjects] = useState<{ name: string; address?: string }[]>([]);

  // Custom Add Client Modal triggers
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // Custom Confirm Overlay State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // New Appointment Form States
  const [bookingFormData, setBookingFormData] = useState({
    appointmentType: "Site Visit" as any,
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: "10:00",
    location: "",
    notes: "",
    status: "Open" as any,
  });
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [msgModal, setMsgModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ isOpen: false, type: "success", title: "", message: "" });
  const [addressInputFocused, setAddressInputFocused] = useState(false);

  // Edit Client Form State
  const [clientFormData, setClientFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    mobileNumber: "",
    address: "",
    facebookProfileLink: "",
    sourceOfLead: "",
    notes: "",
  });
  const [clientSaving, setClientSaving] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      let url = `/api/clients?page=${page}&limit=${limit}`;
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      
      // If agent role: force client-scoping to own id!
      if (currentUser.role === UserRole.AGENT) {
        params.append("agentId", currentUser.id);
      } else if (selectedAgent) {
        params.append("agentId", selectedAgent);
      }

      if (selectedDupStatus) {
        params.append("duplicateStatus", selectedDupStatus);
      }

      const queryString = params.toString();
      if (queryString) {
        url += `&${queryString}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients);
        setTotal(data.total);
        setTotalPages(data.pages);
      }
    } catch (err) {
      console.error("Error loading client profiles:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDualEntries = async () => {
    try {
      const res = await fetch("/api/dual-entries");
      if (res.ok) {
        const data = await res.json();
        setAllDualEntries(data);
      }
    } catch (e) {
      console.error("Error fetching dual entries:", e);
    }
  };

  const fetchRealtyProjects = async () => {
    try {
      const res = await fetch("/api/realty-projects");
      if (res.ok) {
        const data = await res.json();
        setRealtyProjects(data);
      }
    } catch (e) {
      console.error("Error fetching projects:", e);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchDualEntries();
    fetchRealtyProjects();
  }, [page, search, selectedAgent, selectedDupStatus, triggerRefreshStamp]);

  useEffect(() => {
    if (autoOpenForm) {
      setShowAddClientModal(true);
      if (setAutoOpenForm) {
        setAutoOpenForm(false);
      }
    }
  }, [autoOpenForm, setAutoOpenForm]);

  const handleBookingOpen = (client: Client) => {
    setBookingClient(client);
    setBookingError(null);
    setBookingFormData({
      appointmentType: "Site Visit",
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: "10:00",
      location: "",
      status: "Open",
      notes: "",
    });
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingClient) return;
    setBookingError(null);

    // Dynamic, strict client-side validation
    if (!bookingFormData.appointmentDate) {
      setBookingError("Please select a valid appointment date.");
      return;
    }
    if (!bookingFormData.appointmentTime) {
      setBookingError("Please specify a scheduled time (e.g., 10:00).");
      return;
    }
    if (String(bookingFormData.appointmentType).toLowerCase() === "site visit" && !bookingFormData.location.trim()) {
      setBookingError("Please input a designated location for the site visit.");
      return;
    }

    const combinedDateTime = `${bookingFormData.appointmentDate}T${bookingFormData.appointmentTime}`;

    setConfirmDialog({
      title: "Confirm Appointment schedule",
      message: `Are you sure you want to save and schedule this ${bookingFormData.appointmentType} appointment?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setBookingSaving(true);
        try {
          const res = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: bookingClient.id,
              appointmentType: bookingFormData.appointmentType,
              appointmentDate: bookingFormData.appointmentDate,
              appointmentTime: bookingFormData.appointmentTime,
              dateTime: combinedDateTime,
              location: bookingFormData.location,
              status: bookingFormData.status || "Open",
              notes: bookingFormData.notes,
              userContext: {
                id: currentUser.id,
                userName: `${currentUser.firstName} ${currentUser.lastName}`,
                role: currentUser.role
              }
            }),
          });

          if (!res.ok) {
            const errData = await res.json();
            const errMsg = errData.error || "The client already has an appointment scheduled at this exact date and time. Please select another slot.";
            setBookingError(errMsg);
            setMsgModal({
              isOpen: true,
              type: "error",
              title: "Appointment Failed",
              message: errMsg
            });
            return;
          }

          setBookingClient(null);
          fetchClients();
          setMsgModal({
            isOpen: true,
            type: "success",
            title: "Appointment Scheduled",
            message: "Successfully scheduled your appointment!"
          });
        } catch (err: any) {
          console.error("Appointment creation error:", err);
          const errMsg = "Failed to schedule appointment. Please check network connectivity.";
          setBookingError(errMsg);
          setMsgModal({
            isOpen: true,
            type: "error",
            title: "Appointment Failed",
            message: errMsg
          });
        } finally {
          setBookingSaving(false);
        }
      }
    });
  };

  const handleSurrenderClaim = async (client: Client) => {
    setConfirmDialog({
      title: "Voluntary Claim Surrender",
      message: `Are you sure you want to voluntarily surrender your claim on '${client.firstName} ${client.lastName}'? This will permanently delete your client registry profile and resolve any overlapping agent conflicts.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setLoading(true);
        try {
          const res = await fetch(`/api/clients/${client.id}/surrender`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userContext: currentUser })
          });
          if (res.ok) {
            fetchClients();
            fetchDualEntries();
            setMsgModal({
              isOpen: true,
              type: "success",
              title: "Claim Surrendered",
              message: `Successfully surrendered your claim on '${client.firstName} ${client.lastName}'.`
            });
          } else {
            const errObj = await res.json();
            setMsgModal({
              isOpen: true,
              type: "error",
              title: "Surrender Failed",
              message: errObj.error || "Failed to surrender claim."
            });
          }
        } catch (err: any) {
          console.error("Error surrendering claim:", err);
          setMsgModal({
            isOpen: true,
            type: "error",
            title: "Surrender Failed",
            message: err.message || "An unexpected error occurred while surrendering."
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleEditOpen = (client: Client) => {
    setEditingClient(client);
    setClientFormData({
      firstName: client.firstName,
      middleName: client.middleName || "",
      lastName: client.lastName,
      mobileNumber: client.mobileNumber,
      address: client.address,
      facebookProfileLink: client.facebookProfileLink || "",
      sourceOfLead: client.sourceOfLead || "",
      notes: client.notes || "",
    });
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    setConfirmDialog({
      title: "Update Client Profile Details",
      message: "Are you sure you want to save and update these client profile details?",
      onConfirm: async () => {
        setConfirmDialog(null);
        setClientSaving(true);
        try {
          const res = await fetch(`/api/clients/${editingClient.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...clientFormData,
              userContext: {
                id: currentUser.id,
                userName: `${currentUser.firstName} ${currentUser.lastName}`,
                role: currentUser.role
              }
            }),
          });

          if (res.ok) {
            setEditingClient(null);
            fetchClients();
            setMsgModal({
              isOpen: true,
              type: "success",
              title: "Client Updated",
              message: "Successfully updated client details."
            });
          } else {
            const errObj = await res.json();
            setMsgModal({
              isOpen: true,
              type: "error",
              title: "Update Failed",
              message: errObj.error || "Failed to update client."
            });
          }
        } catch (err: any) {
          console.error("Client update error:", err);
          setMsgModal({
            isOpen: true,
            type: "error",
            title: "Update Failed",
            message: err.message || "An unexpected error occurred while updating client."
          });
        } finally {
          setClientSaving(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6" id="client-index-panel">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-teal-700 dark:text-teal-400 font-bold" />
            {currentUser.role === UserRole.ADMIN ? "Broker Client Registries" : "My Assigned Client Base"}
          </h1>
          <p className="text-sm text-slate-505 dark:text-slate-400 mt-1">
            {currentUser.role === UserRole.ADMIN 
              ? "Comprehensive list of all registered clients, owning agents, and duplicate flags." 
              : "Track and organize your direct leads, view registration states, and submit reservation reservations."}
          </p>
        </div>

        <button
          onClick={() => setShowAddClientModal(true)}
          id="btn-trigger-register-client"
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Client Profile
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-450" />
          <input
            type="text"
            id="client-search-bar"
            placeholder="Search by Client ID, Client Name, mobile, fb URL, or owning agent..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0 border-t lg:border-none pt-3 lg:pt-0 dark:border-slate-800">
          <Filter className="w-4 h-4 text-slate-450" />
          
          {currentUser.role === UserRole.ADMIN && (
            <select
              value={selectedAgent}
              id="filter-agent-toggle"
              onChange={(e) => {
                setSelectedAgent(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 min-w-[150px] cursor-pointer"
            >
              <option value="">All Agents</option>
              {agentsList.map(a => (
                <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
              ))}
            </select>
          )}

          <select
            value={selectedDupStatus}
            id="filter-duplicate-toggle"
            onChange={(e) => {
              setSelectedDupStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-755 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 min-w-[150px] cursor-pointer"
          >
			<option value="None">Clean Record</option>
            <option value="">All</option>
            <option value="Possible">Possible Duplicates</option>
            <option value="Strong">Strong Duplicates</option>
          </select>
        </div>
      </div>

      {/* Main clients logs table */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-24 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-400 font-medium">Scanning client registers...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-16 text-center shadow-sm text-slate-450 dark:text-slate-400">
          <p className="text-sm text-slate-500">No client listings found matching filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden" id="clients-main-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100 dark:border-slate-804">
                  <th className="px-6 py-4">Client ID</th>
                  <th className="px-6 py-4">Client Information</th>
                  {currentUser.role === UserRole.ADMIN && (
                    <th className="px-6 py-4">Agent Details</th>
                  )}
                  <th className="px-6 py-4">SaaS Overlap Integrity</th>
                  <th className="px-6 py-4 flex-1">Registration Timeline</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/80 text-sm">
                {clients.map((client, index) => (
                  <tr 
                    key={client.id} 
                    className={`${
                      index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/30 dark:bg-slate-950/20"
                    } hover:bg-slate-50/40 dark:hover:bg-slate-950/40 transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleEditOpen(client)}
                        className="font-mono font-bold text-xs text-teal-700 hover:underline hover:text-teal-800 cursor-pointer"
                        title="Click to edit client"
                      >
                        {client.id}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 leading-snug">{client.firstName} {client.middleName ? `${client.middleName} ` : ""}{client.lastName}</div>
                        <div className="text-xs text-slate-600 font-semibold font-mono">{client.mobileNumber}</div>
                        <div className="text-xs text-slate-500 font-medium" title={client.address}>{client.address}</div>
                        {client.facebookProfileLink && (
                          <div className="text-[11px] text-teal-600 font-mono font-medium truncate max-w-[280px] bg-slate-50 border border-slate-100/50 px-1.5 py-0.5 rounded inline-block">
                            {client.facebookProfileLink}
                          </div>
                        )}
                      </div>
                    </td>
                    {currentUser.role === UserRole.ADMIN && (
                      <td className="px-6 py-4">
                        <div className="text-xs space-y-1">
                           <div className="font-bold text-slate-900">
                             {client.assignedAgentName || "No Agent"}
                           </div>
                           <div className="font-mono text-slate-500 text-[10px]">
                             ID: {client.assignedAgentId || "—"}
                           </div>
                         </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {client.duplicateStatus === "Strong" ? (
                        <button
                          onClick={() => setSelectedOverlapClient(client)}
                          title="Click to view duplicate details & legend"
                          type="button"
                          className="inline-flex items-center gap-1 bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded border border-red-100 uppercase tracking-wide animate-pulse cursor-pointer hover:bg-red-100 transition-all text-left"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Strong Duplicate
                        </button>
                      ) : client.duplicateStatus === "Possible" ? (
                        <button
                          onClick={() => setSelectedOverlapClient(client)}
                          title="Click to view duplicate details & legend"
                          type="button"
                          className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wide cursor-pointer hover:bg-amber-100 transition-all text-left"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Possible Duplicate
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedOverlapClient(client)}
                          title="Click to view duplicate system legend"
                          type="button"
                          className="inline-flex items-center gap-1 bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded border border-green-100 uppercase tracking-wide cursor-pointer hover:bg-green-100 transition-all text-left"
                        >
                          Clean Record
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs font-mono">
                      {new Date(client.dateRegistered).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center items-center gap-2">
                        {client.duplicateStatus === "None" || !client.duplicateStatus ? (
                          <>
                            <button
                              onClick={() => handleBookingOpen(client)}
                              id={`client-book-btn-${client.id}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-sm inline-flex items-center gap-1 cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Set Appointment
                            </button>

                            <button
                              onClick={() => handleEditOpen(client)}
                              id={`client-edit-btn-${client.id}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-sm inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          </>
                        ) : (() => {
                          const matchingDual = allDualEntries.find(d => 
                            (d.clientIdA === client.id || d.clientIdB === client.id)
                          );
                          const isPendingReview = matchingDual ? (matchingDual.status === "Pending" || matchingDual.status === "Pending Review") : false;

                          if (matchingDual) {
                            const isResolved = !isPendingReview;
                            const notClean = client.duplicateStatus && client.duplicateStatus !== "None";

                            if (currentUser.role === UserRole.ADMIN) {
                              if (isResolved && notClean) {
                                return (
                                  <button
                                    disabled
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-850 border border-slate-350 dark:border-slate-700 inline-flex items-center gap-1 opacity-95 cursor-default"
                                  >
                                    {matchingDual.resolution || matchingDual.status}
                                  </button>
                                );
                              } else if (isPendingReview) {
                                return (
                                  <button
                                    onClick={() => {
                                      if (matchingDual) {
                                        onSelectConflictId?.(matchingDual.id);
                                      }
                                      onTabChange?.("conflicts");
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all shadow-sm inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Resolve
                                  </button>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                    {matchingDual.resolution || matchingDual.status}
                                  </span>
                                );
                              }
                            } else {
                              // AGENT ROLE
                              if (isResolved && notClean) {
                                return (
                                  <button
                                    disabled
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-850 border border-slate-350 dark:border-slate-700 inline-flex items-center gap-1 opacity-95 cursor-default"
                                  >
                                    {matchingDual.resolution || matchingDual.status}
                                  </button>
                                );
                              } else if (isPendingReview) {
                                return (
                                  <button
                                    onClick={() => handleSurrenderClaim(client)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <HeartCrack className="w-3.5 h-3.5" />
                                    Surrender Claim
                                  </button>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                    {matchingDual.resolution || matchingDual.status}
                                  </span>
                                );
                              }
                            }
                          }

                          return null;
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination Footer */}
          {totalPages > 1 && (
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">Page {page} of {totalPages} ({total} entries total)</span>
              <div className="flex gap-1.5">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 border border-slate-200 text-slate-600 rounded text-xs font-semibold"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 border border-slate-200 text-slate-600 rounded text-xs font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlap Status Legend */}
      <div className="mt-5 p-5 bg-slate-55 border border-slate-200 rounded-xl bg-slate-50" id="overlap-status-legend">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-slate-500" />
          Overlap Status Legend
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div className="flex gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 bg-emerald-500" />
            <div>
              <span className="font-bold text-slate-800 block">Clean Record</span>
              <span className="text-slate-500 mt-0.5 block">No duplicate profiles found. All appointment scheduling features are fully unlocked.</span>
            </div>
          </div>
          <div className="flex gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 bg-amber-500" />
            <div>
              <span className="font-bold text-slate-800 block">Possible Duplicate</span>
              <span className="text-slate-500 mt-0.5 block">Potential similarity match context identified. Appointments are locked until cleared.</span>
            </div>
          </div>
          <div className="flex gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 bg-red-550 bg-red-500" />
            <div>
              <span className="font-bold text-slate-800 block">Strong Duplicate</span>
              <span className="text-slate-500 mt-0.5 block">High similarity match detected in databases. Requires administrative merge resolution to resume.</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL WINDOWS A: SET AN APPOINTMENT FOR SELECTED CLIENT */}
      {bookingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="booking-modal-overlay">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shrink-0">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-md">Set an Appointment</h3>
              </div>
              <button onClick={() => setBookingClient(null)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Dynamic Error Indicator */}
              {bookingError && (
                <div className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 p-3 rounded-lg text-xs font-semibold flex items-start gap-2 border border-red-100 dark:border-red-900 animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-650" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Target Customer Details */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Client Information</div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{bookingClient.firstName} {bookingClient.middleName ? `${bookingClient.middleName} ` : ""}{bookingClient.lastName}</div>
                <div>Client ID: <span className="font-mono font-bold text-teal-700 bg-teal-50 dark:bg-teal-950 px-1.5 py-0.5 rounded border dark:border-teal-900">{bookingClient.id}</span></div>
                <div>Contact: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{bookingClient.mobileNumber}</span></div>
                <div className="text-slate-500 dark:text-slate-400 truncate" title={bookingClient.address}>Address: <span className="font-semibold text-slate-700 dark:text-slate-300">{bookingClient.address}</span></div>
                {bookingClient.facebookProfileLink && (
                  <div className="text-slate-500 dark:text-slate-450 truncate">Social Media Link: <span className="font-mono text-teal-650 dark:text-teal-450 font-bold">{bookingClient.facebookProfileLink}</span></div>
                )}
                <div className="text-slate-405 mt-1 dark:text-slate-400">Agent Representative: <strong className="text-slate-650 dark:text-slate-300">{bookingClient.assignedAgentName}</strong></div>
              </div>

              {/* Appointment Type Select Box */}
              <div>
                <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-1.5">Appointment Type *</label>
                <select
                  value={bookingFormData.appointmentType}
                  id="booking-input-type"
                  onChange={(e) => setBookingFormData({ ...bookingFormData, appointmentType: e.target.value as any, location: "" })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="Site Visit">Site Visit</option>
                  <option value="Reservation">Reservation</option>
                  <option value="Submit Requirements">Submit Requirements</option>
                  <option value="Payment">Payment</option>
                  <option value="Inquiry">Inquiry</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Release of Title">Release of Title</option>
                </select>
              </div>

              {/* Location Input (Only shown if Site Visit) */}
              {String(bookingFormData.appointmentType).toLowerCase() === "site visit" && (
                <div className="animate-fade-in text-slate-550 dark:text-slate-450 space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-1.5">Site Visit Location *</label>
                    <select
                      required
                      id="booking-input-location"
                      value={bookingFormData.location}
                      onChange={(e) => setBookingFormData({ ...bookingFormData, location: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-205 focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value="">Select a Realty Project...</option>
                      {realtyProjects.map((proj) => (
                        <option key={proj.name} value={proj.name}>{proj.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-[#1d293d] dark:text-[#1d293d] uppercase tracking-wider mb-1">Project Complete Location Address</label>
                    <input
                      type="text"
                      readOnly
                      onFocus={() => setAddressInputFocused(true)}
                      onBlur={() => setAddressInputFocused(false)}
                      value={realtyProjects.find(p => p.name === bookingFormData.location)?.address || ""}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold text-slate-650 dark:text-slate-350 focus:outline-none cursor-not-allowed"
                    />
                    {addressInputFocused && !(realtyProjects.find(p => p.name === bookingFormData.location)?.address) && (
                      <small className="block mt-1 text-red-650 dark:text-red-400 font-bold transition-all animate-pulse">Required field</small>
                    )}
                  </div>
                </div>
              )}

              {/* Date Picker and Time Picker */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-1.5">Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    id="booking-input-date"
                    value={bookingFormData.appointmentDate}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, appointmentDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-1.5">Scheduled Time *</label>
                  <input
                    type="time"
                    required
                    id="booking-input-time"
                    value={bookingFormData.appointmentTime}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, appointmentTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              {/* Remarks Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-1.5">Remarks / Notes</label>
                <textarea
                  id="booking-input-notes"
                  value={bookingFormData.notes}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, notes: e.target.value })}
                  placeholder="Enter initial schedules notes, requirements to bring, etc."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 text-xs">
                <button
                  type="submit"
                  disabled={bookingSaving}
                  id="btn-booking-save-submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-[#00786f] hover:bg-[#005e57] disabled:bg-[#00786f]/50 rounded-lg shadow inline-flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {bookingSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setBookingClient(null)}
                  className="px-4 py-2 text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-lg shadow border border-transparent hover:shadow cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL WINDOWS B: EDIT SELECTED CLIENT METADATA */}
      {editingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="client-edit-modal-overlay">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden shrink-0">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-md">Edit Client Profile</h3>
              <button onClick={() => setEditingClient(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClientSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={clientFormData.firstName}
                    onChange={(e) => setClientFormData({ ...clientFormData, firstName: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={clientFormData.middleName}
                    onChange={(e) => setClientFormData({ ...clientFormData, middleName: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={clientFormData.lastName}
                    onChange={(e) => setClientFormData({ ...clientFormData, lastName: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={clientFormData.mobileNumber}
                  onChange={(e) => setClientFormData({ ...clientFormData, mobileNumber: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={clientFormData.address}
                  onChange={(e) => setClientFormData({ ...clientFormData, address: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Facebook URL</label>
                <input
                  type="text"
                  value={clientFormData.facebookProfileLink}
                  onChange={(e) => setClientFormData({ ...clientFormData, facebookProfileLink: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Remarks / Remarks</label>
                <textarea
                  value={clientFormData.notes}
                  onChange={(e) => setClientFormData({ ...clientFormData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 text-xs">
                <button
                  type="submit"
                  disabled={clientSaving}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#00786f] hover:bg-[#005e57] rounded-lg shadow cursor-pointer transition-all disabled:bg-[#00786f]/50"
                >
                  {clientSaving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-lg shadow border border-transparent hover:shadow cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SaaS OVERLAP INTEGRITY BREAKDOWN & LEGEND MODAL */}
      {selectedOverlapClient && (() => {
        const matchEntry = allDualEntries.find(
          d => d.clientIdA === selectedOverlapClient.id || d.clientIdB === selectedOverlapClient.id
        );

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="overlap-integrity-modal">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden">
              
              {/* Header */}
              <div className="bg-teal-5 depth-50 dark:bg-slate-950 border-b border-teal-100 dark:border-slate-800 p-5 flex items-start gap-4">
                <div className="p-2.5 bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-400 rounded-full shrink-0">
                  <ClipboardList className="w-6 h-6 text-teal-700 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    SaaS Overlap Integrity Details
                  </h3>
                  <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                    System screening record for duplicates, registered agents, and overlap statistics.
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedOverlapClient(null)} 
                  className="text-slate-400 hover:text-slate-650 p-1 rounded-full cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content body */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
                
                {/* Active Client Details */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 tracking-wider">Screened Client Information</span>
                  <div className="grid grid-cols-2 gap-4 text-xs mt-1">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Full Name:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {selectedOverlapClient.firstName} {selectedOverlapClient.middleName ? `${selectedOverlapClient.middleName} ` : ""}{selectedOverlapClient.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Client ID:</span>
                      <span className="font-mono font-semibold bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200 border dark:border-slate-700">
                        {selectedOverlapClient.id}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Mobile Contact:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                        {selectedOverlapClient.mobileNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Assigned Agent:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedOverlapClient.assignedAgentName}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Address Profile:</span>
                      <span className="text-slate-705 dark:text-slate-300 font-medium">
                        {selectedOverlapClient.address}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Lead Source:</span>
                      <span className="bg-teal-55/60 dark:bg-teal-950/40 text-teal-800 dark:text-teal-400 border dark:border-teal-900 font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 text-[11px]">
                        {selectedOverlapClient.sourceOfLead}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Entry Date:</span>
                      <span className="font-mono text-slate-850 dark:text-slate-300">
                        {new Date(selectedOverlapClient.dateRegistered).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overlap Matching Records details */}
                {selectedOverlapClient.duplicateStatus !== "None" ? (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-4 rounded-lg space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-400 text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-70 dark:text-amber-500 animate-pulse" />
                      Detected Overlapping Records & Agent Info
                    </div>
                    
                    {matchEntry ? (
                      <div className="text-xs space-y-2.5 text-slate-750 dark:text-slate-300 font-medium">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200/40 dark:border-amber-900/30 space-y-2 animate-fade-in">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">Overlap Candidate Profile Details:</p>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                            <div>
                              <span>• Client Name: </span>
                              <strong className="text-slate-850 dark:text-slate-200">{matchEntry.clientName}</strong>
                            </div>
                            <div>
                              <span>• Similarity Score: </span>
                              <strong className="text-red-700 dark:text-red-400">{matchEntry.similarityScore}% Match</strong>
                            </div>
                            <div>
                              <span>• Client A ID: </span>
                              <span className="font-mono text-slate-800 dark:text-slate-205 bg-slate-100 dark:bg-slate-800 px-1 rounded">{matchEntry.clientIdA}</span>
                            </div>
                            <div>
                              <span>• Client B ID: </span>
                              <span className="font-mono text-slate-800 dark:text-slate-205 bg-slate-100 dark:bg-slate-800 px-1 rounded">{matchEntry.clientIdB}</span>
                            </div>
                            <div>
                              <span>• First Agent (Agent A): </span>
                              <strong className="text-slate-800 dark:text-slate-200">{matchEntry.agentNameA} <span className="font-mono text-[10px] text-slate-500 dark:text-slate-450">({matchEntry.agentIdA})</span></strong>
                            </div>
                            <div>
                              <span>• Registered Time: </span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">{new Date(matchEntry.dateA).toLocaleString()}</span>
                            </div>
                            <div>
                              <span>• Conflict Agent (Agent B): </span>
                              <strong className="text-slate-800 dark:text-slate-200">{matchEntry.agentNameB} <span className="font-mono text-[10px] text-slate-500 dark:text-slate-450">({matchEntry.agentIdB})</span></strong>
                            </div>
                            <div>
                              <span>• Registered Time: </span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">{new Date(matchEntry.dateB).toLocaleString()}</span>
                            </div>
                            <div>
                              <span>• Status: </span>
                              <strong className="text-slate-800 dark:text-slate-200">{matchEntry.status}</strong>
                            </div>
                            <div>
                              <span>• Resolution: </span>
                              <strong className="text-slate-800 dark:text-slate-200">{matchEntry.resolution || "Pending"}</strong>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-amber-805 dark:text-amber-400 bg-amber-100/30 dark:bg-amber-950/10 p-2 rounded leading-relaxed border dark:border-amber-900/20">
                          <strong>Conflict Resolution Policy:</strong> This overlap case is logged under Conflict ID: <strong className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded shadow-sm border dark:border-slate-800">{matchEntry.id}</strong>. Current resolution status is <span className="underline font-bold text-amber-905 dark:text-amber-300">{matchEntry.status}</span>, with Resolution classified as <span className="underline font-bold text-teal-805 dark:text-teal-400">{matchEntry.resolution || "Pending"}</span>.
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-650 dark:text-slate-350 space-y-1.5 leading-relaxed">
                        <p>No active unsubmitted Conflict Ticket is currently open. This record was force-overridden during registration by the registering agent.</p>
                        <p>• Overridden Agent: <strong className="text-slate-800 dark:text-slate-200">{selectedOverlapClient.assignedAgentName}</strong></p>
                        <p>• Overlap Probability: <strong className="text-red-650 dark:text-red-400">{selectedOverlapClient.duplicateStatus === "Strong" ? "High matching (>85%)" : "Moderate matching (50%-85%)"}</strong></p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 p-4 rounded-lg text-green-800 dark:text-green-400 text-xs leading-relaxed font-semibold">
                    ⭐ Perfect Integrity: This client profile is classified as clear, with zero matching scores across active agent databases. No overlaps detected.
                  </div>
                )}

                {/* Overlap Statuses Legend */}
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-100 font-bold text-slate-700 text-xs">
                    RealtySync Overlap Status Legend
                  </div>
                  <div className="p-3.5 space-y-3 text-xs leading-relaxed text-slate-650">
                    <div className="flex items-start gap-2">
                      <span className="bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded border border-red-100 text-[10px] uppercase font-mono mt-0.5 shrink-0">
                        Strong
                      </span>
                      <div>
                        <strong>Strong Duplicate (Confidence ≥ 85%):</strong> Matches phone contact, or scores highly spelling-wise indicating matching profile tracks. Highest dual submission risk.
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-100 text-[10px] uppercase font-mono mt-0.5 shrink-0">
                        Possible
                      </span>
                      <div>
                        <strong>Possible Duplicate (Confidence 50% - 84%):</strong> Partial matches with some spell variations or identical active phone with potential nicknames.
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded border border-green-100 text-[10px] uppercase font-mono mt-0.5 shrink-0">
                        Clean
                      </span>
                      <div>
                        <strong>Clean Record (Confidence &lt; 50%):</strong> Completely free and unique profiles. Auto-routed to standard pipelines.
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer Actions */}
              <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOverlapClient(null)}
                  className="px-5 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow cursor-pointer transition-all"
                >
                  Dismiss Details
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 5. ADD CLIENT FORM MODAL VIEW */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-2xl w-full my-8">
            <div className="p-6 relative text-left">
              <button 
                onClick={() => setShowAddClientModal(false)}
                className="absolute top-6 right-6 text-slate-450 hover:text-slate-605 dark:text-slate-400 dark:hover:text-slate-205 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <ClientForm
                onSuccess={() => {
                  setShowAddClientModal(false);
                  fetchClients();
                  fetchDualEntries();
                  setMsgModal({
                    isOpen: true,
                    type: "success",
                    title: "Client Registered",
                    message: "A new client profile has been successfully registered and recorded!"
                  });
                }}
                onCancel={() => setShowAddClientModal(false)}
                agentsList={agentsList}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. SYSTEM-WIDE REUSABLE REACT CONFIRMATION MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-800 shadow-2xl max-w-sm w-full overflow-hidden shrink-0 text-left">
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-105 text-sm leading-snug">{confirmDialog.title}</h3>
                <p className="text-slate-505 dark:text-slate-400 text-xs mt-2 leading-relaxed">{confirmDialog.message}</p>
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#00786f] hover:bg-[#005a53] transition-all cursor-pointer shadow-sm"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border dark:border-slate-800"
                >
                  Cancel
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
