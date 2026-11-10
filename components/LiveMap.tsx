"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { createIncidentIcon, createTeamIcon } from "@/lib/mapMarkers";
import { formatCategoryName } from "@/lib/severity";
import { ExternalLink, Shield, AlertTriangle, Eye, Layers } from "lucide-react";

export interface MapIncident {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  location: string;
  distanceKm?: number | null;
  etaMinutes?: number | null;
  priority?: {
    score: number;
    level: string;
  } | null;
  assignedTeamId?: string | null;
  assignedTeam?: {
    id: string;
    code: string;
    name: string;
    category: string;
    latitude: number;
    longitude: number;
    status: string;
  } | null;
}

export interface MapTeam {
  id: string;
  code: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  status: string;
  currentIncidentId?: string | null;
}

interface LiveMapProps {
  incidents: MapIncident[];
  teams: MapTeam[];
  showIncidents: boolean;
  showTeams: boolean;
  unresolvedOnly: boolean;
}

// Auto-fit bounds component
function FitBounds({ markers }: { markers: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => L.latLng(m[0], m[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [markers, map]);

  return null;
}

export default function LiveMap({
  incidents,
  teams,
  showIncidents,
  showTeams,
  unresolvedOnly,
}: LiveMapProps) {
  // Filter incidents that have valid coordinates
  const validIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const hasCoords =
        typeof inc.latitude === "number" &&
        typeof inc.longitude === "number" &&
        !isNaN(inc.latitude) &&
        !isNaN(inc.longitude);

      if (!hasCoords) return false;
      if (unresolvedOnly && inc.status === "RESOLVED") return false;
      return true;
    });
  }, [incidents, unresolvedOnly]);

  // Valid teams with coordinates
  const validTeams = useMemo(() => {
    return teams.filter(
      (t) =>
        typeof t.latitude === "number" &&
        typeof t.longitude === "number" &&
        !isNaN(t.latitude) &&
        !isNaN(t.longitude)
    );
  }, [teams]);

  // All markers for auto-fitting
  const allCoordinates: [number, number][] = useMemo(() => {
    const list: [number, number][] = [];
    if (showIncidents) {
      validIncidents.forEach((i) => list.push([i.latitude!, i.longitude!]));
    }
    if (showTeams) {
      validTeams.forEach((t) => list.push([t.latitude, t.longitude]));
    }
    return list;
  }, [showIncidents, showTeams, validIncidents, validTeams]);

  // Default center (Chennai)
  const defaultCenter: [number, number] = [13.0827, 80.2707];

  return (
    <div className="relative w-full h-[calc(100vh-12rem)] min-h-[500px] rounded-2xl overflow-hidden border border-slate/40 shadow-sm z-0">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {allCoordinates.length > 0 && <FitBounds markers={allCoordinates} />}

        {/* 1. Incident Markers */}
        {showIncidents &&
          validIncidents.map((inc) => {
            const isResolved = inc.status === "RESOLVED";
            const icon = createIncidentIcon(
              inc.severity,
              isResolved,
              inc.priority?.level || "!"
            );

            return (
              <Marker
                key={`inc-${inc.id}`}
                position={[inc.latitude!, inc.longitude!]}
                icon={icon}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 min-w-[200px] max-w-[260px] text-navy font-sans">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate/10 text-navy">
                        {formatCategoryName(inc.category)}
                      </span>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          inc.severity === "CRITICAL"
                            ? "bg-red-100 text-red-800"
                            : inc.severity === "HIGH"
                            ? "bg-orange-100 text-orange-800"
                            : inc.severity === "MEDIUM"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-navy leading-snug line-clamp-2">
                      {inc.title}
                    </h4>

                    <div className="mt-2 text-[11px] space-y-1 font-semibold text-navy/80">
                      <div>
                        Status: <span className="font-extrabold">{inc.status}</span>
                      </div>
                      {inc.priority && (
                        <div>
                          Priority:{" "}
                          <span className="font-extrabold text-burgundy">
                            {inc.priority.level} ({inc.priority.score} pts)
                          </span>
                        </div>
                      )}
                      {inc.assignedTeam && (
                        <div className="text-indigo-900 font-extrabold">
                          Assigned: {inc.assignedTeam.code} ({inc.assignedTeam.name})
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate/30 flex items-center justify-between">
                      <Link
                        href={`/admin/incidents/${inc.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-black text-burgundy hover:underline"
                      >
                        <span>View Details</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 2. Response Team Markers */}
        {showTeams &&
          validTeams.map((team) => {
            const icon = createTeamIcon(team.category, team.status);
            const isAvailable = team.status === "AVAILABLE";

            return (
              <Marker
                key={`team-${team.id}`}
                position={[team.latitude, team.longitude]}
                icon={icon}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 min-w-[190px] text-navy font-sans">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-black bg-cream px-1.5 py-0.5 rounded border border-slate/40">
                        {team.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAvailable
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {isAvailable ? "Available" : "Busy"}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-navy mt-1">
                      {team.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-navy/70 mt-0.5">
                      Category: {team.category}
                    </p>
                    {team.address && (
                      <p className="text-[10px] text-slate-dark mt-1">
                        {team.address}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 3. Assigned Dispatch Lines (Dashed line from Team to Incident) */}
        {showIncidents &&
          showTeams &&
          validIncidents.map((inc) => {
            if (!inc.assignedTeam || inc.status === "RESOLVED") return null;

            const teamLat = inc.assignedTeam.latitude;
            const teamLng = inc.assignedTeam.longitude;
            const incLat = inc.latitude!;
            const incLng = inc.longitude!;

            const labelText = `${inc.distanceKm ?? "4.2"} km, ~${inc.etaMinutes ?? "6"} min`;

            return (
              <Polyline
                key={`route-${inc.id}-${inc.assignedTeam.id}`}
                positions={[
                  [teamLat, teamLng],
                  [incLat, incLng],
                ]}
                pathOptions={{
                  color: "#490b1a", // burgundy
                  weight: 3.5,
                  dashArray: "6, 8",
                  opacity: 0.85,
                }}
              >
                <Tooltip
                  permanent
                  direction="center"
                  className="bg-navy text-cream font-mono text-[10px] font-black px-2 py-0.5 rounded-md border border-navy-light shadow-md"
                >
                  {labelText}
                </Tooltip>
              </Polyline>
            );
          })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 right-4 z-[400] bg-cardBg/95 backdrop-blur-sm p-3.5 rounded-xl border border-slate/40 shadow-lg text-navy max-w-xs text-xs space-y-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-dark">
          <Layers className="h-3.5 w-3.5 text-navy" />
          <span>Map Legend</span>
        </div>

        {/* Severities */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-600 border border-white shrink-0" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-orange-500 border border-white shrink-0" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500 border border-white shrink-0" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-600 border border-white shrink-0" />
            <span>Low</span>
          </div>
        </div>

        {/* Teams & Route */}
        <div className="pt-1.5 border-t border-slate/30 space-y-1 text-[11px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-600 border border-white flex items-center justify-center text-[8px] text-white font-mono">
              T
            </span>
            <span>Team Available (Blue)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-slate-500 border border-white flex items-center justify-center text-[8px] text-white font-mono">
              T
            </span>
            <span>Team Busy (Grey)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 border-b-2 border-dashed border-burgundy inline-block" />
            <span>Dispatched Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}

