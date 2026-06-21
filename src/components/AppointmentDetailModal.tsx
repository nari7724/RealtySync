/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  X, 
  Calendar, 
  User as UserIcon, 
  Clock, 
  Briefcase, 
  FileText, 
  MapPin, 
  Loader2, 
  CheckCircle,
  Edit2
} from "lucide-react";
import { Booking, BookingStatus, UserRole } from "../types.ts";

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

const APPOINTMENT_TYPES = ["Site Visit", "Reservation", "Submit Requirements", "Payment", "Inquiry", "Meeting", "Release of Title"];

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

interface AppointmentDetailModalProps {
  booking: Booking;
  currentUser: { id: string; role: UserRole; firstName: string; lastName: string };
  onClose: () => void;
  onRefresh: () => void;
}

export function AppointmentDetailModal({ booking, currentUser, onClose, onRefresh }: AppointmentDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<BookingStatus | null>(null);
  const [errorText, setErrorText] = useState("");

  // Edit fields
  const [editForm, setEditForm] = useState({
    appointmentDate: booking.appointmentDate || "",
    appointmentTime: booking.appointmentTime || "",
    appointmentType: booking.appointmentType || "Site Visit",
    location: booking.location || "",
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const getStatusStyle = (status: BookingStatus) => {
    switch (String(status).toLowerCase()) {
      case "open": return "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900";
      case "done": return "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-150 dark:border-green-900";
      case "cancelled": return "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-350 border-red-150 dark:border-red-900";
      default: return "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-705";
    }
  };

  const handleUpdateStatus = async (newStatus: BookingStatus) => {
    const actionLabel = newStatus === "Cancelled" ? "Cancel" : "Done";
    setConfirmDialog({
      title: `${actionLabel} Appointment`,
      message: `Are you sure you want to ${actionLabel.toLowerCase()} this appointment?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setUpdatingStatus(newStatus);
        try {
          const res = await fetch(`/api/bookings/${booking.id}`, {
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
            onRefresh();
            onClose();
          } else {
            const errObj = await res.json();
            setErrorText(errObj.error || "Failed to update status.");
          }
        } catch (err: any) {
          setErrorText(err.message || "An unexpected error occurred.");
        } finally {
          setUpdatingStatus(null);
        }
      }
    });
  };

  const handleSaveEdit = () => {
    if (!editForm.appointmentDate) {
      setErrorText("Please select a valid appointment date.");
      return;
    }
    if (!editForm.appointmentTime) {
      setErrorText("Please select a valid appointment time.");
      return;
    }
    if (!editForm.location.trim()) {
      setErrorText("Please enter or select a valid location.");
      return;
    }

    setConfirmDialog({
      title: "Update Appointment Details",
      message: "Are you sure you want to save and update this appointment's details?",
      onConfirm: async () => {
        setConfirmDialog(null);
        setSaving(true);
        setErrorText("");
        try {
          const combinedDateTime = `${editForm.appointmentDate}T${editForm.appointmentTime}`;
          const res = await fetch(`/api/bookings/${booking.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              appointmentDate: editForm.appointmentDate,
              appointmentTime: editForm.appointmentTime,
              appointmentType: editForm.appointmentType,
              location: editForm.location,
              dateTime: combinedDateTime,
              userContext: {
                id: currentUser.id,
                userName: `${currentUser.firstName} ${currentUser.lastName}`,
                role: currentUser.role
              }
            })
          });

          if (!res.ok) {
            const errObj = await res.json();
            throw new Error(errObj.error || "Failed to update appointment details.");
          }

          setIsEditing(false);
          onRefresh();
          onClose();
        } catch (err: any) {
          setErrorText(err.message || "An unexpected error occurred while saving booking details.");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-xs" id="shared-booking-detail-overlay">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden shrink-0">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            <div className="text-left">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                {isEditing ? "Edit Appointment Details" : "Appointment Details"}
              </h3>
              <p className="text-[10px] font-mono font-bold text-slate-455 dark:text-slate-400 uppercase tracking-widest mt-0.5">Reference ID: {booking.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-450 hover:text-slate-650 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-left text-slate-600 dark:text-slate-300">
          {errorText && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-750 dark:text-red-350 p-3 rounded-lg font-bold">
              {errorText}
            </div>
          )}

          {updatingStatus && (
            <div className="bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 p-2 text-center rounded-lg font-bold font-mono animate-pulse flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Updating status to {updatingStatus}...
            </div>
          )}

          {saving && (
            <div className="bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 p-2 text-center rounded-lg font-bold font-mono animate-pulse flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving changes...
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4">
              {/* Profile Overview (Read-Only) */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-[9px] uppercase font-extrabold text-teal-605 tracking-wider flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5" /> Client profile
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{booking.clientName}</div>
                  <div className="mt-0.5 text-slate-450 font-mono font-bold">Client ID: {booking.clientId}</div>
                </div>
              </div>

              {/* Edit inputs container */}
              <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div className="grid grid-cols-2 gap-3">
                  {/* Appointment Date */}
                  <div className="space-y-1">
                    <label className="block text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                      Appointment Date
                    </label>
                    <input
                      type="date"
                      value={editForm.appointmentDate}
                      onChange={(e) => setEditForm({ ...editForm, appointmentDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none font-mono text-xs text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>

                  {/* Appointment Time */}
                  <div className="space-y-1">
                    <label className="block text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                      Appointment Time
                    </label>
                    <input
                      type="time"
                      value={editForm.appointmentTime}
                      onChange={(e) => setEditForm({ ...editForm, appointmentTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none font-mono text-xs text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Appointment Type */}
                  <div className="space-y-1">
                    <label className="block text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                      Appointment Type
                    </label>
                    <select
                      value={editForm.appointmentType}
                      onChange={(e) => setEditForm({ ...editForm, appointmentType: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none text-xs text-slate-800 dark:text-slate-100 cursor-pointer font-bold"
                    >
                      {APPOINTMENT_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Project Site Location */}
                  <div className="space-y-1">
                    <label className="block text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                      Project Site Location
                    </label>
                    <select
                      value={Object.keys(REALTY_PROJECT_ADDRESSES).includes(editForm.location) ? editForm.location : "Custom"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== "Custom") {
                          setEditForm({ ...editForm, location: val });
                        } else {
                          setEditForm({ ...editForm, location: "" });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none text-xs text-slate-800 dark:text-slate-100 cursor-pointer font-bold"
                    >
                      {Object.keys(REALTY_PROJECT_ADDRESSES).map((locKey) => (
                        <option key={locKey} value={locKey}>{locKey}</option>
                      ))}
                      <option value="Custom">Custom / Other Address...</option>
                    </select>
                  </div>
                </div>

                {editForm.appointmentType === "Site Visit" && REALTY_PROJECT_ADDRESSES[editForm.location] && (
                  <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900 rounded-lg text-[11px] text-teal-850 dark:text-teal-350">
                    <div className="font-bold uppercase text-[9px] tracking-wider text-teal-600 dark:text-teal-450">Project Address:</div>
                    <div className="font-medium mt-0.5">{REALTY_PROJECT_ADDRESSES[editForm.location]}</div>
                  </div>
                )}

                {/* Custom site location fallback option */}
                {(!Object.keys(REALTY_PROJECT_ADDRESSES).includes(editForm.location) || editForm.location === "") && (
                  <div className="space-y-1 pt-1">
                    <label className="block text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider">Custom Location Address</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="Enter other specific landmark/site address"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-705 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Display details */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-[10px] uppercase font-extrabold text-teal-650 dark:text-teal-400 tracking-wider flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5" /> Client Profile Details
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-slate-900 dark:text-slate-105 text-sm">{booking.clientName}</div>
                  <div>Client ID: <span className="font-mono font-bold text-slate-705 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">{booking.clientId}</span></div>
                  {booking.clientMobile && (
                    <div>Mobile Contact: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{booking.clientMobile}</span></div>
                  )}
                </div>
              </div>

              {/* Slot Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> Scheduled Date
                  </div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs font-mono">{booking.appointmentDate || "—"}</div>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> Scheduled Time
                  </div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs font-mono">{formatTimeWithAMPM(booking.appointmentTime)}</div>
                </div>
              </div>

              {/* Type, Location, Status */}
              <div className="space-y-3 p-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Appointment Type:
                  </span>
                  <span className="font-extrabold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-0.8 rounded text-xs select-none">
                    {booking.appointmentType || "Site Visit"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Current Status Indicator:
                  </span>
                  <span className={`px-2.5 py-0.8 rounded-full text-xs font-bold border ${getStatusStyle(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                {booking.location && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Site Project Location:
                    </span>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200 pl-4.5 text-xs">
                      {booking.location}
                    </div>
                    {REALTY_PROJECT_ADDRESSES[booking.location] && (
                      <div className="pl-4.5 text-[10px] text-slate-450 dark:text-slate-400 font-medium italic">
                        Complete Address: {REALTY_PROJECT_ADDRESSES[booking.location]}
                      </div>
                    )}
                  </div>
                )}

                {booking.notes && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider">
                      Remarks / Notes:
                    </span>
                    <p className="text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-950/35 p-2.5 rounded border dark:border-slate-800 italic font-medium">
                      "{booking.notes}"
                    </p>
                  </div>
                )}

                <div className="text-[10px] text-slate-450 border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between">
                  <span>Assigned Representative Agent:</span>
                  <strong className="text-slate-700 dark:text-slate-200">{booking.agentName}</strong>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex justify-end items-center gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
          {isEditing ? (
            <>
              {/* Swap Cancel and Save buttons: Save on the left, Cancel on the right */}
              <button 
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#00786f] hover:bg-[#005e57] transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm mr-auto"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setErrorText("");
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 border border-transparent transition-all cursor-pointer"
                disabled={saving}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {/* Done and Cancel updates inline */}
              {String(booking.status).toLowerCase() === "open" && (
                <div className="flex gap-2 mr-auto">
                  <button
                    onClick={() => handleUpdateStatus("Done" as any)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#00786f] hover:bg-[#005a53] transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Done
                  </button>
                  <button
                    onClick={() => handleUpdateStatus("Cancelled" as any)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#e7000b] hover:bg-[#b50008] transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  {/* Edit button and Close button */}
                  <button 
                    onClick={() => {
                      setIsEditing(true);
                      setEditForm({
                        appointmentDate: booking.appointmentDate || "",
                        appointmentTime: booking.appointmentTime || "",
                        appointmentType: booking.appointmentType || "Site Visit",
                        location: booking.location || "",
                      });
                      setErrorText("");
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-bold font-sans text-white bg-[#1447e6] hover:bg-[#1038b5] border border-transparent transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>

                  <button 
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 border border-transparent transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-905 rounded-xl border border-slate-150 dark:border-slate-800 shadow-2xl max-w-sm w-full overflow-hidden shrink-0 text-left">
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-105 text-sm leading-snug">{confirmDialog.title}</h3>
                <p className="text-slate-505 dark:text-slate-400 text-xs mt-2 leading-relaxed">{confirmDialog.message}</p>
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#00786f] hover:bg-[#005e57] transition-all cursor-pointer shadow-sm animate-scale-up"
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
    </div>
  );
}
