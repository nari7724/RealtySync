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

  // Duplicate states
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleValidateAndSubmit = async (e: React.FormEvent, force = false) => {
    e.preventDefault();
    setErrorObj(null);

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.mobileNumber.trim() || !formData.address.trim()) {
      setErrorObj("Please complete all required fields (*).");
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

      if (dupData.isDuplicate && !force) {
        // High matching score exists, trigger modal alert
        setDupResult(dupData);
        setShowWarningModal(true);
        return;
      }

      // No duplicate issues or user chose 'Proceed Anyway' override
      submitClient();
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
      setShowWarningModal(false);
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
        <button 
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {errorObj && (
        <div className="mb-5 bg-red-50 text-red-700 p-3.5 rounded-lg text-sm flex items-start gap-2.5 border border-red-100 animate-pulse">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorObj}</span>
        </div>
      )}

      <form onSubmit={(e) => handleValidateAndSubmit(e, false)} className="space-y-5">
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
            <p className="text-xs text-slate-400 mt-1">Accepts raw formats. Checked instantly against existing databases.</p>
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
          <p className="text-xs text-slate-400 mt-1">Fuzzy Cosine string similarity compares matches after normalizing punctuation.</p>
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
            type="button"
            onClick={onCancel}
            id="btn-client-cancel"
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Go Back
          </button>
          <button
            type="submit"
            id="btn-client-save"
            disabled={checking || loading}
            className="px-5 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5 cursor-pointer"
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
              "Save Client"
            )}
          </button>
        </div>
      </form>

      {/* DUPLICATE WARNING MODAL OVERLAY */}
      {showWarningModal && dupResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="duplicate-warning-modal">
          <div className="bg-white rounded-xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden shrink-0">
            {/* Header */}
            <div className="bg-amber-50 border-b border-amber-100 p-5 flex items-start gap-4">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  Duplicate Client Alert!
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  This client name or phone appears to already exist in RealtySync's tracking workspace.
                </p>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2.5 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Duplicate Risk Level:</span>
                  <span className={`font-bold uppercase ${dupResult.status === "Strong Duplicate" ? "text-red-600 animate-pulse" : "text-amber-600"}`}>
                    {dupResult.status} ({dupResult.score}%)
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Owning Agent:</span>
                  <span className="font-semibold text-slate-800">{dupResult.existingAgentName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">First Registered:</span>
                  <span className="text-slate-800">
                    {dupResult.existingRegistrationDate ? new Date(dupResult.existingRegistrationDate).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : "N/A"}
                  </span>
                </div>
              </div>

              {/* Similarity Matrix Breakdown */}
              {dupResult.scoreBreakdown && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                    Duplicate Score Breakdown
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-2.5 rounded-lg text-center border border-slate-100">
                      <div className="text-xs font-medium text-slate-500 mb-0.5">Name Jaro-Winkler</div>
                      <div className="text-base font-bold text-slate-800">{dupResult.scoreBreakdown.nameSimilarity}%</div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg text-center border border-slate-100">
                      <div className="text-xs font-medium text-slate-500 mb-0.5">Phone Exact</div>
                      <div className="text-base font-bold text-slate-800">{dupResult.scoreBreakdown.phoneMatch}%</div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg text-center border border-slate-100">
                      <div className="text-xs font-medium text-slate-500 mb-0.5">Address Cosine</div>
                      <div className="text-base font-bold text-slate-800">{dupResult.scoreBreakdown.addressSimilarity}%</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-amber-50/50 border border-amber-100/70 p-3.5 rounded-lg text-xs leading-relaxed text-amber-800">
                <strong>Attention:</strong> Duplicate claim rules require broker oversight. Saving may flag this profile in the **Broker Dual Entry Tracking Queue** for immediate audit investigation. 
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                id="duplicate-btn-override-cancel"
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                No, Cancel Submission
              </button>
              <button
                type="button"
                onClick={submitClient}
                disabled={loading}
                id="duplicate-btn-override-save"
                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording Override...
                  </>
                ) : (
                  "Proceed Anyway"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
