/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Loader2, 
  CheckCircle, 
  X, 
  TrendingUp,
  Calendar,
  User as UserIcon,
  MapPin,
  FileText,
  Clock,
  Briefcase
} from "lucide-react";
import { Booking, BookingStatus, UserRole } from "../types.ts";

interface BookingListProps {
  currentUser: { id: string; role: UserRole; firstName: string; lastName: string };
  triggerRefreshStamp: number;
  onAddLog: () => void;
}

const REALTY_PROJECT_ADDRESSES: Record<string, string> = {
  "Avida Towers Riala": "Apas, Cebu IT Park, Cebu City, Cebu",
  "Solinea Resort Condominium": "Cardiff St, Cebu IT Park, Cebu City, Cebu",
  "The Alcoves": "Luz, Cebu City, Cebu",
  "Park Point Residences": "Cardinal Rosales Ave, Cebu City, Cebu",
  "Amara Subdivision": "Catarman, Liloan, Cebu",
  "Amaia Steps Mandaue": "Plaridel St, Mandaue City, Cebu",
  "Cebu IT Park Residences": "Jose Maria del Mar St, Cebu City, Cebu",
  "Marco Polo Residences": "Nivel Hills, Lahug, Cebu City, Cebu"
};

export function isBookingDueSoon(apptDate: string, apptTime: string): boolean {
  try {
    if (!apptDate || !apptTime) return false;
    
    // Get Manila today date (YYYY-MM-DD)
    const dtf = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });
    const manilaToday = dtf.format(new Date());
    
    if (apptDate !== manilaToday) {
      return false;
    }
    
    // Get current Manila time
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find(p => p.type === "hour")?.value || "0";
    const minutePart = parts.find(p => p.type === "minute")?.value || "0";
    const nowMinutes = parseInt(hourPart, 10) * 60 + parseInt(minutePart, 10);
    
    // Parse appointment time "HH:MM"
    const [apptHourStr, apptMinuteStr] = apptTime.split(":");
    const apptHour = parseInt(apptHourStr, 10);
    const apptMinute = parseInt(apptMinuteStr, 10);
    if (isNaN(apptHour) || isNaN(apptMinute)) return false;
    
    const apptMinutes = apptHour * 60 + apptMinute;
    
    const diff = apptMinutes - nowMinutes;
    // Next 30 minutes means scheduled time is between now and up to 30 minutes in the future
    return diff >= 0 && diff <= 30;
  } catch (e) {
    return false;
  }
}

