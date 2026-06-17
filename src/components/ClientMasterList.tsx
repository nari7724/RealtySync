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
  ShieldAlert
} from "lucide-react";
import { Client, Agent, Booking, BookingStatus, UserRole } from "../types.ts";

interface ClientMasterListProps {
  currentUser: { id: string; firstName: string; lastName: string; role: UserRole };
  agentsList: Agent[];
  onTriggerForm: () => void;
  triggerRefreshStamp: number;
}

export function ClientMasterList({ currentUser, agentsList, onTriggerForm, triggerRefreshStamp }: ClientMasterListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
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
  const [realtyProjects, setRealtyProjects] = useState<string[]>([]);

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
        setBookingError(errData.error || "The client already has an appointment scheduled at this exact date and time. Please select another slot.");
        return;
      }

      setBookingClient(null);
      fetchClients();
    } catch (err) {
      console.error("Appointment creation error:", err);
      setBookingError("Failed to schedule appointment. Please check network connectivity.");
    } finally {
      setBookingSaving(false);
    }
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
      }
    } catch (err) {
      console.error("Client update error:", err);
    } finally {
      setClientSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="client-index-panel">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-teal-700 font-bold" />
            {currentUser.role === UserRole.ADMIN ? "Broker Client Registries" : "My Assigned Client Base"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {currentUser.role === UserRole.ADMIN 
              ? "Comprehensive list of all registered clients, owning agents, and duplicate flags." 
              : "Track and organize your direct leads, view registration states, and submit reservation reservations."}
          </p>
        </div>

        <button
          onClick={onTriggerForm}
          id="btn-trigger-register-client"
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Client Profile
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            id="client-search-bar"
            placeholder="Search clients by Client Name, mobile, fb URL, or owning agent..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-205 focus:outline-none focus:border-teal-500 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0 border-t lg:border-none pt-3 lg:pt-0">
          <Filter className="w-4 h-4 text-slate-450" />
          
          {currentUser.role === UserRole.ADMIN && (
            <select
              value={selectedAgent}
              id="filter-agent-toggle"
              onChange={(e) => {
                setSelectedAgent(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 min-w-[150px] cursor-pointer"
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
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 min-w-[150px] cursor-pointer"
          >
            <option value="">All</option>
            <option value="None">Clean Record</option>
            <option value="Possible">Possible Duplicates</option>
            <option value="Strong">Strong Duplicates</option>
          </select>
        </div>
      </div>

      {/* Main clients logs table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 p-24 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-medium">Scanning client registers...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-16 text-center shadow-sm text-slate-450">
          <p className="text-sm text-slate-500">No client listings found matching filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden" id="clients-main-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">Client ID</th>
                  <th className="px-6 py-4">Client Information</th>
                  <th className="px-6 py-4">SaaS Overlap Integrity</th>
                  <th className="px-6 py-4 flex-1">Registration Timeline</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70 text-sm">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/40 transition-colors">
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
                        <button
                          onClick={() => handleBookingOpen(client)}
                          disabled={client.duplicateStatus === "Strong" || client.duplicateStatus === "Possible"}
                          title={client.duplicateStatus === "Strong" || client.duplicateStatus === "Possible" ? "Please resolve overlap integrity before scheduling an appointment" : "Set an appointment"}
                          id={`client-book-btn-${client.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-all shadow-sm inline-flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Set an Appointment
                        </button>

                        <button
                          onClick={() => handleEditOpen(client)}
                          id={`client-edit-btn-${client.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-sm inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
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
          <div className="bg-white rounded-xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden shrink-0">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-700" />
                <h3 className="font-bold text-slate-900 text-md">Set an Appointment</h3>
              </div>
              <button onClick={() => setBookingClient(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
              {/* Dynamic Error Indicator */}
              {bookingError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-semibold flex items-start gap-2 border border-red-100 animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-650" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Target Customer Details */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Client Information</div>
                <div className="font-bold text-slate-900 text-sm">{bookingClient.firstName} {bookingClient.middleName ? `${bookingClient.middleName} ` : ""}{bookingClient.lastName}</div>
                <div>Client ID: <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">{bookingClient.id}</span></div>
                <div className="text-slate-600 font-medium">Contact: <span className="font-mono font-bold text-slate-800">{bookingClient.mobileNumber}</span></div>
                <div className="text-slate-500 truncate" title={bookingClient.address}>Address: <span className="font-semibold text-slate-700">{bookingClient.address}</span></div>
                {bookingClient.facebookProfileLink && (
                  <div className="text-slate-500 truncate">Social Media Link: <span className="font-mono text-teal-650 font-bold">{bookingClient.facebookProfileLink}</span></div>
                )}
                <div className="text-slate-405 mt-1">Agent Representative: <strong className="text-slate-650">{bookingClient.assignedAgentName}</strong></div>
              </div>

              {/* Appointment Type Select Box */}
              <div>
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1.5">Appointment Type *</label>
                <select
                  value={bookingFormData.appointmentType}
                  id="booking-input-type"
                  onChange={(e) => setBookingFormData({ ...bookingFormData, appointmentType: e.target.value as any, location: "" })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500"
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
                <div className="animate-fade-in text-slate-550 space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1.5">Site Visit Location *</label>
                    <select
                      required
                      id="booking-input-location"
                      value={bookingFormData.location}
                      onChange={(e) => setBookingFormData({ ...bookingFormData, location: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value="">Select a Realty Project...</option>
                      {realtyProjects.map((proj) => (
                        <option key={proj} value={proj}>{proj}</option>
                      ))}
                    </select>
                  </div>

                  {bookingFormData.location && (
                    <div className="animate-fade-in">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Project Complete Location Address</label>
                      <input
                        type="text"
                        readOnly
                        value={({
                          "Avida Towers Riala": "Apas, Cebu IT Park, Cebu City, Cebu",
                          "Solinea Resort Condominium": "Cardiff St, Cebu IT Park, Cebu City, Cebu",
                          "The Alcoves": "Luz, Cebu City, Cebu",
                          "Park Point Residences": "Cardinal Rosales Ave, Cebu City, Cebu",
                          "Amara Subdivision": "Catarman, Liloan, Cebu",
                          "Amaia Steps Mandaue": "Plaridel St, Mandaue City, Cebu",
                          "Cebu IT Park Residences": "Jose Maria del Mar St, Cebu City, Cebu",
                          "Marco Polo Residences": "Nivel Hills, Lahug, Cebu City, Cebu"
                        }[bookingFormData.location]) || ""}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-650 focus:outline-none cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Date Picker and Time Picker */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1.5">Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    id="booking-input-date"
                    value={bookingFormData.appointmentDate}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, appointmentDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-slate-650 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1.5">Scheduled Time *</label>
                  <input
                    type="time"
                    required
                    id="booking-input-time"
                    value={bookingFormData.appointmentTime}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, appointmentTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-slate-650 font-mono"
                  />
                </div>
              </div>

              {/* Remarks Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1.5">Remarks / Notes</label>
                <textarea
                  id="booking-input-notes"
                  value={bookingFormData.notes}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, notes: e.target.value })}
                  placeholder="Enter initial schedules notes, requirements to bring, etc."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-202 focus:outline-none focus:border-teal-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBookingClient(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-650 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSaving}
                  id="btn-booking-save-submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 rounded-lg shadow inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {bookingSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule Appointment"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL WINDOWS B: EDIT SELECTED CLIENT METADATA */}
      {editingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="client-edit-modal-overlay">
          <div className="bg-white rounded-xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden shrink-0">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-md">Edit Client Profile</h3>
              <button onClick={() => setEditingClient(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClientSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={clientFormData.firstName}
                    onChange={(e) => setClientFormData({ ...clientFormData, firstName: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={clientFormData.middleName}
                    onChange={(e) => setClientFormData({ ...clientFormData, middleName: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={clientFormData.lastName}
                    onChange={(e) => setClientFormData({ ...clientFormData, lastName: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={clientFormData.mobileNumber}
                  onChange={(e) => setClientFormData({ ...clientFormData, mobileNumber: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={clientFormData.address}
                  onChange={(e) => setClientFormData({ ...clientFormData, address: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Facebook URL</label>
                <input
                  type="text"
                  value={clientFormData.facebookProfileLink}
                  onChange={(e) => setClientFormData({ ...clientFormData, facebookProfileLink: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Remarks / Remarks</label>
                <textarea
                  value={clientFormData.notes}
                  onChange={(e) => setClientFormData({ ...clientFormData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-650 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clientSaving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                >
                  {clientSaving ? "Saving..." : "Save Changes"}
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
            <div className="bg-white rounded-xl border border-slate-100 shadow-2xl max-w-xl w-full overflow-hidden">
              
              {/* Header */}
              <div className="bg-teal-50 border-b border-teal-100 p-5 flex items-start gap-4">
                <div className="p-2.5 bg-teal-100 text-teal-800 rounded-full shrink-0">
                  <ClipboardList className="w-6 h-6 text-teal-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    SaaS Overlap Integrity Details
                  </h3>
                  <p className="text-xs text-slate-550 mt-1">
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
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider">Screened Client Information</span>
                  <div className="grid grid-cols-2 gap-4 text-xs mt-1">
                    <div>
                      <span className="text-slate-500 block">Full Name:</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {selectedOverlapClient.firstName} {selectedOverlapClient.middleName ? `${selectedOverlapClient.middleName} ` : ""}{selectedOverlapClient.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Client ID:</span>
                      <span className="font-mono font-semibold bg-slate-200/60 px-1 py-0.5 rounded text-slate-800">
                        {selectedOverlapClient.id}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Mobile Contact:</span>
                      <span className="font-mono text-slate-800">
                        {selectedOverlapClient.mobileNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Assigned Agent:</span>
                      <span className="font-bold text-slate-800">
                        {selectedOverlapClient.assignedAgentName}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Address Profile:</span>
                      <span className="text-slate-700 font-medium">
                        {selectedOverlapClient.address}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Lead Source:</span>
                      <span className="bg-teal-55/60 text-teal-800 font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5">
                        {selectedOverlapClient.sourceOfLead}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Entry Date:</span>
                      <span className="font-mono text-slate-850">
                        {new Date(selectedOverlapClient.dateRegistered).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overlap Matching Records details */}
                {selectedOverlapClient.duplicateStatus !== "None" ? (
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-70 animate-pulse" />
                      Detected Overlapping Records & Agent Info
                    </div>
                    
                    {matchEntry ? (
                      <div className="text-xs space-y-2.5 text-slate-700 font-medium">
                        <div className="p-3 bg-white rounded-lg border border-amber-200/40 space-y-2">
                          <p className="font-semibold text-slate-800">Overlap Candidate Profile Details:</p>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                            <div>
                              <span>• Client Name: </span>
                              <strong className="text-slate-850">{matchEntry.clientName}</strong>
                            </div>
                            <div>
                              <span>• Similarity Score: </span>
                              <strong className="text-red-700">{matchEntry.similarityScore}% Match</strong>
                            </div>
                            <div>
                              <span>• Client A ID: </span>
                              <span className="font-mono text-slate-800 bg-slate-100 px-1 rounded">{matchEntry.clientIdA}</span>
                            </div>
                            <div>
                              <span>• Client B ID: </span>
                              <span className="font-mono text-slate-800 bg-slate-100 px-1 rounded">{matchEntry.clientIdB}</span>
                            </div>
                            <div>
                              <span>• First Agent (Agent A): </span>
                              <strong className="text-slate-805 text-slate-800">{matchEntry.agentNameA} <span className="font-mono text-[10px] text-slate-500">({matchEntry.agentIdA})</span></strong>
                            </div>
                            <div>
                              <span>• Registered Time: </span>
                              <span className="font-mono text-slate-555 text-slate-500">{new Date(matchEntry.dateA).toLocaleString()}</span>
                            </div>
                            <div>
                              <span>• Conflict Agent (Agent B): </span>
                              <strong className="text-slate-805 text-slate-800">{matchEntry.agentNameB} <span className="font-mono text-[10px] text-slate-500">({matchEntry.agentIdB})</span></strong>
                            </div>
                            <div>
                              <span>• Registered Time: </span>
                              <span className="font-mono text-slate-555 text-slate-500">{new Date(matchEntry.dateB).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-amber-800 bg-amber-100/30 p-2 rounded leading-relaxed">
                          <strong>Conflict Resolution Policy:</strong> This overlap case is logged under Conflict ID: <strong className="font-mono bg-white px-1 py-0.5 rounded shadow-sm">{matchEntry.id}</strong>. Current resolution status is <span className="underline font-bold text-amber-900">{matchEntry.status}</span>. Any override requires Senior Brokerage audit review.
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                        <p>No active unsubmitted Conflict Ticket is currently open. This record was force-overridden during registration by the registering agent.</p>
                        <p>• Overridden Agent: <strong className="text-slate-800">{selectedOverlapClient.assignedAgentName}</strong></p>
                        <p>• Overlap Probability: <strong className="text-red-600">{selectedOverlapClient.duplicateStatus === "Strong" ? "High matching (>85%)" : "Moderate matching (50%-85%)"}</strong></p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-100 p-4 rounded-lg text-green-800 text-xs leading-relaxed font-semibold">
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
    </div>
  );
}
