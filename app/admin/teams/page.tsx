"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Shield,
  PlusCircle,
  RefreshCw,
  MapPin,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Flame,
  Stethoscope,
  LifeBuoy,
  ShieldCheck,
  CloudLightning,
  LocateFixed,
  X,
} from "lucide-react";

interface TeamItem {
  id: string;
  code: string;
  name: string;
  category: "FIRE" | "MEDICAL" | "RESCUE" | "POLICE" | "DISASTER" | string;
  latitude: number;
  longitude: number;
  address?: string | null;
  status: "AVAILABLE" | "BUSY" | string;
  currentIncidentId?: string | null;
  currentIncident?: {
    id: string;
    title: string;
    category: string;
    severity: string;
    status: string;
  } | null;
}

export default function TeamsManagementPage() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Form fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("FIRE");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to load response teams");
      const data = await res.json();
      setTeams(data);
    } catch (err: any) {
      showToast(err.message || "Failed to load teams", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const openCreateModal = () => {
    setEditingTeam(null);
    setCode("");
    setName("");
    setCategory("FIRE");
    setLatitude("");
    setLongitude("");
    setAddress("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (team: TeamItem) => {
    setEditingTeam(team);
    setCode(team.code);
    setName(team.name);
    setCategory(team.category);
    setLatitude(team.latitude.toString());
    setLongitude(team.longitude.toString());
    setAddress(team.address || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFormError("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setFormError(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lngNum)) {
      setFormError("Valid latitude and longitude numbers are required");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingTeam) {
        // PATCH
        const res = await fetch(`/api/teams/${editingTeam.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            category,
            latitude: latNum,
            longitude: lngNum,
            address,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to update team");
        }

        showToast(`Team ${editingTeam.code} updated successfully`);
      } else {
        // POST
        const res = await fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            name,
            category,
            latitude: latNum,
            longitude: lngNum,
            address,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to create team");
        }

        showToast(`Team ${code.toUpperCase()} registered successfully`);
      }

      setIsModalOpen(false);
      await loadTeams();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Availability Toggle (only when team has no assigned incident)
  const handleToggleAvailability = async (team: TeamItem) => {
    if (team.currentIncidentId || team.currentIncident) {
      showToast("Cannot toggle availability while team is assigned to an incident", "error");
      return;
    }

    const newStatus = team.status === "AVAILABLE" ? "BUSY" : "AVAILABLE";
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update team availability");
      }

      setTeams((prev) =>
        prev.map((t) => (t.id === team.id ? { ...t, status: newStatus } : t))
      );
      showToast(`Team ${team.code} marked ${newStatus}`);
    } catch (err: any) {
      showToast(err.message || "Failed to update availability", "error");
    }
  };

  // Delete Team Handler
  const handleDeleteTeam = async (team: TeamItem) => {
    const confirmMessage = team.currentIncidentId
      ? `Team ${team.code} is currently assigned to an incident! Deleting will automatically unassign the incident and reset it to REPORTED. Continue?`
      : `Are you sure you want to delete team ${team.code}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete team");
      }

      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      showToast(`Team ${team.code} deleted`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete team", "error");
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case "FIRE":
        return <Flame className="h-4 w-4 text-orange-600" />;
      case "MEDICAL":
        return <Stethoscope className="h-4 w-4 text-rose-600" />;
      case "RESCUE":
        return <LifeBuoy className="h-4 w-4 text-blue-600" />;
      case "POLICE":
        return <ShieldCheck className="h-4 w-4 text-indigo-600" />;
      case "DISASTER":
      default:
        return <CloudLightning className="h-4 w-4 text-amber-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-cream min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 shadow-xl transition-all border ${
            toast.type === "success"
              ? "bg-navy text-cream border-slate/40"
              : "bg-burgundy text-cream border-burgundy-hover"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0" />
          )}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-dark">
              Fleet & Personnel Operations
            </span>
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight mt-1">
            Emergency Response Teams
          </h1>
          <p className="text-sm text-navy/70 mt-1 font-medium">
            Manage field units, monitor GPS staging bases, and view incident assignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadTeams}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold border border-slate/40 bg-cardBg text-navy hover:bg-cream transition shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-burgundy text-cream hover:bg-burgundy-light transition shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Deploy New Unit</span>
          </button>
        </div>
      </div>

      {/* Teams Grid / List */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center bg-cardBg rounded-2xl border border-slate/40">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate/40 border-t-burgundy mb-4" />
          <p className="text-sm font-bold text-navy">Loading emergency response teams...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="p-16 text-center bg-cardBg rounded-2xl border border-slate/40">
          <Shield className="h-12 w-12 text-slate mx-auto mb-3" />
          <h3 className="text-lg font-bold text-navy">No response teams registered</h3>
          <p className="text-sm text-navy/70 mt-1">Deploy response teams to enable automated candidate dispatch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => {
            const isAvailable = team.status === "AVAILABLE";
            const hasAssignedIncident = !!(team.currentIncidentId || team.currentIncident);

            return (
              <div
                key={team.id}
                className="bg-cardBg rounded-2xl border border-slate/40 p-5 shadow-sm hover:border-slate transition flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Code, Category, Availability */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-navy bg-cream px-2 py-0.5 rounded-md border border-slate/40">
                        {team.code}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-navy/80">
                        {getCategoryIcon(team.category)}
                        <span>{team.category}</span>
                      </div>
                    </div>

                    {/* Availability Badge */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        isAvailable
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-slate-200 text-slate-800 border-slate-300"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                          isAvailable ? "bg-emerald-600" : "bg-slate-600"
                        }`}
                      />
                      {isAvailable ? "Available" : "Busy"}
                    </span>
                  </div>

                  {/* Team Name */}
                  <h3 className="text-base font-extrabold text-navy">{team.name}</h3>

                  {/* Location */}
                  <div className="flex items-start gap-1.5 mt-2 text-xs text-navy/80 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-burgundy shrink-0 mt-0.5" />
                    <span>
                      {team.address || `${team.latitude.toFixed(4)}, ${team.longitude.toFixed(4)}`}
                    </span>
                  </div>

                  {/* Assigned Incident Section */}
                  <div className="mt-4 pt-3 border-t border-slate/30">
                    <span className="text-[11px] font-bold text-slate-dark uppercase tracking-wider block mb-1">
                      Current Assignment
                    </span>
                    {hasAssignedIncident && team.currentIncident ? (
                      <Link
                        href={`/admin/incidents/${team.currentIncident.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-burgundy hover:underline bg-burgundy/10 px-2.5 py-1 rounded-lg border border-burgundy/20"
                      >
                        <span className="truncate max-w-[200px]">
                          {team.currentIncident.title}
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold text-slate">
                        No active dispatch
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Controls: Toggle Availability, Edit, Delete */}
                <div className="mt-5 pt-3 border-t border-slate/30 flex items-center justify-between">
                  {/* Manual Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(team)}
                    disabled={hasAssignedIncident}
                    title={
                      hasAssignedIncident
                        ? "Cannot toggle availability while unit is actively assigned"
                        : "Toggle Available / Busy"
                    }
                    className={`text-xs font-bold px-3 py-1 rounded-lg border transition ${
                      hasAssignedIncident
                        ? "opacity-50 cursor-not-allowed bg-cream text-slate border-slate/40"
                        : isAvailable
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                    }`}
                  >
                    {isAvailable ? "Set Busy" : "Set Available"}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(team)}
                      className="p-1.5 rounded-lg text-slate-dark hover:text-navy hover:bg-cream border border-transparent hover:border-slate/40 transition"
                      title="Edit Team"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTeam(team)}
                      className="p-1.5 rounded-lg text-slate-dark hover:text-burgundy hover:bg-burgundy/10 border border-transparent hover:border-burgundy/20 transition"
                      title="Delete Team"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-cardBg rounded-2xl border border-slate/40 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate/30">
              <h3 className="text-lg font-black text-navy">
                {editingTeam ? `Edit Team (${editingTeam.code})` : "Deploy Response Unit"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate hover:text-navy rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-navy mb-1 uppercase tracking-wider">
                    Team Code
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingTeam}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. FIRE-03"
                    className="w-full rounded-xl border border-slate/40 bg-cream px-3 py-2 text-xs font-bold text-navy placeholder:text-slate focus:border-burgundy focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-navy mb-1 uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate/40 bg-cream px-3 py-2 text-xs font-bold text-navy focus:border-burgundy focus:outline-none"
                  >
                    <option value="FIRE">FIRE</option>
                    <option value="MEDICAL">MEDICAL</option>
                    <option value="RESCUE">RESCUE</option>
                    <option value="POLICE">POLICE</option>
                    <option value="DISASTER">DISASTER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-navy mb-1 uppercase tracking-wider">
                  Team / Unit Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Central Rapid Rescue Squad"
                  className="w-full rounded-xl border border-slate/40 bg-cream px-3 py-2 text-xs font-bold text-navy placeholder:text-slate focus:border-burgundy focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-extrabold text-navy uppercase tracking-wider">
                    Base Coordinates
                  </label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-burgundy hover:underline"
                  >
                    <LocateFixed className="h-3 w-3" />
                    <span>{isLocating ? "Detecting GPS..." : "Use my current location"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="Latitude (e.g. 13.0827)"
                    className="w-full rounded-xl border border-slate/40 bg-cream px-3 py-2 text-xs font-bold text-navy placeholder:text-slate focus:border-burgundy focus:outline-none"
                  />
                  <input
                    type="number"
                    step="any"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="Longitude (e.g. 80.2707)"
                    className="w-full rounded-xl border border-slate/40 bg-cream px-3 py-2 text-xs font-bold text-navy placeholder:text-slate focus:border-burgundy focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-navy mb-1 uppercase tracking-wider">
                  Base Address / Station Name (Optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. EVR Salai, Park Town, Chennai"
                  className="w-full rounded-xl border border-slate/40 bg-cream px-3 py-2 text-xs font-bold text-navy placeholder:text-slate focus:border-burgundy focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate/30 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-navy bg-cream border border-slate/40 rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-black text-cream bg-burgundy rounded-xl hover:bg-burgundy-light transition shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingTeam ? "Update Team" : "Save Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

