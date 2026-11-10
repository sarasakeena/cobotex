"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCategoryName } from "@/lib/severity";
import { SeverityBadge } from "@/components/SeverityBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  ExternalLink,
  Trash2,
  Users,
  MapPin,
  Clock,
  AlertCircle,
} from "lucide-react";

export interface IncidentItem {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  peopleAffected: number;
  contactInfo?: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "REPORTED" | "PENDING" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
}

interface IncidentTableProps {
  incidents: IncidentItem[];
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  onDeleteIncident: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function IncidentTable({
  incidents,
  onStatusChange,
  onDeleteIncident,
  isLoading = false,
}: IncidentTableProps) {
  const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const selectedIncident = incidents.find((i) => i.id === selectedDeleteId);

  const handleConfirmDelete = async () => {
    if (!selectedDeleteId) return;
    try {
      setIsDeleting(true);
      await onDeleteIncident(selectedDeleteId);
      setSelectedDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusSelect = async (id: string, newStatus: string) => {
    try {
      setUpdatingId(id);
      await onStatusChange(id, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("en-US", {
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
      <div className="flex flex-col items-center justify-center p-16 bg-cardBg rounded-2xl border border-slate/40">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate/40 border-t-burgundy mb-4" />
        <p className="text-sm text-navy/80 font-bold">Loading emergency incidents...</p>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-cardBg rounded-2xl border border-slate/40 text-center">
        <div className="h-16 w-16 rounded-full bg-cream flex items-center justify-center text-slate-dark mb-4 border border-slate/40">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-navy">No incidents reported yet</h3>
        <p className="text-sm text-navy/70 max-w-sm mt-1">
          When reports are submitted from the field, they will immediately appear here for live dispatch and triage.
        </p>
        <Link
          href="/report"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-burgundy px-4 py-2 text-sm font-bold text-cream hover:bg-burgundy-light transition shadow-sm"
        >
          Create First Incident Report
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate/40 bg-cardBg shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            {/* Navy Header Row with Cream Text */}
            <tr className="bg-navy text-cream text-xs font-bold uppercase tracking-wider border-b border-navy-light">
              <th className="py-4 px-4">Severity</th>
              <th className="py-4 px-4">Incident Title</th>
              <th className="py-4 px-4">Category</th>
              <th className="py-4 px-4">Location</th>
              <th className="py-4 px-4 text-center">Affected</th>
              <th className="py-4 px-4">Status</th>
              <th className="py-4 px-4">Reported</th>
              <th className="py-4 px-4 text-right">Actions</th>
            </tr>
          </thead>
          {/* Slate row dividers */}
          <tbody className="divide-y divide-slate/30">
            {incidents.map((incident) => {
              const isCritical = incident.severity === "CRITICAL";
              return (
                <tr
                  key={incident.id}
                  className={`transition-colors hover:bg-cream/60 ${
                    isCritical
                      ? "bg-burgundy/5 hover:bg-burgundy/10 border-l-4 border-l-burgundy"
                      : ""
                  }`}
                >
                  {/* Severity Badge */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <SeverityBadge severity={incident.severity} size="sm" />
                  </td>

                  {/* Title & Preview */}
                  <td className="py-4 px-4 min-w-[220px]">
                    <Link
                      href={`/admin/incidents/${incident.id}`}
                      className="font-bold text-navy hover:text-burgundy transition flex items-center gap-1.5 group"
                    >
                      <span className="line-clamp-1">{incident.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate group-hover:text-burgundy transition shrink-0" />
                    </Link>
                    <p className="text-xs text-navy/70 line-clamp-1 mt-0.5 font-normal">
                      {incident.description}
                    </p>
                  </td>

                  {/* Category */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <CategoryIcon
                        category={incident.category}
                        className="h-4 w-4 shrink-0"
                      />
                      <span className="font-semibold text-navy">
                        {formatCategoryName(incident.category)}
                      </span>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-4 px-4 whitespace-nowrap text-navy font-medium">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-burgundy shrink-0" />
                      <span className="truncate max-w-[150px]">
                        {incident.location}
                      </span>
                    </div>
                  </td>

                  {/* People Affected */}
                  <td className="py-4 px-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold ${
                        incident.peopleAffected >= 10
                          ? "bg-burgundy/15 text-burgundy border border-burgundy/30"
                          : incident.peopleAffected > 0
                          ? "bg-cream text-navy border border-slate/40"
                          : "text-slate-dark"
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      {incident.peopleAffected}
                    </span>
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <select
                        value={incident.status}
                        disabled={updatingId === incident.id}
                        onChange={(e) =>
                          handleStatusSelect(incident.id, e.target.value)
                        }
                        className={`text-xs font-bold rounded-lg border py-1 px-2.5 transition focus:outline-none focus:ring-2 focus:ring-burgundy cursor-pointer ${
                          incident.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : incident.status === "IN_PROGRESS"
                            ? "bg-blue-50 text-blue-800 border-blue-300"
                            : incident.status === "PENDING"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : "bg-slate-100 text-slate-800 border-slate-300"
                        } disabled:opacity-50`}
                      >
                        <option value="REPORTED">Reported</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
                      {updatingId === incident.id && (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-burgundy border-t-transparent animate-spin" />
                      )}
                    </div>
                  </td>

                  {/* Time Reported */}
                  <td className="py-4 px-4 whitespace-nowrap text-xs text-navy/70 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate" />
                      <span>{formatDate(incident.createdAt)}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/incidents/${incident.id}`}
                        className="rounded-lg p-1.5 text-navy hover:text-burgundy hover:bg-cream transition"
                        title="View details"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSelectedDeleteId(incident.id)}
                        className="rounded-lg p-1.5 text-slate-dark hover:text-burgundy hover:bg-burgundy/10 transition"
                        title="Delete incident"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(selectedDeleteId)}
        title="Delete Emergency Incident?"
        message={`Are you sure you want to permanently delete incident "${
          selectedIncident?.title || "selected incident"
        }"? This action cannot be undone.`}
        confirmLabel="Yes, Delete Incident"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setSelectedDeleteId(null)}
      />
    </>
  );
}
