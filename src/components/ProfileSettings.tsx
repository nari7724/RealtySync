/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MessageModal } from "./MessageModal.tsx";
import { Shield, User, Key, KeyRound, Smartphone, BadgeCheck, AlertCircle, CheckCircle2, Loader2, CreditCard } from "lucide-react";
import { User as UserType, UserRole } from "../types.ts";

interface ProfileSettingsProps {
  currentUser: UserType;
  onUpdateSession: (updatedDetails: Partial<UserType>) => void;
  onAddLog?: () => void;
}

export function ProfileSettings({ currentUser, onUpdateSession, onAddLog }: ProfileSettingsProps) {
  const isAgent = currentUser.role === UserRole.AGENT;

  // Profile Form state (Agents only)
  const [profileData, setProfileData] = useState({
    firstName: currentUser.firstName,
    middleName: "",
    lastName: currentUser.lastName,
    mobileNumber: "",
    prcLicenseNumber: "",
  });

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password Form state (Admins and Agents)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [msgModal, setMsgModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ isOpen: false, type: "success", title: "", message: "" });

  // Fetch agent details on load if agent to populate middle name, mobile and PRC
  useEffect(() => {
    if (isAgent) {
      setLoadingProfile(true);
      fetch(`/api/agents?search=${currentUser.email}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to load");
        })
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const agent = data[0];
            setProfileData({
              firstName: agent.firstName || currentUser.firstName,
              middleName: agent.middleName || "",
              lastName: agent.lastName || currentUser.lastName,
              mobileNumber: agent.mobileNumber || "",
              prcLicenseNumber: agent.prcLicenseNumber || "",
            });
          }
        })
        .catch((err) => console.error("Could not fetch profile details:", err))
        .finally(() => setLoadingProfile(false));
    }
  }, [currentUser.email, isAgent]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess("");
    setProfileError("");

    if (!profileData.firstName || !profileData.lastName || !profileData.mobileNumber) {
      setProfileError("Please fill out all required fields marked with (*).");
      return;
    }

    setLoadingProfile(true);
    try {
      const res = await fetch(`/api/agents/${currentUser.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Failed to save profile changes.");
      }

      const updatedAgent = await res.json();

      // Update session locally on top state
      onUpdateSession({
        firstName: updatedAgent.firstName,
        lastName: updatedAgent.lastName,
      });

      setProfileSuccess("Your profile details have been successfully updated!");
      setMsgModal({
        isOpen: true,
        type: "success",
        title: "Profile Updated",
        message: "Your profile details have been successfully updated!"
      });
      if (onAddLog) onAddLog();
    } catch (err: any) {
      setProfileError(err.message || "An unexpected error occurred. Please try again.");
      setMsgModal({
        isOpen: true,
        type: "error",
        title: "Update Failed",
        message: err.message || "An unexpected error occurred. Please try again."
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("Please fill in current and new password fields.");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Your new password must be at least 6 characters long.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("The new password and confirm password fields do not match.");
      return;
    }

    setLoadingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          oldPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Failed to update login password.");
      }

      setPasswordSuccess("Your account credentials password was successfully changed!");
      setMsgModal({
        isOpen: true,
        type: "success",
        title: "Password Changed",
        message: "Your account credentials password was successfully changed!"
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      if (onAddLog) onAddLog();
    } catch (err: any) {
      setPasswordError(err.message || "An unexpected error occurred. Please verify your current credentials.");
      setMsgModal({
        isOpen: true,
        type: "error",
        title: "Password Change Failed",
        message: err.message || "An unexpected error occurred. Please verify your current credentials."
      });
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-0" id="profile-settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-teal-700" />
          Profile & Security Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your registered information, edit your agent visibility card, and renew your account security passwords.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Agent Profile info card (Only visible to agent) */}
        {isAgent ? (
          <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="border-b border-slate-100 p-5 bg-slate-50/50">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-teal-700" />
                Edit Profile Information
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">Update your operational contact detail record</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="p-5 space-y-4">
              {profileSuccess && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-3.5 rounded-lg text-xs flex items-start gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="bg-red-50 text-red-800 border border-red-100 p-3.5 rounded-lg text-xs flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 bg-slate-50 focus:bg-white transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Middle Name</label>
                  <input
                    type="text"
                    name="middleName"
                    placeholder="Optional"
                    value={profileData.middleName}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 bg-slate-50 focus:bg-white transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    name="mobileNumber"
                    placeholder="e.g. 0917-xxx-xxxx"
                    value={profileData.mobileNumber}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 bg-slate-50 focus:bg-white transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">PRC License (Optional)</label>
                  <input
                    type="text"
                    name="prcLicenseNumber"
                    placeholder="e.g. 001234"
                    value={profileData.prcLicenseNumber}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={loadingProfile}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loadingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Static Admin Info Card */
          <div className="bg-white rounded-xl border border-slate-150 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-50 rounded-full text-teal-800">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 select-none">Admin Authority Profile</h2>
                <p className="text-xs text-slate-400">RealtySync Central Administration Console</p>
              </div>
            </div>

            <div className="bg-slate-50/75 p-4 rounded-xl border border-slate-100 font-mono text-xs space-y-2">
              <div className="flex justify-between py-1">
                <span className="text-slate-400 uppercase tracking-tight text-[10px] font-semibold">User Role:</span>
                <span className="text-slate-700 font-extrabold">{currentUser.role}</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-400 uppercase tracking-tight text-[10px] font-semibold">Display Title:</span>
                <span className="text-slate-700">{currentUser.firstName} {currentUser.lastName}</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-400 uppercase tracking-tight text-[10px] font-semibold">Administrator Email:</span>
                <span className="text-slate-700 underline select-all">{currentUser.email}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed italic select-none">
              Note: System Administrator authority permissions cannot be self-modified directly in this view. Only passwords can be changed under the security policy cards.
            </p>
          </div>
        )}

        {/* Password update card (Visible to both admin and agent) */}
        <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="border-b border-slate-100 p-5 bg-slate-50/50">
            <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Key className="w-4 h-4 text-teal-700" />
              Update Account Password
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">Change your current security entry credentials</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
            {passwordSuccess && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-3.5 rounded-lg text-xs flex items-start gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="bg-red-50 text-red-800 border border-red-100 p-3.5 rounded-lg text-xs flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current/Temporary Password *</label>
              <div className="relative">
                <input
                  type="password"
                  name="currentPassword"
                  placeholder="Enter current password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 bg-slate-50 focus:bg-white transition-colors"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New password *</label>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="Min 6 characters"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 bg-slate-50 focus:bg-white transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Confirm password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Repeat new password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 bg-slate-50 focus:bg-white transition-colors"
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={loadingPassword}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loadingPassword ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Renewing credentials...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    Renew Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
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
