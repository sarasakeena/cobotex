"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import { fetchOsrmRoute, RouteResult } from "@/lib/route";
import { formatCategoryName } from "@/lib/severity";
import { ExternalLink, Navigation, AlertTriangle, Shield, Check } from "lucide-react";

interface IncidentDetailMapProps {
  incident: {
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
  };
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
  candidateTeams?: {
    team: {
      id: string;
      code: string;
      name: string;
      category: string;
      latitude: number;
      longitude: number;
      status: string;
    };
    distanceKm: number;
    etaMinutes: number;
  }[];
}

function FitBounds({ markers }: { markers: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      if (markers.length === 1) {
        map.setView(markers[0], 14);
      } else {
        const bounds = L.latLngBounds(markers.map((m) => L.latLng(m[0], m[1])));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [markers, map]);

  return null;
}

export default function IncidentDetailMap({
  incident,
  assignedTeam,
  candidateTeams = [],
}: IncidentDetailMapProps) {
  const hasIncidentCoords =
    typeof incident.latitude === "number" &&
    typeof incident.longitude === "number" &&
    !isNaN(incident.latitude) &&
    !isNaN(incident.longitude);

  const hasAssignedTeamCoords =
    assignedTeam &&
    typeof assignedTeam.latitude === "number" &&
    typeof assignedTeam.longitude === "number" &&
    !isNaN(assignedTeam.latitude) &&
    !isNaN(assignedTeam.longitude);

  const [osrmRoute, setOsrmRoute] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Top 3 candidate teams if not assigned
  const topCandidates = useMemo(() => {
    return candidateTeams.slice(0, 3);
  }, [candidateTeams]);

  // Primary origin for route (assigned team, or top candidate team if unassigned)
  const routeOrigin = useMemo(() => {
    if (hasAssignedTeamCoords) {
      return {
        lat: assignedTeam!.latitude,
        lng: assignedTeam!.longitude,
        code: assignedTeam!.code,
        name: assignedTeam!.name,
      };
    }
    if (topCandidates.length > 0) {
      return {
        lat: topCandidates[0].team.latitude,
        lng: topCandidates[0].team.longitude,
        code: topCandidates[0].team.code,
        name: topCandidates[0].team.name,
      };
    }
    return null;
  }, [hasAssignedTeamCoords, assignedTeam, topCandidates]);

  // Try fetching OSRM road route
  useEffect(() => {
    if (!hasIncidentCoords || !routeOrigin) {
      setOsrmRoute(null);
      return;
    }

    let isMounted = true;
    setIsLoadingRoute(true);

    fetchOsrmRoute(
      { lat: routeOrigin.lat, lng: routeOrigin.lng },
      { lat: incident.latitude!, lng: incident.longitude! }
    ).then((result) => {
      if (isMounted) {
        setOsrmRoute(result);
        setIsLoadingRoute(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [hasIncidentCoords, routeOrigin, incident.latitude, incident.longitude]);

  // If incident coordinates are missing, gracefully display a note
  if (!hasIncidentCoords) {
    return (
      <div className="w-full p-8 rounded-2xl bg-cardBg border border-slate/40 text-center flex flex-col items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-amber-600 mb-2" />
        <h4 className="text-sm font-black text-navy">Location Missing</h4>
        <p className="text-xs text-navy/70 mt-1 max-w-sm">
          This emergency report was logged without GPS coordinates. Geospatial routing and proximity map cannot be rendered.
        </p>
      </div>
    );
  }

  const incidentLatLng: [number, number] = [
    incident.latitude!,
    incident.longitude!,
  ];

  // All markers to fit
  const markersToFit: [number, number][] = [incidentLatLng];
  if (hasAssignedTeamCoords) {
    markersToFit.push([assignedTeam!.latitude, assignedTeam!.longitude]);
  } else {
    topCandidates.forEach((c) =>
      markersToFit.push([c.team.latitude, c.team.longitude])
    );
  }

  // Google Maps Directions link
  const googleMapsDirectionsUrl = routeOrigin
    ? `https://www.google.com/maps/dir/?api=1&origin=${routeOrigin.lat},${routeOrigin.lng}&destination=${incident.latitude},${incident.longitude}`
    : `https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`;

  // Route display stats
  const displayDistance = osrmRoute
    ? osrmRoute.distanceKm
    : incident.distanceKm ?? (topCandidates[0]?.distanceKm ?? 0);

  const displayEta = osrmRoute
    ? osrmRoute.durationMin
    : incident.etaMinutes ?? (topCandidates[0]?.etaMinutes ?? 0);

  const isRoad = !!osrmRoute?.isRoadRoute;

  return (
    <div className="bg-cardBg rounded-2xl border border-slate/40 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate/30">
        <div>
          <h3 className="text-sm font-black text-navy flex items-center gap-1.5">
            <Navigation className="h-4 w-4 text-burgundy" />
            <span>Response Route &amp; Proximity Map</span>
          </h3>
          <p className="text-[11px] text-navy/70 font-medium">
            {hasAssignedTeamCoords
              ? `Dispatched unit (${assignedTeam!.code}) transit corridor`
              : "Showing incident location and top 3 nearest candidate units"}
          </p>
        </div>

        {/* Google Maps Directions Link */}
        <a
          href={googleMapsDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-cream bg-navy hover:bg-navy-light px-3 py-1.5 rounded-xl transition shadow-2xs self-start sm:self-auto"
        >
          <span>Get directions in Google Maps</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Route Badge Summary */}
      {routeOrigin && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-cream border border-slate/30 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-navy">Origin:</span>
            <span className="font-mono font-black text-navy bg-cardBg px-2 py-0.5 rounded border border-slate/40">
              {routeOrigin.code}
            </span>
            <span className="font-semibold text-navy/80 truncate max-w-[150px]">
              {routeOrigin.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-navy">
              Distance:{" "}
              <span className="font-extrabold text-burgundy">
                {displayDistance} km
              </span>
            </span>
            <span className="font-bold text-navy">
              ETA:{" "}
              <span className="font-black text-emerald-700">
                ~{displayEta} min
              </span>
            </span>
            <span className="text-[10px] font-bold text-slate-dark bg-cardBg px-2 py-0.5 rounded border border-slate/40">
              {isRoad ? "OSRM Road Route" : "Straight Line"}
            </span>
          </div>
        </div>
      )}

      {/* Leaflet Map */}
      <div className="w-full h-80 rounded-xl overflow-hidden border border-slate/40 relative z-0">
        <MapContainer
          center={incidentLatLng}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds markers={markersToFit} />

          {/* Incident Pin */}
          <Marker
            position={incidentLatLng}
            icon={createIncidentIcon(
              incident.severity,
              incident.status === "RESOLVED",
              "!"
            )}
          >
            <Popup>
              <div className="p-1 text-navy text-xs font-sans">
                <span className="text-[10px] font-black uppercase text-burgundy">
                  Incident
                </span>
                <p className="font-black mt-0.5">{incident.title}</p>
                <p className="text-[11px] text-navy/70 mt-0.5">{incident.location}</p>
              </div>
            </Popup>
          </Marker>

          {/* Assigned Team Pin */}
          {hasAssignedTeamCoords && (
            <Marker
              position={[assignedTeam!.latitude, assignedTeam!.longitude]}
              icon={createTeamIcon(assignedTeam!.category, assignedTeam!.status)}
            >
              <Popup>
                <div className="p-1 text-navy text-xs font-sans">
                  <span className="text-[10px] font-black uppercase text-blue-600">
                    Assigned Unit
                  </span>
                  <p className="font-black mt-0.5">
                    {assignedTeam!.code} - {assignedTeam!.name}
                  </p>
                  <p className="text-[11px] text-navy/70 mt-0.5">
                    Category: {assignedTeam!.category}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Before Assignment: Top 3 Candidate Team Pins */}
          {!hasAssignedTeamCoords &&
            topCandidates.map((c, i) => (
              <Marker
                key={`cand-${c.team.id}`}
                position={[c.team.latitude, c.team.longitude]}
                icon={createTeamIcon(c.team.category, c.team.status)}
              >
                <Popup>
                  <div className="p-1 text-navy text-xs font-sans">
                    <span className="text-[10px] font-black uppercase text-indigo-700">
                      Candidate #{i + 1}
                    </span>
                    <p className="font-black mt-0.5">
                      {c.team.code} - {c.team.name}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                      {c.distanceKm} km away (~{c.etaMinutes} min)
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Route Line: OSRM Road Route if available, else straight dashed line */}
          {routeOrigin && (
            <Polyline
              positions={
                osrmRoute
                  ? osrmRoute.coordinates
                  : [
                      [routeOrigin.lat, routeOrigin.lng],
                      [incident.latitude!, incident.longitude!],
                    ]
              }
              pathOptions={{
                color: isRoad ? "#1d4ed8" : "#490b1a",
                weight: 4,
                dashArray: isRoad ? undefined : "6, 8",
                opacity: 0.85,
              }}
            >
              <Tooltip
                permanent
                direction="center"
                className="bg-navy text-cream font-mono text-[10px] font-black px-2 py-0.5 rounded-md border border-navy-light shadow-md"
              >
                {`${displayDistance} km, ~${displayEta} min`}
              </Tooltip>
            </Polyline>
          )}
        </MapContainer>
      </div>
    </div>
  );
}

