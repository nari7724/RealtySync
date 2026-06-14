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
  Building2, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  X, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { Booking, BookingStatus, UserRole } from "../types.ts";

interface BookingListProps {
  currentUser: { id: string; role: UserRole; firstName: string; lastName: string };
  triggerRefreshStamp: number;
  onAddLog: () => void;
}

export function BookingList({ currentUser, triggerRefreshStamp, onAddLog }: BookingListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let url = "/api/bookings";
      const params = new URLSearchParams();
      if (currentUser.role === UserRole.AGENT) {
        params.append("agentId", currentUser.id);
      }
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);

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
    switch (status) {
      case "Approved": return "bg-green-50 text-green-700 border-green-105";
      case "Processing": return "bg-teal-50 text-teal-800 border-teal-100";
      case "Reserved": return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "New": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Cancelled": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="space-y-6" id="bookings-module">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-teal-700 font-bold" />
          {currentUser.role === UserRole.ADMIN ? "Global Office Bookings Registry" : "My Bookings Pipeline"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Track reservation pipelines, property assignments, downpayment reservation statuses, and agent credits.</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bookings by Project, Property, Client, or Agent Name..."
            value={search}
            id="booking-search-bar"
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-205 focus:outline-none focus:border-teal-500 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 border-t md:border-none pt-3 md:pt-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            id="booking-filter-status"
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 min-w-[155px] cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Reserved">Reserved</option>
            <option value="Processing">Processing</option>
            <option value="Approved">Approved</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings table list */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 p-24 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-medium">Tracing reservation streams...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-16 text-center shadow-sm text-slate-450">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-teal-600 mb-3 border border-slate-100 mx-auto">
            <ClipboardList className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800">No Reservations Lodged</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Select a Client under the "Client Records" dashboard and press "Reserve Booking" to construct property holds.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden" id="bookings-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">Client Representative</th>
                  <th className="px-6 py-4">Sought Property & Project</th>
                  <th className="px-6 py-4">Reservation Amount</th>
                  <th className="px-6 py-4">Reservation Date</th>
                  <th className="px-6 py-4">Agent Assigned</th>
                  <th className="px-6 py-4">Lead Status</th>
                  {currentUser.role === UserRole.ADMIN && <th className="px-6 py-4 text-center">Status Action Override</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70 text-sm">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 leading-snug">{booking.clientName}</div>
                      <div className="text-[10px] text-slate-450 mt-1">Client ID: {booking.clientId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 leading-tight inline-flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-650" />
                        {booking.project}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Unit: {booking.property}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-850">
                      PHP {(booking.reservationAmount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                      {booking.reservationDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 text-xs">{booking.agentName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyle(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>

                    {currentUser.role === UserRole.ADMIN && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center items-center">
                          {savingId === booking.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          ) : (
                            <select
                              value={booking.status}
                              id={`booking-status-override-${booking.id}`}
                              onChange={(e) => handleUpdateStatus(booking.id, e.target.value as BookingStatus)}
                              className="px-2.5 py-1 text-xs rounded border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-750 cursor-pointer"
                            >
                              <option value="New">New</option>
                              <option value="Reserved">Reserved</option>
                              <option value="Processing">Processing</option>
                              <option value="Approved">Approved</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
