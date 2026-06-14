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
  Globe
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

  // New Booking Form States
  const [bookingFormData, setBookingFormData] = useState({
    project: "",
    property: "",
    reservationDate: new Date().toISOString().split('T')[0],
    reservationAmount: "",
    status: "New" as BookingStatus,
    notes: "",
  });
  const [bookingSaving, setBookingSaving] = useState(false);

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

  useEffect(() => {
    fetchClients();
  }, [page, search, selectedAgent, selectedDupStatus, triggerRefreshStamp]);

  const handleBookingOpen = (client: Client) => {
    setBookingClient(client);
    setBookingFormData({
      project: "",
      property: "",
      reservationDate: new Date().toISOString().split('T')[0],
      reservationAmount: "10000",
      status: "New",
      notes: "",
    });
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingClient) return;

    setBookingSaving(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: bookingClient.id,
          project: bookingFormData.project,
          property: bookingFormData.property,
          reservationDate: bookingFormData.reservationDate,
          reservationAmount: Number(bookingFormData.reservationAmount) || 0,
          status: bookingFormData.status,
          notes: bookingFormData.notes,
          userContext: {
            id: currentUser.id,
            userName: `${currentUser.firstName} ${currentUser.lastName}`,
            role: currentUser.role
          }
        }),
      });

      if (res.ok) {
        setBookingClient(null);
        fetchClients();
      }
    } catch (err) {
      console.error("Booking creation error:", err);
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
            <option value="">All Duplicate States</option>
            <option value="None">No Duplicates</option>
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
                  <th className="px-6 py-4">Client Contact</th>
                  <th className="px-6 py-4">SaaS Overlap Integrity</th>
                  <th className="px-6 py-4">Registration Timeline</th>
                  <th className="px-6 py-4">Representative</th>
                  <th className="px-6 py-4">FB Link / Src</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70 text-sm">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-slate-900 leading-snug">{client.firstName} {client.middleName ? `${client.middleName} ` : ""}{client.lastName}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-mono">
                          <span>{client.mobileNumber}</span>
                          <span className="text-slate-350">|</span>
                          <span className="truncate max-w-[150px]" title={client.address}>{client.address}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {client.duplicateStatus === "Strong" ? (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded border border-red-100 uppercase tracking-wide animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Strong Duplicate
                        </span>
                      ) : client.duplicateStatus === "Possible" ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wide">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Possible Duplicate
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded border border-green-100 uppercase tracking-wide">
                          Clean Record
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs font-mono">
                      {new Date(client.dateRegistered).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric", hour: "2-digit"
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 text-xs">{client.assignedAgentName}</div>
                    </td>
                    <td className="px-6 py-4 max-w-[150px]">
                      <div className="text-xs truncate text-slate-650 font-mono">{client.facebookProfileLink || "—"}</div>
                      <div className="text-[10px] text-teal-650 bg-teal-50 px-1.5 py-0.5 rounded inline-block mt-1 font-medium">{client.sourceOfLead}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => handleBookingOpen(client)}
                          id={`client-book-btn-${client.id}`}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-sm inline-flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Reserve Booking
                        </button>

                        <button
                          onClick={() => handleEditOpen(client)}
                          id={`client-edit-btn-${client.id}`}
                          className="p-1 px-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-100 rounded-lg text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
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

      {/* MODAL WINDOWS A: CREATE BOOKING FOR SELECTED CLIENT */}
      {bookingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="booking-modal-overlay">
          <div className="bg-white rounded-xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden shrink-0">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-700" />
                <h3 className="font-bold text-slate-900 text-md">Register Customer Booking</h3>
              </div>
              <button onClick={() => setBookingClient(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Customer</div>
                <div className="font-bold text-slate-900 text-md mt-0.5">{bookingClient.firstName} {bookingClient.lastName}</div>
                <div className="text-xs text-slate-550 mt-1 flex gap-2">
                  <span>Phone: {bookingClient.mobileNumber}</span>
                  <span className="text-slate-300">|</span>
                  <span>Agent rep: {bookingClient.assignedAgentName}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target Development / Project *</label>
                <input
                  type="text"
                  required
                  id="booking-input-project"
                  value={bookingFormData.project}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, project: e.target.value })}
                  placeholder="e.g. Solinea Resort Towers"
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Specific Property / Unit *</label>
                <input
                  type="text"
                  required
                  id="booking-input-property"
                  value={bookingFormData.property}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, property: e.target.value })}
                  placeholder="e.g. Tower 2 Unit 15C"
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reservation Date *</label>
                  <input
                    type="date"
                    required
                    id="booking-input-resdate"
                    value={bookingFormData.reservationDate}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, reservationDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-slate-650"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reservation Amount (PHP) *</label>
                  <input
                    type="number"
                    required
                    id="booking-input-resamount"
                    value={bookingFormData.reservationAmount}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, reservationAmount: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-205 focus:outline-none focus:border-teal-500 font-mono"
                    placeholder="e.g. 25000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Booking Stage Status</label>
                <select
                  value={bookingFormData.status}
                  id="booking-input-status"
                  onChange={(e) => setBookingFormData({ ...bookingFormData, status: e.target.value as BookingStatus })}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500"
                >
                  <option value="New">New</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Processing">Processing</option>
                  <option value="Approved">Approved</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reservation Remarks / Notes</label>
                <textarea
                  id="booking-input-notes"
                  value={bookingFormData.notes}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, notes: e.target.value })}
                  placeholder="Enter details like down payment modes, next terms, etc."
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-202 focus:outline-none focus:border-teal-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBookingClient(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-650 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={bookingSaving}
                  id="btn-booking-save-submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow inline-flex items-center gap-1.5"
                >
                  {bookingSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Filing Reservation...
                    </>
                  ) : (
                    "Confirm Booking"
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
    </div>
  );
}
