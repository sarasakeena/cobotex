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

      setIncidents((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus as any } : item))
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

      setIncidents((prev) => prev.filter((item) => item.id !== id));

      const statsRes = await fetch("/api/stats");
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      showToast("Incident report deleted successfully");
    } catch (error: any) {
      showToast(error.message || "Failed to delete incident", "error");
    }
  };

  const filteredIncidents = incidents.filter((incident) => {
    if (categoryFilter !== "ALL" && incident.category !== categoryFilter) return false;
    if (severityFilter !== "ALL" && incident.severity !== severityFilter) return false;
    if (statusFilter !== "ALL" && incident.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-cream">
      {/* Toast Notification */}
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
          <span className="text-sm font-semibold">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-cream/70 hover:text-cream"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
              Emergency Command Center
            </h1>
            <span className="rounded-full bg-burgundy/10 text-burgundy font-bold text-xs px-2.5 py-0.5 border border-burgundy/30">
              LIVE MONITORING
            </span>
          </div>
          <p className="mt-1 text-sm text-navy/70 font-medium">
            Real-time incident dispatch, severity distribution, and situation management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate/40 bg-cardBg px-3.5 py-2 text-sm font-bold text-navy hover:bg-cream transition shadow-sm disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/report"
            className="inline-flex items-center gap-2 rounded-xl bg-burgundy px-4 py-2 text-sm font-bold text-cream hover:bg-burgundy-light active:bg-burgundy-hover shadow-sm transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Report Incident</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Incidents"
          value={stats?.total ?? (isLoading ? "..." : 0)}
          subtitle="Cumulative incidents on record"
          icon={LayoutDashboard}
          variant="default"
        />
        <StatCard
          title="Critical Emergencies"
          value={stats?.critical ?? (isLoading ? "..." : 0)}
          subtitle="Immediate dispatch priority"
          icon={ShieldAlert}
          variant="critical"
        />
        <StatCard
          title="Pending Assessment"
          value={stats?.pending ?? (isLoading ? "..." : 0)}
          subtitle="Awaiting field assignment"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Resolved Cases"
          value={stats?.resolved ?? (isLoading ? "..." : 0)}
          subtitle="Cleared from active incident queue"
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Category Chart Section */}
      <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate/20 gap-2">
          <div>
            <h2 className="text-lg font-black text-navy">
              Incidents by Category
            </h2>
            <p className="text-xs text-navy/70 font-medium">
              Distribution of emergency reports across classifications
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-navy/70 font-bold">
            <span className="inline-block h-2 w-2 rounded-full bg-burgundy" />
            <span>Active Breakdown</span>
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
            <h2 className="text-xl font-black text-navy flex items-center gap-2">
              <span>Reported Incidents</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cream text-navy border border-slate/40">
                {filteredIncidents.length} of {incidents.length}
              </span>
            </h2>
            <p className="text-xs text-navy/70 font-medium">
              Prioritized by severity &bull; Critical incidents pinned with burgundy accent
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-cardBg border border-slate/40 rounded-xl px-2.5 py-1.5 shadow-sm">
              <SlidersHorizontal className="h-3.5 w-3.5 text-navy" />
              <span className="font-bold text-navy">Filter:</span>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-cardBg border border-slate/40 text-navy font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-burgundy shadow-sm cursor-pointer"
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
              className="bg-cardBg border border-slate/40 text-navy font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-burgundy shadow-sm cursor-pointer"
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
              className="bg-cardBg border border-slate/40 text-navy font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-burgundy shadow-sm cursor-pointer"
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
                className="text-burgundy hover:underline font-bold px-2 py-1"
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