export function formatTimeWithAMPM(timeStr: string | undefined): string {
  if (!timeStr) return "—";
  if (timeStr.toLowerCase().endsWith("am") || timeStr.toLowerCase().endsWith("pm")) {
    return timeStr;
  }
  try {
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutesStr = parts[1].split(" ")[0];
      const minutes = parseInt(minutesStr, 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours === 0 ? 12 : hours;
        const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${hours}:${displayMinutes} ${ampm}`;
      }
    }
  } catch (e) {
    // ignore
  }
  return timeStr;
}

export function BookingList({ currentUser, triggerRefreshStamp, onAddLog }: BookingListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Open"); // Default status filter is Open

  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Load clients list to dynamically resolve rich Client Information
  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients?limit=1000");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (e) {
      console.error("Error fetching clients lookup map:", e);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let url = "/api/bookings";
      const params = new URLSearchParams();
      if (currentUser.role === UserRole.AGENT) {
        params.append("agentId", currentUser.id);
      }
      if (search) {
        params.append("search", search);
      }
      if (statusFilter && statusFilter !== "All") {
        params.append("status", statusFilter);
      }

      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error("Error loading bookings list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [triggerRefreshStamp]);

  useEffect(() => {
    fetchBookings();
  }, [search, statusFilter, triggerRefreshStamp]);

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    setSavingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          userContext: {
            id: currentUser.id,
            userName: `${currentUser.firstName} ${currentUser.lastName}`,
            role: currentUser.role
          }
        }),
      });

      if (res.ok) {
        // If selected booking is open, update its local instance too
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking({
            ...selectedBooking,
            status: newStatus
          });
        }
        fetchBookings();
        onAddLog();
      }
    } catch (err) {
      console.error("Error updating booking status:", err);
    } finally {
      setSavingId(null);
    }
  };

  const getStatusStyle = (status: BookingStatus) => {
    switch (String(status).toLowerCase()) {
      case "open": return "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900";
      case "done": return "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-150 dark:border-green-900";
      case "cancelled": return "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-150 dark:border-red-900";
      default: return "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-705";
    }
  };

  // Build client lookup map
  const clientMap = new Map<string, any>(clients.map(c => [c.id, c]));

  return (
    <div className="space-y-6" id="bookings-module">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-teal-700 dark:text-teal-400 font-bold animate-pulse" />
          {currentUser.role === UserRole.ADMIN ? "Global Office Bookings Registry" : "My Bookings Pipeline"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track reservation pipelines, property assignments, downpayment reservation statuses, and agent credits.</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID (Booking/Client), Project, Client, or Agent Name..."
            value={search}
            id="booking-search-bar"
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 border-t md:border-none pt-3 md:pt-0 dark:border-slate-800">
          <Filter className="w-4 h-4 text-slate-450" />
          <select
            value={statusFilter}
            id="booking-filter-status"
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500 min-w-[155px] cursor-pointer font-bold"
          >
            <option value="All">All</option>
            <option value="Open">Open</option>
            <option value="Done">Done</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings table list */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-24 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-400 font-medium font-mono">Tracing reservation streams...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-16 text-center shadow-sm text-slate-450 dark:text-slate-400">
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-teal-600 mb-3 border border-slate-100 dark:border-slate-805 mx-auto">
            <ClipboardList className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Reservations Lodged</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Active filters returned blank logs. Select "Open" to review active booking pipeline items.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden" id="bookings-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-505 dark:text-slate-405 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4">Appointment ID</th>
                  <th className="px-6 py-4">Client Information</th>
                  <th className="px-6 py-4">Appointment Type</th>
                  <th className="px-6 py-4">Location / Remarks</th>
                  <th className="px-6 py-4">Scheduled Slot</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/80 text-sm">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors">
                    {/* Column 1: Appointment ID (Clickable) */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-extrabold text-teal-700 dark:text-teal-400 bg-slate-50/10">
                      <button 
                        onClick={() => setSelectedBooking(booking)}
                        className="hover:underline text-left cursor-pointer font-bold focus:outline-none"
                      >
                        {booking.id}
                      </button>
                    </td>

                    {/* Column 2: Client Information */}
                    <td className="px-6 py-4">
                      {(() => {
                        const client = clientMap.get(booking.clientId);
                        if (client) {
                          return (
                            <div className="space-y-1">
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-extrabold select-none">ID: {booking.clientId}</div>
                              <div className="font-bold text-slate-900 dark:text-slate-105 leading-snug">{client.firstName} {client.middleName ? `${client.middleName} ` : ""}{client.lastName}</div>
                              <div className="text-xs text-slate-655 dark:text-slate-350 font-semibold font-mono">{client.mobileNumber}</div>
                              <div className="text-[11px] text-slate-505 dark:text-slate-401 font-medium leading-tight">{client.address}</div>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-1">
                            <div className="text-[10px] text-slate-450 dark:text-slate-500 font-mono font-extrabold select-none">ID: {booking.clientId}</div>
                            <div className="font-bold text-slate-900 dark:text-slate-105 leading-snug">{booking.clientName}</div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Column 3: Appointment Type */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 rounded-lg text-xs leading-none inline-block">
                        {booking.appointmentType || "Site Visit"}
                      </span>
                    </td>

                    {/* Column 4: Location / Remarks */}
                    <td className="px-6 py-4 max-w-[240px]">
                      {String(booking.appointmentType).toLowerCase() === "site visit" && booking.location ? (
                        <div className="space-y-0.5">
                          <div className="text-xs text-slate-850 dark:text-slate-205 font-bold truncate" title={booking.location}>
                            📍 {booking.location}
                          </div>
                          {REALTY_PROJECT_ADDRESSES[booking.location] && (
                            <div className="text-[10px] text-slate-450 dark:text-slate-450 font-medium block italic leading-tight">
                              {REALTY_PROJECT_ADDRESSES[booking.location]}
                            </div>
                          )}
                        </div>
                      ) : booking.notes ? (
                        <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-1 truncate" title={booking.notes}>
                          "{booking.notes}"
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Column 5: Scheduled Slot */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-mono font-semibold">
                      <div className="text-slate-800 dark:text-slate-200 font-bold">{booking.appointmentDate || "—"}</div>
                      <div className="text-slate-505 dark:text-slate-400 mt-0.5 font-medium flex flex-col sm:flex-row sm:items-center gap-1.5">
                        <span>{formatTimeWithAMPM(booking.appointmentTime)}</span>
                        {String(booking.status).toLowerCase() === "open" && isBookingDueSoon(booking.appointmentDate, booking.appointmentTime) && (
                          <span className="inline-flex items-center gap-0.5 bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-350 font-extrabold px-1.5 py-0.5 rounded text-[10px] animate-pulse border border-red-200 dark:border-red-900 select-none shrink-0" title="Occurring within standard 30 min window!">
                            <Clock className="w-2.5 h-2.5" /> DUE SOON
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column 6: Action with Done and Cancelled buttons */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {String(booking.status).toLowerCase() === "open" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleUpdateStatus(booking.id, "Done" as any)}
                            disabled={savingId === booking.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center gap-0.5 disabled:opacity-50"
                            title="Mark as Done"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Done
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(booking.id, "Cancelled" as any)}
                            disabled={savingId === booking.id}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center gap-0.5 disabled:opacity-50"
                            title="Mark as Cancelled"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer inline-block ${getStatusStyle(booking.status)}`} onClick={() => setSelectedBooking(booking)}>
                          {booking.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
       {/* DETAIL MODAL WITH DONE & CANCELLED ACTIONS */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="booking-detail-overlay">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden shrink-0">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Appointment Details</h3>
                  <p className="text-[10px] font-mono font-bold text-slate-455 dark:text-slate-400 uppercase tracking-widest mt-0.5">Reference ID: {selectedBooking.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-450 hover:text-slate-650 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs text-slate-600 dark:text-slate-300">
              {/* Dynamic Saving Loader */}
              {savingId === selectedBooking.id && (
                <div className="bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 p-2 text-center rounded-lg font-bold animate-pulse font-mono flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating appointment status...
                </div>
              )}

              {/* Patient/Client Details */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-[9px] uppercase font-extrabold text-teal-650 dark:text-teal-400 tracking-wider flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5" /> Client Profile Details
                </div>
                {(() => {
                  const client = clientMap.get(selectedBooking.clientId);
                  if (client) {
                    return (
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{client.firstName} {client.middleName ? `${client.middleName} ` : ""}{client.lastName}</div>
                        <div>Client ID: <span className="font-mono font-bold text-slate-705 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">{client.id}</span></div>
                        <div>Mobile Contact: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{client.mobileNumber}</span></div>
                        <div className="text-slate-500 dark:text-slate-400 leading-snug">Residence Address: <span className="font-medium text-slate-700 dark:text-slate-300">{client.address}</span></div>
                        {client.facebookProfileLink && (
                          <div className="text-slate-500 dark:text-slate-400 font-medium">Facebook URL: <span className="font-mono text-teal-600 dark:text-teal-400 font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-1.5 py-0.5 rounded inline-block">{client.facebookProfileLink}</span></div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-900 dark:text-slate-105 text-sm">{selectedBooking.clientName}</div>
                      <div>Client ID: <span className="font-mono font-bold text-slate-705 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded">{selectedBooking.clientId}</span></div>
                    </div>
                  );
                })()}
              </div>

              {/* Slot Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> Scheduled Date
                  </div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs font-mono">{selectedBooking.appointmentDate || "—"}</div>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> Scheduled Time
                  </div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs font-mono">{formatTimeWithAMPM(selectedBooking.appointmentTime)}</div>
                </div>
              </div>

              {/* Assignment Category & Status */}
              <div className="space-y-3 p-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Appointment Type:
                  </span>
                  <span className="font-extrabold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-0.8 rounded text-xs select-none">
                    {selectedBooking.appointmentType || "Site Visit"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Current Status Indicator:
                  </span>
                  <span className={`px-2.5 py-0.8 rounded-full text-xs font-bold border ${getStatusStyle(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </span>
                </div>

                {selectedBooking.location && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Site Project Location:
                    </span>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200 pl-4.5 text-xs flex items-center gap-1">
                      {selectedBooking.location}
                    </div>
                    {REALTY_PROJECT_ADDRESSES[selectedBooking.location] && (
                      <div className="pl-4.5 text-[10px] text-slate-450 dark:text-slate-400 font-medium italic">
                        Complete Address: {REALTY_PROJECT_ADDRESSES[selectedBooking.location]}
                      </div>
                    )}
                  </div>
                )}

                {selectedBooking.notes && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider flex items-center gap-1">
                      Remarks / Notes:
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/35 p-2.5 rounded border dark:border-slate-800 italic font-medium">
                      "{selectedBooking.notes}"
                    </p>
                  </div>
                )}

                <div className="text-[10px] text-slate-450 border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between">
                  <span>Assigned Representative Agent:</span>
                  <strong className="text-slate-700 dark:text-slate-200">{selectedBooking.agentName}</strong>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end items-center gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
              {/* Status Updates (Left Side) */}
              {String(selectedBooking.status).toLowerCase() === "open" && (
                <div className="flex gap-2 mr-auto">
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, "Done" as any)}
                    disabled={savingId === selectedBooking.id}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Mark as Done
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, "Cancelled" as any)}
                    disabled={savingId === selectedBooking.id}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel Appointment
                  </button>
                </div>
              )}

              {/* Close Button on the Right Side, styled with color */}
              <button 
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 border border-transparent transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
