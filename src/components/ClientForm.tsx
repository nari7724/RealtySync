/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AlertTriangle, MapPin, Phone, User, Check, AlertCircle, X, Loader2, Sparkles } from "lucide-react";
import { Client, DuplicateCheckResult, Agent } from "../types.ts";

interface ClientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  agentsList: Agent[];
  currentUser: { id: string; firstName: string; lastName: string; role: string };
}

export function ClientForm({ onSuccess, onCancel, agentsList, currentUser }: ClientFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    mobileNumber: "",
    address: "",
    facebookProfileLink: "",
    sourceOfLead: "Facebook Ad",
    notes: "",
    assignedAgentId: currentUser.role === "ADMIN" ? "" : currentUser.id,
  });

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorObj, setErrorObj] = useState<string | null>(null);

  // Duplicate and confirmation states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleValidateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorObj(null);

    // Business Logic & Input Validations
    const nameRegex = /^[A-Za-z\s.\-]+$/;
    const phoneRegex = /^(09|\+639|639)\d{9}$/;

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.mobileNumber.trim() || !formData.address.trim()) {
      setErrorObj("Please complete all required fields (*).");
      return;
    }

    if (!nameRegex.test(formData.firstName.trim())) {
      setErrorObj("First name must only contain alphabetical letters, dots, dashes, or spaces.");
      return;
    }

    if (!nameRegex.test(formData.lastName.trim())) {
      setErrorObj("Last name must only contain alphabetical letters, dots, dashes, or spaces.");
      return;
    }

    if (formData.middleName.trim() && !nameRegex.test(formData.middleName.trim())) {
      setErrorObj("Middle name must only contain alphabetical letters, dots, dashes, or spaces.");
      return;
    }

    if (!phoneRegex.test(formData.mobileNumber.trim())) {
      setErrorObj("Mobile number must be a valid Philippine mobile number format (e.g. 09171234567, +639171234567, or 639171234567).");
      return;
    }

    if (formData.address.trim().length < 10) {
      setErrorObj("Please enter a more descriptive address (minimum 10 characters).");
      return;
    }

    if (formData.facebookProfileLink.trim() && formData.facebookProfileLink.includes(" ")) {
      setErrorObj("Social Media Profile Link cannot contain spaces.");
      return;
    }

    // Only active agents can have accounts assigned
    if (currentUser.role === "ADMIN" && !formData.assignedAgentId) {
      setErrorObj("Please assign a primary real estate agent for this client registration.");
      return;
    }

    setChecking(true);

    try {
      // 1. Instantly check duplicate matches
      const checkRes = await fetch("/api/clients/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!checkRes.ok) {
        throw new Error("Unable to complete duplicate detection algorithm.");
      }

      const dupData: DuplicateCheckResult = await checkRes.json();
      setChecking(false);
      setDupResult(dupData);
      setShowConfirmModal(true); // Always ask confirmation before saving!
    } catch (err: any) {
      setChecking(false);
      setErrorObj(err.message || "An unexpected network error occurred.");
    }
  };

  const submitClient = async () => {
    setLoading(true);
    setErrorObj(null);

    const postPayload = {
      ...formData,
      assignedAgentName: currentUser.role === "ADMIN" 
        ? agentsList.find(a => a.id === formData.assignedAgentId)?.firstName + " " + agentsList.find(a => a.id === formData.assignedAgentId)?.lastName
        : `${currentUser.firstName} ${currentUser.lastName}`,
      userContext: {
        id: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        email: (currentUser as any).email || "sarah@realtysync.com",
        role: currentUser.role,
      }
    };

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postPayload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Client registration failed.");
      }

      setLoading(false);
      setShowConfirmModal(false);
      onSuccess();
    } catch (err: any) {
      setLoading(false);
      setErrorObj(err.message);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-2xl mx-auto" id="register-client-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Register New Client Profile
          </h2>
          <p className="text-sm text-slate-500">Every submission is instantly screened through our duplicate risk checks.</p>
        </div>
      </div>

      {errorObj && (
        <div className="mb-5 bg-red-50 text-red-700 p-3.5 rounded-lg text-sm flex items-start gap-2.5 border border-red-100 animate-pulse">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorObj}</span>
        </div>
      )}

      <form onSubmit={handleValidateAndSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">First Name *</label>
            <input
              type="text"
              name="firstName"
              id="field-client-firstname"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="e.g. Juan"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-sm placeholder-slate-400 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Middle Name</label>
            <input
              type="text"
              name="middleName"
              id="field-client-middlename"
              value={formData.middleName}
              onChange={handleChange}
              placeholder="e.g. Dela"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-sm placeholder-slate-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Last Name *</label>
            <input
              type="text"
              name="lastName"
              id="field-client-lastname"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="e.g. Cruz"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-sm placeholder-slate-400 transition-colors"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Mobile Number *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="mobileNumber"
                id="field-client-mobile"
                value={formData.mobileNumber}
                onChange={handleChange}
                placeholder="e.g. 09171234567"
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-sm placeholder-slate-400 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Facebook Profile Link</label>
            <input
              type="text"
              name="facebookProfileLink"
              id="field-client-facebook"
              value={formData.facebookProfileLink}
              onChange={handleChange}
              placeholder="e.g. facebook.com/username"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-sm placeholder-slate-400 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Address *</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              name="address"
              id="field-client-address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. 123 Mabini Street, Manila"
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-sm placeholder-slate-400 transition-colors"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Source of Lead</label>
            <select
              name="sourceOfLead"
              id="field-client-source"
              value={formData.sourceOfLead}
              onChange={handleChange}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 text-sm transition-colors"
            >
              <option value="Facebook Ad">Facebook Ad</option>
              <option value="Direct Walk-In">Direct Walk-In</option>
              <option value="Broker Referral">Broker Referral</option>
              <option value="Flyer">Flyer</option>
              <option value="Website Inquiry">Website Inquiry</option>
              <option value="Google Organic">Google Organic</option>
            </select>
          </div>

          {currentUser.role === "ADMIN" && (
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Assign Agent *</label>
              <select
                name="assignedAgentId"
                id="field-client-assignagent"
                value={formData.assignedAgentId}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 text-sm transition-colors"
                required
              >
                <option value="">-- Choose Agent --</option>
                {agentsList
                  .filter(a => a.status === "Active")
                  .map(a => (
                    <option key={a.id} value={a.id}>{a.firstName} {a.lastName} (PRC: {a.prcLicenseNumber})</option>
                  ))
                }
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Lead Notes / Remarks</label>
          <textarea
            name="notes"
            id="field-client-notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Add relevant comments or client investment timelines..."
            rows={2}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-sm placeholder-slate-400 transition-colors"
          ></textarea>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            id="btn-client-save"
            disabled={checking || loading}
            className="px-5 py-2 text-sm font-bold text-white bg-[#00786f] hover:bg-[#005e57] disabled:bg-[#00786f]/50 rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Screening Duplicates...
              </>
            ) : loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering...
              </>
            ) : (
              "Save"
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            id="btn-client-cancel"
            className="px-4 py-2 text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-lg transition-all border border-transparent shadow-sm cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* CONFIRMATION MODAL OVERLAY */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="client-confirm-modal">
          <div className="bg-white rounded-xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden shrink-0">
            
            {/* Header dependent on whether duplicate is found or not */}
            {dupResult?.isDuplicate ? (
              <div className="bg-amber-50 border-b border-amber-100 p-5 flex items-start gap-4">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-full shrink-0">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    Duplicate Integrity Alert detected!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    RealtySync Duplicate System detected a potential overlap with an existing register.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-teal-50 border-b border-teal-100 p-5 flex items-start gap-4">
                <div className="p-2.5 bg-teal-100 text-teal-800 rounded-full shrink-0">
                  <Sparkles className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    Confirm Client Registration
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Please confirm the client details below to finalize register save.
                  </p>
                </div>
              </div>
            )}

            {/* Profile Summary Info */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-3 text-sm">
                <div className="flex border-b border-slate-100 pb-1.5 justify-between">
                  <span className="text-slate-500 font-medium">Customer Name:</span>
                  <span className="font-semibold text-slate-800">{formData.firstName} {formData.middleName} {formData.lastName}</span>
                </div>
                <div className="flex border-b border-slate-100 pb-1.5 justify-between">
                  <span className="text-slate-500 font-medium">Contact Number:</span>
                  <span className="font-mono text-slate-800">{formData.mobileNumber}</span>
                </div>
                <div className="flex border-b border-slate-100 pb-1.5 justify-between">
                  <span className="text-slate-500 font-medium">Address:</span>
                  <span className="text-slate-800 truncate max-w-[240px]" title={formData.address}>{formData.address}</span>
                </div>
                {formData.facebookProfileLink && (
                  <div className="flex border-b border-slate-100 pb-1.5 justify-between">
                    <span className="text-slate-500 font-medium">Social Profile:</span>
                    <span className="text-slate-800 truncate max-w-[240px] font-mono text-xs">{formData.facebookProfileLink}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Lead Source:</span>
                  <span className="text-slate-800 font-semibold">{formData.sourceOfLead}</span>
                </div>
              </div>

              {/* DUPLICATE WARNING BLOCK IN THE PROMPT */}
              {dupResult?.isDuplicate && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-lg text-sm space-y-2">
                  <div className="font-bold text-red-800 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Possible Dual Entry Info:
                  </div>
                  <div className="text-xs text-slate-705 space-y-1 font-medium">
                    <p>• Duplicate Record Client ID: <span className="font-mono font-bold text-red-850 bg-red-100/60 px-1 py-0.5 rounded">{dupResult.existingClientId}</span></p>
                    <p>• Registered Agent Name: <span className="font-bold text-red-850">{dupResult.existingAgentName}</span></p>
                    <p>• Similarity Match Status: <span className="text-red-700 font-bold bg-white/70 px-1 py-0.5 rounded shadow-sm">{dupResult.status} ({dupResult.score}%)</span></p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-red-600 font-semibold mt-2.5">
                    Warning: Clicking "Confirm & Register" will register this anyway and file a dual entry flag in the review queue.
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-550">
                Are you sure you want to proceed and save this registration record?
              </p>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                No, Back to Form
              </button>
              <button
                type="button"
                onClick={submitClient}
                disabled={loading}
                className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer ${
                  dupResult?.isDuplicate ? "bg-amber-600 hover:bg-amber-700" : "bg-[#00786f] hover:bg-[#005e57]"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Confirm & Save"
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
