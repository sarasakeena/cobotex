"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Shield,
  MapPin,
  Clock,
  Users,
  LogOut,
  Navigation,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  PlusCircle,
  X,
  Radio,
  Flame,
  Activity,
  Check,
  Send,
  Loader2,
} from "lucide-react";
import { formatCategoryName } from "@/lib/severity";
import { SeverityBadge } from "@/components/SeverityBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { fetchOsrmRoute } from "@/lib/route";

// Dynamically load map without SSR
const IncidentDetailMap = dynamic(
  () => import("@/components/IncidentDetailMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-72 rounded-2xl bg-cardBg border border-slate/40 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate/40 border-t-burgundy" />
      </div>
    ),
  }
);

interface TeamDashboardData {
  team: {
    id: string;
    code: string;
    name: string;
    category: string;
    status: string;
    latitude: number;
    longitude: number;
    speedKmh?: number | null;
    lastLocationAt?: string | null;
    memberCount: number;
  };
  currentIncident: {
    id: string;
    title: string;
    description: string;
    category: string;
    location: string;
    latitude?: number | null;
    longitude?: number | null;
    peopleAffected: number;
    severity: string;
    status: string;
    assignedAt?: string | null;
    enRouteAt?: string | null;
    arrivedAt?: string | null;
    resolvedAt?: string | null;
    distanceKm?: number | null;
    etaMinutes?: number | null;
    assignmentRole: "PRIMARY" | "BACKUP";
    incidentTeamRecord?: any;
    priority?: {
      score: number;
      level: string;
      reasons: string[];
      waitingMinutes: number;
    } | null;
    backupTeams?: any[];
  } | null;
  pendingBackupRequests: any[];
}

