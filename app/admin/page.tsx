"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  LayoutDashboard,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { CategoryChart } from "@/components/CategoryChart";
import { IncidentTable, IncidentItem } from "@/components/IncidentTable";

interface DashboardStats {
  total: number;
  critical: number;
  pending: number;
  resolved: number;
  byCategory: { category: string; name: string; count: number }[];
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

  // Status Change Handler
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

      // Update in local state
      setIncidents((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus as any } : item))
      );

      // Refresh stats
      const statsRes = await fetch("/api/stats");
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      showToast(`Incident status updated to ${newStatus.replace("_", " ")}`);
    } catch (error: any) {
      showToast(error.message || "Failed to update status", "error");
    }
  };

  // Delete Handler
  const handleDeleteIncident = async (id: string) => {
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete incident");
      }

      // Remove from local state
      setIncidents((prev) => prev.filter((item) => item.id !== id));

      // Refresh stats
      const statsRes = await fetch("/api/stats");
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      showToast("Incident report deleted successfully");
    } catch (error: any) {
      showToast(error.message || "Failed to delete incident", "error");
    }
  };

  // Filtered incidents
  const filteredIncidents = incidents.filter((incident) => {
    if (categoryFilter !== "ALL" && incident.category !== categoryFilter) return false;
    if (severityFilter !== "ALL" && incident.severity !== severityFilter) return false;
    if (statusFilter !== "ALL" && incident.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-xl transition-all border ${
            toast.type === "success"
              ? "bg-slate-900 text-white border-slate-700"
              : "bg-red-600 text-white border-red-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-white shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Emergency Command Center
            </h1>
            <span className="rounded-full bg-red-100 text-red-700 font-bold text-xs px-2.5 py-0.5 border border-red-200">
              LIVE MONITORING
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time incident dispatch, severity distribution, and situation management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 shadow-sm transition disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/report"
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 active:bg-red-800 shadow-sm shadow-red-600/30 transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Report Incident</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Reported Incidents"
          value={stats?.total ?? (isLoading ? "..." : 0)}
          subtitle="Cumulative incidents on record"
          icon={LayoutDashboard}
          variant="default"
        />
        <StatCard
          title="Critical Incidents"
          value={stats?.critical ?? (isLoading ? "..." : 0)}
          subtitle="Immediate dispatch required"
          icon={ShieldAlert}
          variant="critical"
        />
        <StatCard
          title="Pending Incidents"
          value={stats?.pending ?? (isLoading ? "..." : 0)}
          subtitle="Awaiting first responder action"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Resolved Incidents"
          value={stats?.resolved ?? (isLoading ? "..." : 0)}
          subtitle="Cleared from active emergency log"
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Category Chart Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Incidents by Category
            </h2>
            <p className="text-xs text-slate-500">
              Breakdown of emergency types reported across the platform
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            <span>Live Distribution</span>
          </div>
        </div>

        <div className="pt-4">
          <CategoryChart data={stats?.byCategory || []} />
        </div>
      </div>

      {/* Incident Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>Reported Incidents</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {filteredIncidents.length} of {incidents.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Prioritized by severity (critical emergencies pinned) &bull; Newest first
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-semibold text-slate-600">Filter:</span>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-red-500 shadow-sm cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="FIRE">Fire Emergency</option>
              <option value="ROAD_ACCIDENT">Road Accident</option>
              <option value="MEDICAL">Medical Emergency</option>
              <option value="FLOOD">Flood</option>
              <option value="BUILDING_COLLAPSE">Building Collapse</option>
              <option value="OTHER">Other Emergencies</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-red-500 shadow-sm cursor-pointer"
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
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-red-500 shadow-sm cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            {(categoryFilter !== "ALL" || severityFilter !== "ALL" || statusFilter !== "ALL") && (
              <button
                onClick={() => {
                  setCategoryFilter("ALL");
                  setSeverityFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="text-red-600 hover:text-red-700 font-semibold px-2 py-1 underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Incident Table */}
        <IncidentTable
          incidents={filteredIncidents}
          isLoading={isLoading}
          onStatusChange={handleStatusChange}
          onDeleteIncident={handleDeleteIncident}
        />
      </div>
    </div>
  );
}
