"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { formatCategoryName } from "@/lib/severity";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmModal } from "@/components/ConfirmModal";

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
  status: "REPORTED" | "PENDING" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
  severityScore?: number;
  severityReasons?: string[];
}

const STATUS_OPTIONS = [
  { value: "REPORTED", label: "Reported", desc: "Newly logged incident" },
  { value: "PENDING", label: "Pending", desc: "Under initial assessment" },
  { value: "IN_PROGRESS", label: "In Progress", desc: "Responders dispatched / active" },
  { value: "RESOLVED", label: "Resolved", desc: "Hazard neutralized / all clear" },
];

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!id) return;
    async function fetchIncident() {
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
    }
    fetchIncident();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!incident || incident.status === newStatus) return;
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
      showToast(`Status updated immediately to ${newStatus.replace("_", " ")}`);
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

      showToast("Incident deleted successfully");
      router.push("/admin");
    } catch (err: any) {
      showToast(err.message || "Failed to delete incident", "error");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center bg-cream">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate/40 border-t-burgundy mb-4" />
        <p className="text-sm font-bold text-navy">Loading incident dossier...</p>
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-cream">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 shadow-xl transition-all border ${
            toast.type === "success"
              ? "bg-navy text-cream border-slate/40"
              : "bg-burgundy text-cream border-burgundy-light"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-cream shrink-0" />
          )}
          <span className="text-sm font-bold">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-cream/70 hover:text-cream"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-burgundy transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-burgundy/40 bg-burgundy/10 px-3.5 py-2 text-sm font-bold text-burgundy hover:bg-burgundy hover:text-cream transition shadow-sm"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Incident</span>
          </button>
        </div>
      </div>

      {/* Incident Header Card */}
      <div
        className={`rounded-2xl border bg-cardBg p-6 sm:p-8 shadow-sm transition ${
          isCritical
            ? "border-burgundy ring-2 ring-burgundy/20"
            : "border-slate/40"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SeverityBadge severity={incident.severity} size="lg" />
          <StatusBadge status={incident.status} size="lg" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream text-navy text-xs font-bold border border-slate/40">
            <CategoryIcon category={incident.category} className="h-4 w-4" />
            <span>{formatCategoryName(incident.category)}</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
          {incident.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-navy/70 font-medium">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate" />
            Reported: {formatDate(incident.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-slate" />
            Last Updated: {formatDate(incident.updatedAt)}
          </span>
          <span className="font-mono text-slate-dark">ID: {incident.id}</span>
        </div>
      </div>

      {/* Main Grid: Details + Quick Status Switcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Detailed Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Description */}
          <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 shadow-sm">
            <h2 className="text-base font-black text-navy mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-burgundy" />
              <span>Incident Description &amp; Situation Details</span>
            </h2>
            <div className="text-sm text-navy leading-relaxed whitespace-pre-wrap bg-cream/60 rounded-xl p-4 border border-slate/30 font-medium">
              {incident.description}
            </div>
          </div>

          {/* Incident Photo (if present) */}
          {incident.photo && (
            <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 shadow-sm">
              <h2 className="text-base font-black text-navy mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-burgundy" />
                <span>Field Photo Evidence</span>
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate/40 max-w-md bg-cream/40 p-1">
                <img
                  src={incident.photo}
                  alt="Incident Scene"
                  className="w-full h-auto object-cover max-h-72 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Quick Tags Section */}
          {incident.tags && incident.tags.length > 0 && (
            <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 shadow-sm">
              <h2 className="text-base font-black text-navy mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-burgundy" />
                <span>Incident Tags</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {incident.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-navy text-cream border border-navy"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Parameters: Location & Coordinates */}
          <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 shadow-sm">
            <h2 className="text-base font-black text-navy mb-4">
              Location &amp; Coordinates
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Location Text / Address */}
              <div className="rounded-xl border border-slate/30 bg-cream/60 p-4">
                <div className="flex items-center gap-2 text-slate-dark text-xs font-bold uppercase tracking-wider mb-1">
                  <MapPin className="h-4 w-4 text-burgundy" />
                  <span>Reported Location</span>
                </div>
                <p className="text-base font-bold text-navy mt-1">
                  {incident.location}
                </p>
                {incident.address && incident.address !== incident.location && (
                  <p className="text-xs text-navy/70 mt-1 font-medium">
                    Address: {incident.address}
                  </p>
                )}
              </div>

              {/* Coordinates with Google Maps link */}
              <div className="rounded-xl border border-slate/30 bg-cream/60 p-4">
                <div className="flex items-center gap-2 text-slate-dark text-xs font-bold uppercase tracking-wider mb-1">
                  <MapPin className="h-4 w-4 text-navy" />
                  <span>GPS Coordinates</span>
                </div>
                {hasCoordinates ? (
                  <div className="mt-1">
                    <p className="text-sm font-mono font-bold text-navy">
                      {incident.latitude?.toFixed(5)}, {incident.longitude?.toFixed(5)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-burgundy hover:underline transition"
                    >
                      <span>Open in Google Maps</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-slate-dark italic mt-1 font-medium">
                    Coordinates not logged
                  </p>
                )}
              </div>

              {/* People Affected */}
              <div className="rounded-xl border border-slate/30 bg-cream/60 p-4">
                <div className="flex items-center gap-2 text-slate-dark text-xs font-bold uppercase tracking-wider mb-1">
                  <Users className="h-4 w-4 text-navy" />
                  <span>People Affected</span>
                </div>
                <p className="text-base font-bold text-navy mt-1">
                  {incident.peopleAffected}{" "}
                  <span className="text-xs font-medium text-navy/70">
                    {incident.peopleAffected === 1 ? "individual" : "individuals"}
                  </span>
                </p>
              </div>

              {/* Contact Information */}
              <div className="rounded-xl border border-slate/30 bg-cream/60 p-4">
                <div className="flex items-center gap-2 text-slate-dark text-xs font-bold uppercase tracking-wider mb-1">
                  <Phone className="h-4 w-4 text-navy" />
                  <span>Contact Information</span>
                </div>
                <p className="text-sm font-bold text-navy mt-1">
                  {incident.contactInfo ? incident.contactInfo : "Not provided"}
                </p>
              </div>
            </div>
          </div>

          {/* Severity Classification Reasons */}
          <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate/20 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-burgundy" />
                <h2 className="text-base font-black text-navy">
                  Severity Algorithm Triage Reasons
                </h2>
              </div>
              {incident.severityScore !== undefined && (
                <span className="rounded-xl bg-burgundy/10 border border-burgundy/30 px-3 py-1 text-xs font-bold text-burgundy">
                  Score: {incident.severityScore} pts
                </span>
              )}
            </div>

            <p className="text-xs text-navy/70 mb-4 font-medium">
              Pure algorithmic classification breakdown computed from category baseline, casualty scope, keywords, and tags:
            </p>

            <ul className="space-y-2.5">
              {incident.severityReasons && incident.severityReasons.length > 0 ? (
                incident.severityReasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-navy bg-cream/60 p-2.5 rounded-xl border border-slate/30 font-medium"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-burgundy mt-1.5 shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-dark italic font-medium">
                  Standard classification applied ({incident.severity})
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Right Column (1 Col): Status Management */}
        <div className="space-y-6">
          {/* Status Management Box */}
          <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 shadow-sm">
            <h2 className="text-base font-black text-navy mb-1">
              Update Incident Status
            </h2>
            <p className="text-xs text-navy/70 font-medium mb-4">
              Select status to immediately update dispatch log.
            </p>

            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => {
                const isActive = incident.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusChange(opt.value)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      isActive
                        ? "border-burgundy bg-burgundy/10 text-navy font-black shadow-sm"
                        : "border-slate/40 hover:border-navy bg-cardBg text-navy hover:bg-cream"
                    } disabled:opacity-50`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            opt.value === "RESOLVED"
                              ? "bg-emerald-500"
                              : opt.value === "IN_PROGRESS"
                              ? "bg-blue-500"
                              : opt.value === "PENDING"
                              ? "bg-amber-500"
                              : "bg-slate"
                          }`}
                        />
                        <span className="text-sm font-bold">{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-navy/60 font-medium mt-0.5 ml-4.5">
                        {opt.desc}
                      </p>
                    </div>

                    {isActive && (
                      <CheckCircle2 className="h-4 w-4 text-burgundy shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {isUpdatingStatus && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-navy/70 font-bold">
                <div className="h-3 w-3 border-2 border-burgundy border-t-transparent rounded-full animate-spin" />
                <span>Saving status update...</span>
              </div>
            )}
          </div>

          {/* Quick Info Box */}
          <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 shadow-sm">
            <h3 className="text-xs font-black text-navy uppercase tracking-wider mb-3">
              Incident Metadata
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate/20 pb-2">
                <span className="text-navy/70 font-medium">Record ID</span>
                <span className="font-mono text-navy font-bold truncate max-w-[150px]">
                  {incident.id}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate/20 pb-2">
                <span className="text-navy/70 font-medium">Priority Tier</span>
                <span className="font-bold text-navy">
                  {incident.severity}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate/20 pb-2">
                <span className="text-navy/70 font-medium">Current Phase</span>
                <span className="font-bold text-navy">
                  {incident.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Permanently Delete Incident?"
        message={`Are you sure you want to delete "${incident.title}"? This incident record and all associated dispatch logs will be permanently removed.`}
        confirmLabel="Yes, Delete Incident"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