export default function TeamDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<TeamDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals & Action States
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupPeople, setBackupPeople] = useState("4");
  const [backupType, setBackupType] = useState("");
  const [backupNote, setBackupNote] = useState("");

  // Travel Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTeamData = useCallback(async () => {
    try {
      const res = await fetch("/api/team/me");
      if (res.status === 401) {
        router.push("/team");
        return;
      }
      if (!res.ok) throw new Error("Failed to load team data");

      const meData = await res.json();
      setData(meData);
    } catch (err: any) {
      console.error("Team load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTeamData();
    // Poll team status every 5 seconds
    const interval = setInterval(loadTeamData, 5000);
    return () => clearInterval(interval);
  }, [loadTeamData]);

  // Periodic GPS update every 10 seconds
  useEffect(() => {
    if (!navigator.geolocation || isSimulating) return;

    const sendGps = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await fetch("/api/team/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              }),
            });
          } catch {}
        },
        null,
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };

    const gpsInterval = setInterval(sendGps, 10000);
    return () => clearInterval(gpsInterval);
  }, [isSimulating]);

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch("/api/team/logout", { method: "POST" });
      router.push("/team");
    } catch {
      router.push("/team");
    }
  };

  // Progress Action (EN_ROUTE, ARRIVED, RESOLVED)
  const handleProgressAction = async (action: "EN_ROUTE" | "ARRIVED" | "RESOLVED", note?: string) => {
    try {
      setIsActionLoading(true);
      const res = await fetch("/api/team/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Action failed");

      showToast(resData.message);
      setIsResolveModalOpen(false);
      setResolutionNote("");
      await loadTeamData();
    } catch (err: any) {
      showToast(err.message || "Failed to update progress", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Submit Backup Request
  const handleBackupRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsActionLoading(true);
      const res = await fetch("/api/team/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peopleNeeded: parseInt(backupPeople, 10),
          teamType: backupType || undefined,
          note: backupNote,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to request backup");

      showToast(`Backup request for ${backupPeople} personnel transmitted to Command.`);
      setIsBackupModalOpen(false);
      setBackupPeople("4");
      setBackupType("");
      setBackupNote("");
      await loadTeamData();
    } catch (err: any) {
      showToast(err.message || "Failed to submit backup request", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Travel Simulation: moves team along route toward incident over ~30 seconds
  const handleSimulateTravel = async () => {
    if (!data?.currentIncident || !data.currentIncident.latitude || !data.currentIncident.longitude) {
      showToast("Incident has no coordinates to simulate travel toward", "error");
      return;
    }

    if (isSimulating) {
      if (simulationRef.current) clearInterval(simulationRef.current);
      setIsSimulating(false);
      showToast("Travel simulation stopped.");
      return;
    }

    setIsSimulating(true);
    showToast("Starting live travel simulation toward incident (~30s)...");

    const startLat = data.team.latitude;
    const startLng = data.team.longitude;
    const targetLat = data.currentIncident.latitude;
    const targetLng = data.currentIncident.longitude;

    // Try fetching OSRM waypoints
    let waypoints: [number, number][] = [];
    try {
      const osrm = await fetchOsrmRoute(
        { lat: startLat, lng: startLng },
        { lat: targetLat, lng: targetLng }
      );
      if (osrm && osrm.coordinates.length > 5) {
        waypoints = osrm.coordinates;
      }
    } catch {}

    // Fallback to interpolated straight line points (15 steps)
    if (waypoints.length === 0) {
      const steps = 15;
      for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        waypoints.push([
          startLat + (targetLat - startLat) * ratio,
          startLng + (targetLng - startLng) * ratio,
        ]);
      }
    }

    // Step through waypoints over 30 seconds
    let currentIdx = 0;
    const totalSteps = waypoints.length;
    const stepIntervalMs = Math.max(800, Math.floor(28000 / totalSteps));

    simulationRef.current = setInterval(async () => {
      if (currentIdx >= totalSteps) {
        if (simulationRef.current) clearInterval(simulationRef.current);
        setIsSimulating(false);
        showToast("Simulation complete: unit arrived at incident staging location!");
        return;
      }

      const [stepLat, stepLng] = waypoints[currentIdx];
      currentIdx++;

      try {
        await fetch("/api/team/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: stepLat, lng: stepLng }),
        });
      } catch {}
    }, stepIntervalMs);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate/40 border-t-burgundy mb-4" />
        <p className="text-sm font-black text-navy">Connecting to Field Operations Dispatch...</p>
      </div>
    );
  }

  if (!data) return null;

  const { team, currentIncident, pendingBackupRequests } = data;
  const isAvailable = team.status === "AVAILABLE";
  const hasIncident = !!currentIncident;

  const isEnRoute = hasIncident && (
    currentIncident.assignmentRole === "PRIMARY"
      ? !!currentIncident.enRouteAt
      : !!currentIncident.incidentTeamRecord?.enRouteAt
  );

  const isArrived = hasIncident && (
    currentIncident.assignmentRole === "PRIMARY"
      ? !!currentIncident.arrivedAt
      : !!currentIncident.incidentTeamRecord?.arrivedAt
  );

  const googleMapsUrl = hasIncident && currentIncident.latitude && currentIncident.longitude
    ? `https://www.google.com/maps/dir/?api=1&origin=${team.latitude},${team.longitude}&destination=${currentIncident.latitude},${currentIncident.longitude}`
    : `https://www.google.com/maps?q=${team.latitude},${team.longitude}`;

  return (
    <div className="min-h-screen bg-cream pb-16">
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

      {/* Mobile Top Header Bar */}
      <header className="sticky top-0 z-40 bg-navy text-cream px-4 py-3.5 border-b border-navy-light/40 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-burgundy flex items-center justify-center text-cream font-mono font-black text-sm shadow-xs">
              {team.code.split("-")[0]?.[0] || "T"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black bg-navy-light px-2 py-0.5 rounded text-cream">
                  {team.code}
                </span>
                <span className="text-xs font-bold text-cream/80 truncate max-w-[140px] sm:max-w-xs">
                  {team.name}
                </span>
              </div>
              <p className="text-[10px] text-slate font-medium">
                {team.memberCount} Personnel &bull; {team.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isAvailable
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                  isAvailable ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {isAvailable ? "Standby" : "Dispatched"}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-cream/70 hover:text-cream hover:bg-navy-light transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {!hasIncident ? (
          /* FREE / NO ACTIVE ASSIGNMENT STATE */
          <div className="bg-cardBg rounded-2xl border border-slate/40 p-8 text-center space-y-4 shadow-sm my-6">
            <div className="h-16 w-16 rounded-2xl bg-cream flex items-center justify-center text-slate mx-auto border border-slate/40">
              <Shield className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-navy">No Active Emergency Assignment</h2>
              <p className="text-xs text-navy/70 mt-1 max-w-md mx-auto font-medium">
                Unit {team.code} is registered as AVAILABLE on standby. Automated dispatch will assign this unit as soon as a suitable emergency occurs nearby.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={loadTeamData}
                className="px-4 py-2 rounded-xl bg-navy text-cream text-xs font-bold hover:bg-navy-light transition shadow-2xs"
              >
                Check for New Dispatch
              </button>
              <Link
                href="/admin"
                className="text-xs font-bold text-burgundy hover:underline"
              >
                Go to Command Dashboard &rarr;
              </Link>
            </div>
          </div>
        ) : (
          /* ACTIVE INCIDENT RESPONSE VIEW */
          <div className="space-y-6">
            {/* Incident Summary Card */}
            <div className="bg-cardBg rounded-2xl border-2 border-burgundy/40 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate/30">
                <div className="flex items-center gap-2">
                  <CategoryIcon category={currentIncident.category} size="md" />
                  <span className="text-xs font-extrabold text-navy uppercase tracking-wider">
                    {formatCategoryName(currentIncident.category)}
                  </span>
                  <SeverityBadge severity={currentIncident.severity} size="sm" />
                  {currentIncident.priority && (
                    <PriorityBadge
                      level={currentIncident.priority.level}
                      score={currentIncident.priority.score}
                      showScore={true}
                      size="sm"
                    />
                  )}
                </div>

                <span className="text-xs font-mono font-black text-cream bg-burgundy px-2.5 py-0.5 rounded-md">
                  {currentIncident.assignmentRole === "PRIMARY" ? "Primary Responder" : "Backup Unit"}
                </span>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-black text-navy">
                  {currentIncident.title}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-navy/80 mt-1 leading-relaxed whitespace-pre-wrap">
                  {currentIncident.description}
                </p>
              </div>

              {/* Location & Casualty Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate/30 text-xs font-bold text-navy">
                <div className="p-2.5 rounded-xl bg-cream border border-slate/30">
                  <span className="text-[10px] text-slate-dark uppercase font-extrabold block mb-0.5">
                    Target Location
                  </span>
                  <span className="flex items-center gap-1 font-bold text-navy">
                    <MapPin className="h-3.5 w-3.5 text-burgundy shrink-0" />
                    <span className="truncate">{currentIncident.location}</span>
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-cream border border-slate/30">
                  <span className="text-[10px] text-slate-dark uppercase font-extrabold block mb-0.5">
                    Casualties Reported
                  </span>
                  <span className="flex items-center gap-1 font-bold text-navy">
                    <Users className="h-3.5 w-3.5 text-slate shrink-0" />
                    <span>{currentIncident.peopleAffected} People</span>
                  </span>
                </div>
              </div>

              {/* Backup Request Status Alert Banner (if any) */}
              {pendingBackupRequests.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-amber-700 animate-pulse" />
                    <span>
                      Backup Request Pending: Command is dispatching {pendingBackupRequests[0].peopleNeeded} additional personnel.
                    </span>
                  </div>
                </div>
              )}

              {/* Fulfilled Backup Notice */}
              {currentIncident.backupTeams && currentIncident.backupTeams.length > 0 && (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold space-y-1">
                  <span className="font-extrabold block">
                    Backup Units on Scene / En Route:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {currentIncident.backupTeams.map((bt: any) => (
                      <span
                        key={bt.id}
                        className="inline-flex items-center gap-1 bg-cardBg px-2 py-0.5 rounded border border-purple-300 text-[11px]"
                      >
                        <Shield className="h-3 w-3 text-purple-700" />
                        <span>{bt.team?.code} ({bt.team?.name})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tactical Action Buttons (Large, Mobile-First) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Button 1: On The Way */}
              <button
                type="button"
                disabled={isActionLoading || isEnRoute}
                onClick={() => handleProgressAction("EN_ROUTE")}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition shadow-sm ${
                  isEnRoute
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 opacity-80"
                    : "bg-navy text-cream border-navy hover:bg-navy-light cursor-pointer active:scale-[0.98]"
                }`}
              >
                <Navigation className="h-6 w-6 mb-1 text-cream" />
                <span className="text-sm font-black">
                  {isEnRoute ? "✓ En Route Marked" : "On the way"}
                </span>
                <span className="text-[10px] opacity-75 font-medium mt-0.5">
                  {isEnRoute ? "Dispatched" : "Tap to transmit en-route"}
                </span>
              </button>

              {/* Button 2: Arrived on Site */}
              <button
                type="button"
                disabled={isActionLoading || isArrived}
                onClick={() => handleProgressAction("ARRIVED")}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition shadow-sm ${
                  isArrived
                    ? "bg-blue-50 text-blue-900 border-blue-300 opacity-80"
                    : "bg-burgundy text-cream border-burgundy hover:bg-burgundy-light cursor-pointer active:scale-[0.98]"
                }`}
              >
                <CheckCircle2 className="h-6 w-6 mb-1 text-cream" />
                <span className="text-sm font-black">
                  {isArrived ? "✓ On Scene" : "Arrived on site"}
                </span>
                <span className="text-[10px] opacity-75 font-medium mt-0.5">
                  {isArrived ? "Incident In Progress" : "Sets In-Progress status"}
                </span>
              </button>

              {/* Button 3: Request Backup */}
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => setIsBackupModalOpen(true)}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate/40 bg-cardBg text-navy hover:bg-cream transition shadow-2xs active:scale-[0.98]"
              >
                <Radio className="h-5 w-5 mb-1 text-amber-600" />
                <span className="text-xs font-black">Request Backup</span>
                <span className="text-[10px] text-navy/70 font-semibold">
                  Call additional units
                </span>
              </button>

              {/* Button 4: Mark Resolved */}
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => setIsResolveModalOpen(true)}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition shadow-2xs active:scale-[0.98]"
              >
                <Check className="h-5 w-5 mb-1 text-emerald-700" />
                <span className="text-xs font-black">Mark Resolved</span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  Release units & close
                </span>
              </button>
            </div>

            {/* Travel Simulation Control Bar */}
            <div className="p-4 rounded-2xl bg-cardBg border border-slate/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-navy flex items-center gap-1.5">
                  <Play className="h-4 w-4 text-burgundy" />
                  <span>GPS Movement Simulation</span>
                </span>
                <p className="text-[11px] text-navy/70 font-medium mt-0.5">
                  Demo feature: auto-streams unit coordinates toward incident over ~30 seconds.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSimulateTravel}
                className={`px-4 py-2 rounded-xl text-xs font-black transition shadow-sm flex items-center gap-1.5 ${
                  isSimulating
                    ? "bg-amber-600 text-white animate-pulse"
                    : "bg-burgundy text-cream hover:bg-burgundy-light"
                }`}
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Simulating (~30s)... Tap to Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Simulate Travel</span>
                  </>
                )}
              </button>
            </div>

            {/* Route Map & Google Maps Directions */}
            <IncidentDetailMap
              incident={currentIncident}
              assignedTeam={team}
              candidateTeams={[]}
            />
          </div>
        )}
      </main>

      {/* RESOLUTION MODAL */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-cardBg rounded-2xl border border-slate/40 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate/30">
              <h3 className="text-base font-black text-navy">Confirm Incident Resolution</h3>
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="p-1 text-slate hover:text-navy rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-navy/80 font-medium">
              Marking this incident as RESOLVED will release all active units (primary &amp; backup) back to AVAILABLE standby status.
            </p>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-navy mb-1">
                Resolution Field Note (Optional)
              </label>
              <textarea
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="e.g. Fire suppressed with 2 water tenders. All occupants accounted for."
                className="w-full rounded-xl border border-slate/40 bg-cream p-3 text-xs font-bold text-navy placeholder:text-slate focus:border-burgundy focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-navy bg-cream border border-slate/40 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => handleProgressAction("RESOLVED", resolutionNote)}
                className="px-5 py-2 text-xs font-black text-cream bg-emerald-700 rounded-xl hover:bg-emerald-600 shadow-sm"
              >
                {isActionLoading ? "Resolving..." : "Confirm Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST BACKUP MODAL */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-cardBg rounded-2xl border border-slate/40 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate/30">
              <h3 className="text-base font-black text-navy">Request Backup Reinforcements</h3>
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="p-1 text-slate hover:text-navy rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBackupRequestSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-navy mb-1">
                    Personnel Needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={backupPeople}
                    onChange={(e) => setBackupPeople(e.target.value)}
                    className="w-full rounded-xl border border-slate/40 bg-cream px-3 py-2 text-xs font-bold text-navy focus:border-burgundy focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-navy mb-1">
                    Specialized Unit (Optional)
                  </label>
                  <select
                    value={backupType}
                    onChange={(e) => setBackupType(e.target.value)}
                    className="w-full rounded-xl border border-slate/40 bg-cream px-3 py-2 text-xs font-bold text-navy focus:border-burgundy focus:outline-none"
                  >
                    <option value="">Any Available</option>
                    <option value="FIRE">FIRE</option>
                    <option value="MEDICAL">MEDICAL</option>
                    <option value="RESCUE">RESCUE</option>
                    <option value="POLICE">POLICE</option>
                    <option value="DISASTER">DISASTER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-navy mb-1">
                  Tactical Situation Note
                </label>
                <textarea
                  rows={2}
                  value={backupNote}
                  onChange={(e) => setBackupNote(e.target.value)}
                  placeholder="e.g. Flash structural crack, need heavy hydraulic cutting tools."
                  className="w-full rounded-xl border border-slate/40 bg-cream p-3 text-xs font-bold text-navy placeholder:text-slate focus:border-burgundy focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBackupModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-navy bg-cream border border-slate/40 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2 text-xs font-black text-cream bg-burgundy rounded-xl hover:bg-burgundy-light shadow-sm"
                >
                  {isActionLoading ? "Transmitting..." : "Send Request to Command"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
