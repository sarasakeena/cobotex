"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Shield,
  Activity,
  Layers,
  X,
  ExternalLink,
  Tag,
  ImageIcon,
  Zap,
  Navigation,
  Check,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import { formatCategoryName } from "@/lib/severity";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmModal } from "@/components/ConfirmModal";

const IncidentDetailMap = dynamic(
  () => import("@/components/IncidentDetailMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 rounded-2xl bg-cardBg border border-slate/40 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate/40 border-t-burgundy" />
      </div>
    ),
  }
);

interface IncidentDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  tags?: string[];
  photo?: string | null;
  peopleAffected: number;
  contactInfo?: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "REPORTED" | "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED";
  assignedTeamId?: string | null;
  assignedTeam?: {
    id: string;
    code: string;
    name: string;
    category: string;
    latitude: number;
    longitude: number;
    address?: string | null;
    status: string;
  } | null;
  assignedAt?: string | null;
  distanceKm?: number | null;
  etaMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
  severityScore?: number;
  severityReasons?: string[];
  priority?: {
    score: number;
    level: "P1" | "P2" | "P3" | "P4";
    reasons: string[];
    waitingMinutes: number;
  };
}

interface CandidateTeam {
  team: {
    id: string;
    code: string;
    name: string;
    category: string;
    latitude: number;
    longitude: number;
    address?: string | null;
    status: string;
  };
  distanceKm: number;
  etaMinutes: number;
  fitScore: number;
  suitabilityRank: number;
  penaltyKm: number;
}

