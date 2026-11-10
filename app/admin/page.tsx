"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  X,
  Users,
  Shield,
  Zap,
  ArrowRight,
  Flame,
  Activity,
  AlertCircle,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { CategoryChart } from "@/components/CategoryChart";
import { StatusChart } from "@/components/StatusChart";
import { IncidentTable, IncidentItem } from "@/components/IncidentTable";
import { PriorityBadge } from "@/components/PriorityBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatCategoryName } from "@/lib/severity";

interface DashboardStats {
  total: number;
  critical: number;
  pending: number;
  resolved: number;
  resolvedIncidents?: number;
  availableTeams: number;
  busyTeams: number;
  assignedIncidents: number;
  byCategory: { category: string; name: string; count: number }[];
  byStatus: { status: string; name: string; count: number }[];
}

export default function AdminDashboardPage() {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [incidentsRes, statsRes] = await Promise.all([
        fetch("/api/incidents"),
        fetch("/api/stats"),
      ]);

      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json();
        setIncidents(incidentsData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
      showToast("Failed to load dashboard data. Please refresh.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Status Change Handler with rule feedback
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update incident status");
      }

      const updated = await res.json();

      setIncidents((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: updated.status,
                assignedTeamId: updated.assignedTeamId,
                assignedTeam: updated.assignedTeam,
              }
            : item
        )
      );

      const statsRes = await fetch("/api/stats");
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      showToast(`Incident status updated to ${newStatus.replace("_", " ")}`);
    } catch (error: any) {
      showToast(error.message || "Failed to update status", "error");
    }
  };

  // Delete Incident Handler
  const handleDeleteIncident = async (id: string) => {
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete incident");
      }

      setIncidents((prev) => prev.filter((item) => item.id !== id));

      const statsRes = await fetch("/api/stats");
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      showToast("Incident report permanently deleted");
    } catch (error: any) {
      showToast(error.message || "Failed to delete incident", "error");
    }
  };

  // Filtered incidents
  const filteredIncidents = incidents.filter((incident) => {
    if (categoryFilter !== "ALL" && incident.category !== categoryFilter) {
      return false;
    }
    if (severityFilter !== "ALL" && incident.severity !== severityFilter) {
      return false;
    }
    if (statusFilter !== "ALL" && incident.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Priority Queue: Top 5 unresolved and unassigned incidents
  const priorityQueue = incidents
    .filter(
      (inc) =>
        inc.status !== "RESOLVED" &&
        (!inc.assignedTeamId || inc.status === "REPORTED" || inc.status === "PENDING")
    )
    .sort((a, b) => (b.priority?.score || 0) - (a.priority?.score || 0))
    .slice(0, 5);

  const activeFiltersCount =
    (categoryFilter !== "ALL" ? 1 : 0) +
    (severityFilter !== "ALL" ? 1 : 0) +
    (statusFilter !== "ALL" ? 1 : 0);

  const clearFilters = () => {
    setCategoryFilter("ALL");
    setSeverityFilter("ALL");
    setStatusFilter("ALL");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-cream min-h-screen">
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

      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-dark">
              Live Emergency Command Center
            </span>
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight mt-1">
            Incident Monitoring & Response
          </h1>
          <p className="text-sm text-navy/70 mt-1 font-medium">
            Dynamic triage queue, unit tracking, and automated response dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold border border-slate/40 bg-cardBg text-navy hover:bg-cream hover:border-slate transition shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/teams"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border border-navy bg-navy text-cream hover:bg-navy-light transition shadow-sm"
          >
            <Users className="h-4 w-4" />
            <span>Manage Teams</span>
          </Link>

          <Link
            href="/report"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-burgundy text-cream hover:bg-burgundy-light active:bg-burgundy-hover transition shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Report Incident</span>
          </Link>
        </div>
      </div>

      {/* 6 Analytics Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Incidents"
          value={stats?.total ?? 0}
          icon={AlertTriangle}
          variant="default"
        />
        <StatCard
          title="Critical Reports"
          value={stats?.critical ?? 0}
          icon={ShieldAlert}
          variant="critical"
        />
        <StatCard
          title="Available Teams"
          value={stats?.availableTeams ?? 0}
          icon={Shield}
          variant="resolved"
        />
        <StatCard
          title="Busy Teams"
          value={stats?.busyTeams ?? 0}
          icon={Users}
          variant="pending"
        />
        <StatCard
          title="Assigned / Active"
          value={stats?.assignedIncidents ?? 0}
          icon={Clock}
          variant="pending"
        />
        <StatCard
          title="Resolved"
          value={stats?.resolvedIncidents ?? (stats?.resolved ?? 0)}
          icon={CheckCircle2}
          variant="resolved"
        />
      </div>

      {/* Priority Queue Panel: Top 5 unresolved and unassigned incidents */}
      <div className="bg-cardBg rounded-2xl border border-slate/40 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-burgundy/10 text-burgundy flex items-center justify-center border border-burgundy/20">
              <Zap className="h-4 w-4 text-burgundy" />
            </div>
            <div>
              <h2 className="text-base font-black text-navy">Priority Queue (Unassigned Triage)</h2>
              <p className="text-xs text-navy/70 font-medium">
                Top urgent incidents requiring immediate response unit dispatch
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-navy/70 bg-cream px-2.5 py-1 rounded-lg border border-slate/40">
            {priorityQueue.length} Pending Units
          </span>
        </div>

        {priorityQueue.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-cream/60 border border-slate/30">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-navy">All reported incidents are assigned or resolved!</p>
            <p className="text-xs text-navy/70 mt-0.5">No urgent incidents waiting in the queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {priorityQueue.map((item, index) => {
              const prio = item.priority;
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between p-3.5 rounded-xl border border-slate/40 bg-cream/70 hover:border-burgundy/60 transition shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-navy font-mono">
                        #{index + 1}
                      </span>
                      {prio && (
                        <PriorityBadge
                          level={prio.level}
                          score={prio.score}
                          showScore={true}
                          size="sm"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      <CategoryIcon category={item.category} size="sm" />
                      <span className="text-[11px] font-bold text-navy/80 truncate">
                        {formatCategoryName(item.category)}
                      </span>
                    </div>

                    <h3 className="text-xs font-extrabold text-navy line-clamp-2 leading-tight">
                      {item.title}
                    </h3>

                    <p className="text-[10px] text-navy/70 line-clamp-1 mt-1 font-medium">
                      {item.location}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate/30 flex items-center justify-between">
                    <span className="text-[10px] text-slate-dark font-semibold">
                      {prio?.waitingMinutes}m wait
                    </span>
                    <Link
                      href={`/admin/incidents/${item.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-extrabold text-burgundy hover:text-burgundy-light"
                    >
                      <span>Assign</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Analytics Charts (Category Distribution + Incidents by Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart data={stats?.byCategory || []} />
        <StatusChart data={stats?.byStatus || []} />
      </div>

      {/* Incident List Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-navy">All Reported Emergencies</h2>
            <p className="text-xs text-navy/70 font-medium">
              Sorted by operational priority score descending. Resolved incidents placed at bottom.
            </p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-navy mr-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate" />
              <span>Filter:</span>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-bold rounded-xl border border-slate/40 bg-cardBg text-navy px-3 py-1.5 focus:border-burgundy focus:outline-none focus:ring-1 focus:ring-burgundy shadow-2xs"
            >
              <option value="ALL">All Categories</option>
              <option value="FIRE">Fire</option>
              <option value="ROAD_ACCIDENT">Road Accident</option>
              <option value="MEDICAL">Medical</option>
              <option value="FLOOD">Flood</option>
              <option value="BUILDING_COLLAPSE">Building Collapse</option>
              <option value="OTHER">Other</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs font-bold rounded-xl border border-slate/40 bg-cardBg text-navy px-3 py-1.5 focus:border-burgundy focus:outline-none focus:ring-1 focus:ring-burgundy shadow-2xs"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold rounded-xl border border-slate/40 bg-cardBg text-navy px-3 py-1.5 focus:border-burgundy focus:outline-none focus:ring-1 focus:ring-burgundy shadow-2xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-bold text-burgundy hover:text-burgundy-light bg-burgundy/10 px-2.5 py-1.5 rounded-xl border border-burgundy/20 transition"
              >
                <X className="h-3 w-3" />
                <span>Reset ({activeFiltersCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Incidents Table */}
        <IncidentTable
          incidents={filteredIncidents}
          onStatusChange={handleStatusChange}
          onDeleteIncident={handleDeleteIncident}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
