"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCategoryName } from "@/lib/severity";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  ExternalLink,
  Trash2,
  Users,
  MapPin,
  Clock,
  AlertCircle,
  Shield,
  ArrowRight,
} from "lucide-react";

export interface IncidentItem {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
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
    status: string;
  } | null;
  distanceKm?: number | null;
  etaMinutes?: number | null;
  priority?: {
    score: number;
    level: "P1" | "P2" | "P3" | "P4";
    reasons: string[];
    waitingMinutes: number;
  };
  priorityRank?: number | null;
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

  const handleStatusSelect = async (incident: IncidentItem, newStatus: string) => {
    if (incident.status === newStatus) return;
    try {
      setUpdatingId(incident.id);
      await onStatusChange(incident.id, newStatus);
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
        <p className="text-sm text-navy/80 font-bold">Loading emergency incidents & priority queue...</p>
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
        <p className="mt-1 text-sm text-navy/70 max-w-sm">
          Incoming reports will automatically be ranked by priority score and matched with available response units.
        </p>
        <Link
          href="/report"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-burgundy px-4 py-2 text-sm font-bold text-cream hover:bg-burgundy-light transition shadow-sm"
        >
          Submit New Report
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate/40 bg-cardBg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy text-cream text-[11px] font-black uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-3 py-3.5 w-16 text-center">
                  Rank / Pri
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Incident & Location
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Category
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Severity
                </th>
                <th scope="col" className="px-3 py-3.5">
                  People
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Assigned Team
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-3 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/30 bg-cardBg">
              {incidents.map((incident) => {
                const isCritical = incident.severity === "CRITICAL";
                const isResolved = incident.status === "RESOLVED";
                const prio = incident.priority;

                return (
                  <tr
                    key={incident.id}
                    className={`transition-colors hover:bg-cream/60 ${
                      isCritical && !isResolved
                        ? "bg-burgundy/[0.04]"
                        : isResolved
                        ? "opacity-75 bg-slate-50/40"
                        : ""
                    }`}
                  >
                    {/* Priority & Rank */}
                    <td className="px-3 py-3 text-center align-middle whitespace-nowrap">
                      {isResolved ? (
                        <span className="text-[11px] font-bold text-slate/70">
                          Done
                        </span>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          {incident.priorityRank && (
                            <span className="text-xs font-black text-navy font-mono">
                              #{incident.priorityRank}
                            </span>
                          )}
                          {prio && (
                            <PriorityBadge
                              level={prio.level}
                              score={prio.score}
                              showScore={true}
                              size="sm"
                            />
                          )}
                          {prio && (
                            <span className="text-[10px] text-navy/70 font-semibold">
                              {prio.waitingMinutes}m wait
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Title & Location */}
                    <td className="px-4 py-3 align-top min-w-[200px]">
                      <div className="flex items-start gap-1.5">
                        <Link
                          href={`/admin/incidents/${incident.id}`}
                          className="font-bold text-navy hover:text-burgundy hover:underline line-clamp-1 text-sm"
                        >
                          {incident.title}
                        </Link>
                      </div>
                      <p className="text-xs text-navy/70 line-clamp-1 mt-0.5 font-medium">
                        {incident.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-dark">
                        <span className="flex items-center gap-1 font-semibold text-navy/70">
                          <MapPin className="h-3 w-3 text-burgundy shrink-0" />
                          <span className="truncate max-w-[150px]">{incident.location}</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatDate(incident.createdAt)}</span>
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CategoryIcon category={incident.category} size="sm" />
                        <span className="text-xs font-bold text-navy">
                          {formatCategoryName(incident.category)}
                        </span>
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="px-3 py-3 align-middle whitespace-nowrap">
                      <SeverityBadge severity={incident.severity} size="sm" />
                    </td>

                    {/* People */}
                    <td className="px-3 py-3 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs font-bold text-navy">
                        <Users className="h-3.5 w-3.5 text-slate" />
                        <span>{incident.peopleAffected}</span>
                      </div>
                    </td>

                    {/* Assigned Team */}
                    <td className="px-3 py-3 align-middle whitespace-nowrap">
                      {incident.assignedTeam ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 text-xs font-black text-navy bg-cream px-2 py-0.5 rounded-md border border-slate/40">
                            <Shield className="h-3 w-3 text-burgundy" />
                            <span>{incident.assignedTeam.code}</span>
                          </span>
                          <span className="text-[10px] text-navy/70 font-semibold truncate max-w-[110px]">
                            {incident.assignedTeam.name}
                          </span>
                          {incident.etaMinutes && (
                            <span className="text-[10px] text-emerald-700 font-bold">
                              ETA ~{incident.etaMinutes}m ({incident.distanceKm}km)
                            </span>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={`/admin/incidents/${incident.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-burgundy hover:underline bg-burgundy/10 px-2 py-0.5 rounded-md border border-burgundy/20"
                        >
                          <span>Assign</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </td>

                    {/* Status Select */}
                    <td className="px-3 py-3 align-middle whitespace-nowrap">
                      <div className="relative inline-block text-left">
                        <select
                          value={incident.status}
                          disabled={updatingId === incident.id}
                          onChange={(e) => handleStatusSelect(incident, e.target.value)}
                          className="text-xs font-bold rounded-lg border border-slate/40 bg-cream/90 text-navy py-1 pl-2 pr-6 focus:border-burgundy focus:outline-none focus:ring-1 focus:ring-burgundy disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          <option value="REPORTED">Reported</option>
                          <option value="PENDING">Pending</option>
                          <option value="ASSIGNED" disabled>
                            Assigned (via unit)
                          </option>
                          <option
                            value="IN_PROGRESS"
                            disabled={!incident.assignedTeamId}
                          >
                            In Progress {!incident.assignedTeamId ? "(Team req.)" : ""}
                          </option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 align-middle text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/incidents/${incident.id}`}
                          className="p-1.5 rounded-lg text-slate-dark hover:text-navy hover:bg-cream border border-transparent hover:border-slate/40 transition"
                          title="View Dossier & Assign Team"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setSelectedDeleteId(incident.id)}
                          className="p-1.5 rounded-lg text-slate-dark hover:text-burgundy hover:bg-burgundy/10 border border-transparent hover:border-burgundy/20 transition"
                          title="Delete Incident"
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
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!selectedDeleteId}
        title="Delete Emergency Report"
        message={`Are you sure you want to permanently delete report "${selectedIncident?.title || ""}"? If a response team is currently assigned, it will automatically be released.`}
        confirmText="Yes, Delete Report"
        cancelText="Cancel"
        isDanger={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setSelectedDeleteId(null)}
      />
    </>
  );
}
