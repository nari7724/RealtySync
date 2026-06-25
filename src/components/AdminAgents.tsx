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
  Smartphone,
  Key
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Form states
  const [generatedPasswordModal, setGeneratedPasswordModal] = useState<{ email: string; password?: string; name: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

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
    setCurrentPage(1);
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
    setConfirmDialog({
      title: "Change Agent Account Status",
      message: `Are you sure you want to change this agent's status to '${newStatus}'?`,
      onConfirm: async () => {
        setConfirmDialog(null);
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
            const data = await res.json();
            if (data.tempPassword) {
              setGeneratedPasswordModal({
                email: agent.email,
                password: data.tempPassword,
                name: `${agent.firstName} ${agent.lastName}`
              });
            }
            fetchAgents();
            onAddLog();
          }
        } catch (err) {
          console.error("Error toggling status:", err);
        }
      }
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.mobileNumber) {
      setErrorText("Please complete all required fields (*).");
      return;
    }

    setConfirmDialog({
      title: editingAgent ? "Update Agent Profile" : "Register Agent Profile",
      message: `Are you sure you want to ${editingAgent ? "update/save existing agent" : "save and register new agent"} details?`,
      onConfirm: async () => {
        setConfirmDialog(null);
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

          const data = await res.json();
          if (data.tempPassword) {
            setGeneratedPasswordModal({
              email: formData.email,
              password: data.tempPassword,
              name: `${formData.firstName} ${formData.lastName}`
            });
          }

          setShowModal(false);
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
          fetchAgents();
          onAddLog();
        } catch (err: any) {
          setErrorText(err.message || "An error occurred while saving the agent profile.");
        } finally {
          setSaving(false);
        }
      }
    });
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5" id="agents-grid-container">
            {(() => {
              const sorted = [...agents].sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeB - timeA;
              });
              const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
              return paginated.map((agent) => (
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
              ));
            })()}
          </div>

          {/* Simple Pagination Footer */}
          {(() => {
            const totalItems = agents.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            if (totalPages <= 1) return null;
            return (
              <div className="bg-slate-50 border border-slate-200 px-6 py-3 flex items-center justify-between rounded-xl">
                <span className="text-xs text-slate-500">Page {currentPage} of {totalPages} ({totalItems} entries total)</span>
                <div className="flex gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 border border-slate-200 text-slate-600 rounded text-xs font-semibold"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 border border-slate-200 text-slate-600 rounded text-xs font-semibold"
                  >
                    Next
                  </button>
                </div>
              </div>
            );
          })()}
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
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PRC License Number (Optional)</label>
                  <input
                    type="text"
                    name="prcLicenseNumber"
                    id="agent-input-license"
                    value={formData.prcLicenseNumber}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                    placeholder="e.g. 0023412"
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

      {/* Generated Password Modal showing Temporary Credentials */}
      {generatedPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 text-amber-800">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Temporary Credentials Generated</h3>
                <p className="text-xs text-slate-500">Credentials created for new or reactivated login</p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="leading-relaxed text-slate-600 font-medium">
                Please copy and share this temporary password securely with <strong className="text-slate-900">{generatedPasswordModal.name}</strong>. They will be prompted to replace this with a secure password upon logging in.
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 uppercase tracking-tight text-[10px] font-semibold">User Profile:</span>
                  <span className="text-slate-850 font-semibold">{generatedPasswordModal.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-slate-100">
                  <span className="text-slate-400 uppercase tracking-tight text-[10px] font-semibold">Login Email:</span>
                  <span className="text-slate-850 font-bold select-all">{generatedPasswordModal.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-slate-100">
                  <span className="text-slate-400 uppercase tracking-tight text-[10px] font-semibold">Temporary Password:</span>
                  <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded font-extrabold text-sm border border-amber-200 select-all tracking-wider">
                    {generatedPasswordModal.password}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (generatedPasswordModal.password) {
                      navigator.clipboard.writeText(generatedPasswordModal.password);
                    }
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-semibold transition-all cursor-pointer"
                >
                  Copy Password
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratedPasswordModal(null)}
                  className="px-5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all cursor-pointer shadow-sm"
                >
                  Done, I Have Saved It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
