"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MapPin,
  RefreshCw,
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Users,
  Shield,
} from "lucide-react";
import { MapIncident, MapTeam } from "@/components/LiveMap";

// Load LiveMap dynamically without SSR to prevent "window is not defined"
const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100vh-12rem)] min-h-[500px] rounded-2xl border border-slate/40 bg-cardBg flex flex-col items-center justify-center p-8">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate/40 border-t-burgundy mb-4" />
      <p className="text-sm font-bold text-navy">
        Initializing interactive geospatial map...
      </p>
    </div>
  ),
});

export default function LiveMapPage() {
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [teams, setTeams] = useState<MapTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Toggles
  const [showIncidents, setShowIncidents] = useState(true);
  const [showTeams, setShowTeams] = useState(true);
  const [unresolvedOnly, setUnresolvedOnly] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [incRes, teamRes] = await Promise.all([
        fetch("/api/incidents"),
        fetch("/api/teams"),
      ]);

      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData);
      }
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeams(teamData);
      }
    } catch (err) {
      console.error("Failed to load map data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Count incidents missing coordinates
  const missingCoordsCount = incidents.filter(
    (i) => i.latitude === null || i.longitude === null
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 bg-cream min-h-screen">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-dark">
              Geospatial Operations &amp; Dispatch Routing
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight mt-0.5">
            Live Emergency Command Map
          </h1>
          <p className="text-xs sm:text-sm text-navy/70 font-medium mt-0.5">
            Real-time incident pins, response unit staging, and active dispatch vectors.
          </p>
        </div>

        {/* Toggles & Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-cardBg border border-slate/40 px-3 py-1.5 rounded-xl shadow-2xs text-xs font-bold text-navy">
            {/* Show Incidents Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showIncidents}
                onChange={(e) => setShowIncidents(e.target.checked)}
                className="rounded border-slate text-burgundy focus:ring-burgundy"
              />
              <span>Incidents</span>
            </label>

            <span className="text-slate/40">|</span>

            {/* Show Teams Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showTeams}
                onChange={(e) => setShowTeams(e.target.checked)}
                className="rounded border-slate text-burgundy focus:ring-burgundy"
              />
              <span>Teams</span>
            </label>

            <span className="text-slate/40">|</span>

            {/* Unresolved Only Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={unresolvedOnly}
                onChange={(e) => setUnresolvedOnly(e.target.checked)}
                className="rounded border-slate text-burgundy focus:ring-burgundy"
              />
              <span>Unresolved Only</span>
            </label>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate/40 bg-cardBg text-navy hover:bg-cream transition shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Note for Incidents without GPS Coordinates */}
      {missingCoordsCount > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            <span>
              Note: {missingCoordsCount} incident(s) lack GPS coordinates and are excluded from the map view.
            </span>
          </div>
          <Link
            href="/admin"
            className="text-burgundy hover:underline text-xs font-black underline shrink-0"
          >
            View in Dashboard Table
          </Link>
        </div>
      )}

      {/* Full-width Map Container */}
      <LiveMap
        incidents={incidents}
        teams={teams}
        showIncidents={showIncidents}
        showTeams={showTeams}
        unresolvedOnly={unresolvedOnly}
      />
    </div>
  );
}