const STATUS_STEPS = [
  { value: "REPORTED", label: "Reported" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
];

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [candidates, setCandidates] = useState<CandidateTeam[]>([]);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchIncident = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/incidents/${id}`);
      if (!res.ok) {
        throw new Error("Incident not found or failed to load");
      }
      const data = await res.json();
      setIncident(data);
    } catch (err: any) {
      showToast(err.message || "Failed to load incident details", "error");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchCandidates = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoadingCandidates(true);
      setCandidatesError(null);
      const res = await fetch(`/api/incidents/${id}/candidates`);
      const data = await res.json();
      if (!res.ok) {
        setCandidatesError(data.error || "Failed to load candidates");
        setCandidates([]);
      } else {
        if (data.error) {
          setCandidatesError(data.error);
        }
        setCandidates(data.candidates || []);
      }
    } catch (err: any) {
      setCandidatesError(err.message || "Network error loading candidates");
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  useEffect(() => {
    if (incident && !incident.assignedTeamId && incident.status !== "RESOLVED") {
      fetchCandidates();
    }
  }, [incident, fetchCandidates]);

  // Handle Auto-Assign or Manual Assign
  const handleAssignTeam = async (teamId?: string) => {
    try {
      setIsAssigning(true);
      const res = await fetch(`/api/incidents/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamId ? { teamId } : {}),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Assignment failed");
      }

      showToast(
        `Dispatched ${data.assignedTeam.code} (${data.assignedTeam.name}) - Distance: ${data.distanceKm ?? "N/A"}km, ETA: ~${data.etaMinutes ?? "N/A"}m`
      );

      await fetchIncident();
    } catch (err: any) {
      showToast(err.message || "Failed to assign team", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle Unassign
  const handleUnassignTeam = async () => {
    try {
      setIsAssigning(true);
      const res = await fetch(`/api/incidents/${id}/unassign`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unassign");
      }

      showToast("Response unit recalled and incident unassigned");
      await fetchIncident();
      await fetchCandidates();
    } catch (err: any) {
      showToast(err.message || "Failed to unassign unit", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  // Status Stepper Change
  const handleStatusTransition = async (newStatus: string) => {
    if (!incident || incident.status === newStatus) return;

    if (newStatus === "IN_PROGRESS" && !incident.assignedTeamId) {
      showToast("Cannot move to In Progress without an assigned team. Please assign a team first.", "error");
      return;
    }

    try {
      setIsUpdatingStatus(true);
      const res = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      const updated = await res.json();
      setIncident((prev) => (prev ? { ...prev, status: updated.status } : null));
      showToast(`Status updated to ${newStatus.replace("_", " ")}`);
      await fetchIncident();
    } catch (err: any) {
      showToast(err.message || "Failed to update incident status", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/incidents/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete incident");
      }

      showToast("Incident deleted successfully and assigned team released");
      router.push("/admin");
    } catch (err: any) {
      showToast(err.message || "Failed to delete incident", "error");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center bg-cream min-h-screen">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate/40 border-t-burgundy mb-4" />
        <p className="text-sm font-bold text-navy">Loading emergency dossier & response dispatch...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center bg-cream">
        <div className="h-16 w-16 rounded-2xl bg-burgundy/10 text-burgundy flex items-center justify-center mx-auto mb-4 border border-burgundy/20">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black text-navy">Incident Not Found</h2>
        <p className="mt-2 text-sm text-navy/70 font-medium">
          The requested emergency report does not exist or may have been deleted.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-cream hover:bg-navy-light transition shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const isCritical = incident.severity === "CRITICAL";
  const hasCoordinates =
    typeof incident.latitude === "number" &&
    typeof incident.longitude === "number";

  const prio = incident.priority;

  // Determine current step index in status stepper
  const currentStepIndex = STATUS_STEPS.findIndex(
    (s) => s.value === incident.status
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-cream min-h-screen">
      {/* Toast */}
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

      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-bold text-navy/80 hover:text-navy bg-cardBg px-3.5 py-2 rounded-xl border border-slate/40 hover:bg-cream transition shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-burgundy/30 bg-burgundy/10 px-3 py-2 text-xs font-bold text-burgundy hover:bg-burgundy hover:text-cream transition shadow-2xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Incident</span>
          </button>
        </div>
      </div>

      {/* Visual Status Stepper */}
      <div className="bg-cardBg rounded-2xl border border-slate/40 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-black uppercase tracking-wider text-slate-dark">
            Operational Lifecycle Tracking
          </span>
          <StatusBadge status={incident.status} size="sm" />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = currentStepIndex > idx;
            const isCurrent = currentStepIndex === idx;
            const isAvailableForClick =
              step.value !== "ASSIGNED" && // assigned is done via assign action
              (step.value !== "IN_PROGRESS" || !!incident.assignedTeamId);

            return (
              <button
                key={step.value}
                type="button"
                disabled={!isAvailableForClick || isUpdatingStatus}
                onClick={() => handleStatusTransition(step.value)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  isCurrent
                    ? "bg-navy text-cream border-navy shadow-sm ring-2 ring-burgundy/40"
                    : isCompleted
                    ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                    : isAvailableForClick
                    ? "bg-cream text-navy/80 border-slate/40 hover:border-navy hover:bg-cream/90 cursor-pointer"
                    : "bg-slate-100/60 text-slate/60 border-slate-200 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <span className="text-xs font-mono font-black opacity-70">
                      0{idx + 1}
                    </span>
                  )}
                  <span className="text-xs font-black">{step.label}</span>
                </div>
                <span className="text-[10px] opacity-80 font-medium">
                  {step.value === "REPORTED"
                    ? "Intake"
                    : step.value === "ASSIGNED"
                    ? "Unit Dispatched"
                    : step.value === "IN_PROGRESS"
                    ? "Active on site"
                    : "Resolved"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Dossier / Right Assignment & Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Incident Dossier */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Dossier Card */}
          <div className="bg-cardBg rounded-2xl border border-slate/40 p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CategoryIcon category={incident.category} size="md" />
                  <span className="text-xs font-extrabold text-navy/80 tracking-wide uppercase">
                    {formatCategoryName(incident.category)}
                  </span>
                  <SeverityBadge severity={incident.severity} size="sm" />
                  {prio && (
                    <PriorityBadge
                      level={prio.level}
                      score={prio.score}
                      showScore={true}
                      size="sm"
                    />
                  )}
                </div>
                <h1 className="text-2xl font-black text-navy">{incident.title}</h1>
                <p className="text-xs text-slate-dark mt-1 font-semibold">
                  Report ID: <span className="font-mono text-navy">{incident.id}</span>
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-xl bg-cream border border-slate/30">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-dark mb-1.5">
                Incident Description & Field Notes
              </h3>
              <p className="text-sm font-medium text-navy leading-relaxed whitespace-pre-wrap">
                {incident.description}
              </p>
            </div>

            {/* Tags */}
            {incident.tags && incident.tags.length > 0 && (
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-dark mb-2 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-slate" />
                  <span>Reported Hazards / Tags</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {incident.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs font-bold text-navy bg-cream px-3 py-1 rounded-lg border border-slate/40"
                    >
                      <span>•</span>
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Core Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate/30">
              {/* Location Details */}
              <div className="p-3.5 rounded-xl bg-cream border border-slate/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-dark flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-burgundy" />
                    <span>Location</span>
                  </span>
                  {hasCoordinates && (
                    <a
                      href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-burgundy hover:underline"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="text-sm font-bold text-navy">{incident.location}</p>
                {hasCoordinates ? (
                  <p className="text-[11px] font-mono font-semibold text-slate-dark mt-1">
                    GPS: {incident.latitude?.toFixed(6)}, {incident.longitude?.toFixed(6)}
                  </p>
                ) : (
                  <p className="text-[11px] font-bold text-amber-700 mt-1">
                    ⚠ GPS coordinates missing
                  </p>
                )}
              </div>

              {/* People & Contact */}
              <div className="p-3.5 rounded-xl bg-cream border border-slate/30 space-y-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-dark flex items-center gap-1 mb-0.5">
                    <Users className="h-3.5 w-3.5 text-slate" />
                    <span>People Affected</span>
                  </span>
                  <p className="text-sm font-black text-navy">
                    {incident.peopleAffected} {incident.peopleAffected === 1 ? "person" : "people"}
                  </p>
                </div>

                {incident.contactInfo && (
                  <div className="pt-2 border-t border-slate/30">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-dark flex items-center gap-1 mb-0.5">
                      <Phone className="h-3.5 w-3.5 text-slate" />
                      <span>Contact Info</span>
                    </span>
                    <a
                      href={`tel:${incident.contactInfo}`}
                      className="text-xs font-bold text-burgundy hover:underline"
                    >
                      {incident.contactInfo}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Photo Preview if attached */}
            {incident.photo && (
              <div className="pt-4 border-t border-slate/30">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-dark mb-2 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-slate" />
                  <span>Scene Photo Evidence</span>
                </h4>
                <div className="max-w-md rounded-xl overflow-hidden border border-slate/40 shadow-sm">
                  <img
                    src={incident.photo}
                    alt="Scene evidence"
                    className="w-full h-auto object-cover max-h-72"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Interactive Geospatial Route Map */}
          <IncidentDetailMap
            incident={incident}
            assignedTeam={incident.assignedTeam}
            candidateTeams={candidates}
          />
        </div>

        {/* Right Column (1 Col): Response Team Assignment & Priority Engine */}
        <div className="space-y-6">
          {/* ASSIGNED UNIT CARD (If unit assigned) */}
          {incident.assignedTeam ? (
            <div className="bg-cardBg rounded-2xl border-2 border-burgundy/40 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-burgundy text-cream flex items-center justify-center shadow-xs">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-navy">Assigned Response Team</h3>
                    <span className="text-[10px] text-slate-dark font-semibold">
                      Active Operational Dispatch
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-cream bg-burgundy px-2.5 py-0.5 rounded-md">
                  {incident.assignedTeam.code}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-cream border border-slate/30 space-y-2">
                <p className="text-sm font-extrabold text-navy">
                  {incident.assignedTeam.name}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-dark font-bold uppercase block">
                      Category
                    </span>
                    <span className="font-bold text-navy">
                      {incident.assignedTeam.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-dark font-bold uppercase block">
                      Dispatched
                    </span>
                    <span className="font-bold text-navy">
                      {formatDate(incident.assignedAt)}
                    </span>
                  </div>
                  {incident.distanceKm !== null && (
                    <div>
                      <span className="text-[10px] text-slate-dark font-bold uppercase block">
                        Distance
                      </span>
                      <span className="font-extrabold text-navy">
                        {incident.distanceKm} km
                      </span>
                    </div>
                  )}
                  {incident.etaMinutes !== null && (
                    <div>
                      <span className="text-[10px] text-slate-dark font-bold uppercase block">
                        Est. Arrival
                      </span>
                      <span className="font-black text-emerald-700">
                        ~{incident.etaMinutes} min
                      </span>
                    </div>
                  )}
                </div>

                {incident.assignedTeam.address && (
                  <p className="text-[11px] text-navy/70 pt-1 border-t border-slate/30 font-medium">
                    Base: {incident.assignedTeam.address}
                  </p>
                )}
              </div>

              {incident.status !== "RESOLVED" && (
                <button
                  type="button"
                  onClick={handleUnassignTeam}
                  disabled={isAssigning}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate/40 text-xs font-bold text-navy bg-cream hover:bg-slate-200 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-burgundy" />
                  <span>Recall / Unassign Team</span>
                </button>
              )}
            </div>
          ) : (
            /* ASSIGN RESPONSE TEAM CARD (If unassigned) */
            <div className="bg-cardBg rounded-2xl border border-slate/40 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-burgundy/10 text-burgundy flex items-center justify-center border border-burgundy/20">
                    <Navigation className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-navy">Assign Response Team</h3>
                    <p className="text-[10px] text-navy/70 font-medium">
                      GPS proximity & suitability dispatch
                    </p>
                  </div>
                </div>
              </div>

              {/* Location Missing Warning */}
              {!hasCoordinates ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold space-y-1">
                  <p className="font-black">Location missing</p>
                  <p className="font-medium text-amber-800">
                    Cannot calculate nearest team distance without GPS coordinates. Add coordinates or select a team manually below.
                  </p>
                </div>
              ) : (
                /* Auto-Assign Button */
                <button
                  type="button"
                  disabled={isAssigning || candidates.length === 0}
                  onClick={() => handleAssignTeam()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-burgundy text-cream text-xs font-black hover:bg-burgundy-light active:bg-burgundy-hover transition shadow-sm disabled:opacity-50"
                >
                  <Zap className="h-4 w-4 text-cream" />
                  <span>
                    {isAssigning ? "Dispatching Unit..." : "Auto-Assign Nearest Team"}
                  </span>
                </button>
              )}

              {/* Ranked Candidate List */}
              <div className="space-y-2 pt-2 border-t border-slate/30">
                <span className="text-xs font-black uppercase tracking-wider text-slate-dark block">
                  Candidate Units (Top Ranked)
                </span>

                {isLoadingCandidates ? (
                  <div className="py-6 text-center text-xs text-navy/70 font-bold">
                    Calculating candidate fit scores...
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="p-4 rounded-xl bg-cream border border-slate/30 text-center text-xs text-navy/80 font-bold">
                    {candidatesError === "Location missing"
                      ? "Location missing"
                      : "No available team. Incident stays in the priority queue."}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {candidates.map((c, idx) => (
                      <div
                        key={c.team.id}
                        className="p-3 rounded-xl bg-cream border border-slate/30 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-black text-navy bg-cardBg px-1.5 py-0.5 rounded border border-slate/40">
                              {c.team.code}
                            </span>
                            <span className="text-xs font-bold text-navy truncate">
                              {c.team.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-dark font-semibold">
                            <span>{c.team.category}</span>
                            <span>•</span>
                            <span className="text-navy">{c.distanceKm} km</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              ~{c.etaMinutes} min ETA
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isAssigning}
                          onClick={() => handleAssignTeam(c.team.id)}
                          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-navy text-cream text-[11px] font-extrabold hover:bg-navy-light transition disabled:opacity-50"
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRIORITY REASONS CARD */}
          {prio && (
            <div className="bg-cardBg rounded-2xl border border-slate/40 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-navy">Priority Score Breakdown</h3>
                <PriorityBadge
                  level={prio.level}
                  score={prio.score}
                  showScore={true}
                  size="sm"
                />
              </div>

              <div className="space-y-2 pt-1">
                {prio.reasons.map((reason, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs font-semibold text-navy bg-cream px-3 py-1.5 rounded-lg border border-slate/30"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-burgundy shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-navy/70 pt-1 font-medium leading-normal">
                Computed dynamically at read time. Unresolved incidents gain +1 waiting point every 5 minutes (max 15).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Permanently Delete Emergency Report"
        message={`Are you sure you want to permanently delete this report? Any assigned response team will immediately be released back to AVAILABLE status.`}
        confirmText="Yes, Delete Report"
        cancelText="Cancel"
        isDanger={true}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
