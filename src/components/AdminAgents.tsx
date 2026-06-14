/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  UserPlus, 
  Edit3, 
  ShieldAlert, 
  CheckCircle, 
  X, 
  Loader2, 
  UserX, 
  CreditCard,
  Mail,
  Smartphone
} from "lucide-react";
import { Agent } from "../types.ts";

interface AdminAgentsProps {
  onAddLog: () => void;
  currentUser: any;
}

export function AdminAgents({ onAddLog, currentUser }: AdminAgentsProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
    prcLicenseNumber: "",
  });

  const fetchAgents = async () => {
    setLoading(true);
    try {
      let url = "/api/agents";
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (err) {
      console.error("Error loading agents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [searchQuery, statusFilter]);

  const handleOpenAdd = () => {
    setEditingAgent(null);
    setFormData({
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      mobileNumber: "",
      prcLicenseNumber: "",
    });
    setErrorText("");
    setShowModal(true);
  };

  const handleOpenEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      firstName: agent.firstName,
      middleName: agent.middleName || "",
      lastName: agent.lastName,
      email: agent.email,
      mobileNumber: agent.mobileNumber,
      prcLicenseNumber: agent.prcLicenseNumber,
    });
    setErrorText("");
    setShowModal(true);
  };

  const handleToggleStatus = async (agent: Agent) => {
    const newStatus = agent.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          userContext: {
            id: currentUser.id,
            email: currentUser.email,
            userName: `${currentUser.firstName} ${currentUser.lastName}`
          }
        }),
      });

      if (res.ok) {
        fetchAgents();
        onAddLog();
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.mobileNumber || !formData.prcLicenseNumber) {
      setErrorText("Please complete all required fields (*).");
      return;
    }

    setSaving(true);
    setErrorText("");

    try {
      const endpoint = editingAgent ? `/api/agents/${editingAgent.id}` : "/api/agents";
      const method = editingAgent ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          userContext: {
            id: currentUser.id,
            email: currentUser.email,
            userName: `${currentUser.firstName} ${currentUser.lastName}`
          }
        }),
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Save operation failed.");
      }

      setShowModal(false);
      fetchAgents();
      onAddLog();
    } catch (err: any) {
      setErrorText(err.message || "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="agents-panel-container">
      {/* Module Title and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-700 font-bold" />
            Agent Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage broker agents, view license status, and control system authorization level.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          id="btn-add-agent-open"
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add Broker Agent
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            id="agent-search-bar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents by Name, Email, Phone, or PRC License..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-sm placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            id="agent-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 text-sm min-w-[150px]"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Agents lists Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 p-16 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Parsing broker logs...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-16 text-center shadow-sm text-slate-450">
          <p className="text-slate-500 text-sm">No registered agents matched the search filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5" id="agents-grid-container">
          {agents.map((agent) => (
            <div 
              key={agent.id} 
              className={`bg-white rounded-xl border p-5 shadow-sm transition-all relative overflow-hidden flex flex-col justify-between ${
                agent.status === "Active" ? "border-slate-100" : "border-red-100 bg-red-50/10"
              }`}
            >
              {/* Soft status tag indicator */}
              <div className="absolute right-4 top-4">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  agent.status === "Active" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                }`}>
                  {agent.status}
                </span>
              </div>

              {/* Profile body */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full font-bold flex items-center justify-center text-md uppercase ${
                    agent.status === "Active" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {agent.firstName[0]}{agent.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 leading-snug text-base">
                      {agent.firstName} {agent.middleName ? `${agent.middleName} ` : ""}{agent.lastName}
                    </h3>
                    <p className="text-xs text-slate-400">Registered: {new Date(agent.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600 border-t border-slate-100/70 pt-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{agent.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{agent.mobileNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono font-medium text-slate-700">PRC: {agent.prcLicenseNumber}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                <button
                  onClick={() => handleOpenEdit(agent)}
                  id={`agent-btn-edit-${agent.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>

                <button
                  onClick={() => handleToggleStatus(agent)}
                  id={`agent-btn-status-${agent.id}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 border cursor-pointer ${
                    agent.status === "Active" 
                      ? "text-red-650 bg-red-50 hover:bg-red-100 border-red-200" 
                      : "text-green-650 bg-green-50 hover:bg-green-100 border-green-200"
                  }`}
                >
                  {agent.status === "Active" ? (
                    <>
                      <UserX className="w-3.5 h-3.5" />
                      Deactivate Agent
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Reactivate Agent
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FORM MODAL (Add / Edit Agent) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="agent-form-modal">
          <div className="bg-white rounded-xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden shrink-0">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingAgent ? "Edit Agent Records" : "Register Broker Agent"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-150 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorText && (
              <div className="mx-6 mt-4 p-3.5 bg-red-50 text-red-750 text-sm border border-red-100 rounded-lg">
                {errorText}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    id="agent-input-firstname"
                    value={formData.firstName}
                    onChange={handleFormChange}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                    placeholder="e.g. Sarah"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Middle Name</label>
                  <input
                    type="text"
                    name="middleName"
                    id="agent-input-middlename"
                    value={formData.middleName}
                    onChange={handleFormChange}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                    placeholder="e.g. A."
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    id="agent-input-lastname"
                    value={formData.lastName}
                    onChange={handleFormChange}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                    placeholder="e.g. Ramirez"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  id="agent-input-email"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                  placeholder="e.g. sarah.ramirez@realtysync.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    name="mobileNumber"
                    id="agent-input-mobile"
                    value={formData.mobileNumber}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                    placeholder="e.g. 09178234567"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PRC License Number *</label>
                  <input
                    type="text"
                    name="prcLicenseNumber"
                    id="agent-input-license"
                    value={formData.prcLicenseNumber}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                    placeholder="e.g. 0023412"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-650 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  id="agent-form-btn-submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow inline-flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Records...
                    </>
                  ) : (
                    "Save Agent"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
