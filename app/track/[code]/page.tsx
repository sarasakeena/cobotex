"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ShieldAlert,
  Clock,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Truck,
  MapPin,
  RefreshCw,
  Volume2,
  VolumeX,
  ChevronLeft,
  Calendar,
  Compass,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SeverityBadge } from "@/components/SeverityBadge";
import { formatCategoryName, CategoryType, SeverityType } from "@/lib/severity";
import { getSafetyTipsForCategory, SafetyTip } from "@/lib/safetyTips";

interface PublicEvent {
  type: string;
  publicMessage: string;
  createdAt: string;
}

interface PublicTrackingData {
  trackingCode: string;
  category: string;
  severity: SeverityType;
  status: string;
  createdAt: string;
  publicEvents: PublicEvent[];
  assignedTeam: {
    code: string;
    category: string;
  } | null;
  etaMinutes: number | null;
  distanceKm: number | null;
}

// Progress Steps
const PROGRESS_STEPS = [
  { key: "REPORTED", label: "Report Received" },
  { key: "ASSIGNED", label: "Team Assigned" },
  { key: "EN_ROUTE", label: "Team On The Way" },
  { key: "ARRIVED", label: "Team On Site" },
  { key: "RESOLVED", label: "Resolved" },
];

export default function PublicTrackPage() {
  const params = useParams();
  const rawCode = (params?.code as string) || "";
  const code = decodeURIComponent(rawCode).trim().toUpperCase();

  const [data, setData] = useState<PublicTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [etaRemainingSeconds, setEtaRemainingSeconds] = useState<number | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resolvedSinceRef = useRef<number | null>(null);

  const fetchTracking = useCallback(async (isInitial = false) => {
    if (!code) return;
    if (!isInitial) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(code)}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError("No emergency incident found matching this tracking code. Please double-check the reference number.");
        } else if (res.status === 429) {
          setError("Rate limit reached. Please wait a minute before refreshing.");
        } else {
          setError("Unable to load emergency incident details. Please try again shortly.");
        }
        setData(null);
        return;
      }

      const json = await res.json();
      setData(json);
      setError(null);

      // Track resolved time to stop polling after 10 mins
      if (json.status === "RESOLVED") {
        if (!resolvedSinceRef.current) {
          resolvedSinceRef.current = Date.now();
        }
      } else {
        resolvedSinceRef.current = null;
      }

      // Initialize ETA countdown if team assigned & eta provided
      if (json.etaMinutes && json.status !== "RESOLVED") {
        // Only set if not already counting down
        setEtaRemainingSeconds((prev) => (prev === null ? json.etaMinutes * 60 : prev));
      }
    } catch (err: any) {
      console.error("Tracking fetch failed:", err);
      if (isInitial) setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [code]);

  // Initial fetch and 5-second polling interval
  useEffect(() => {
    fetchTracking(true);

    pollIntervalRef.current = setInterval(() => {
      // Stop polling after 10 minutes if resolved
      if (resolvedSinceRef.current && Date.now() - resolvedSinceRef.current > 10 * 60 * 1000) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return;
      }
      fetchTracking(false);
    }, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [fetchTracking]);

  // 1-second ETA countdown timer
  useEffect(() => {
    if (etaRemainingSeconds !== null && etaRemainingSeconds > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setEtaRemainingSeconds((prev) => (prev && prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [etaRemainingSeconds]);

  // Web Speech API Voice Read-Aloud for Safety Tips
  const toggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Audio speech synthesis is not supported on your browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const tips = getSafetyTipsForCategory(data?.category);
    const textToSpeak = `Safety instructions for ${formatCategoryName(data?.category || "emergency")}. ${tips
      .map((t, idx) => `Tip ${idx + 1}: ${t.title}. ${t.instruction}`)
      .join(" ")}. Remember, in a life threatening emergency, call 112 immediately.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Determine current active progress stage index
  const getActiveStepIndex = () => {
    if (!data) return 0;
    if (data.status === "RESOLVED") return 4;
    const hasArrivedEvent = data.publicEvents.some((e) => e.type === "ARRIVED");
    if (data.status === "IN_PROGRESS" || hasArrivedEvent) return 3;
    const hasEnRouteEvent = data.publicEvents.some((e) => e.type === "EN_ROUTE");
    if (hasEnRouteEvent) return 2;
    if (data.assignedTeam || data.status === "ASSIGNED") return 1;
    return 0;
  };

  const activeStepIdx = getActiveStepIndex();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-burgundy border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-navy">Locating emergency incident records...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-cream py-12 px-4 sm:px-6">
        <div className="max-w-xl mx-auto rounded-2xl border border-slate/40 bg-cardBg p-8 shadow-md text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-300">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-black text-navy">Report Not Found</h2>
          <p className="text-xs sm:text-sm text-navy/70 leading-relaxed font-medium">
            {error || "Could not retrieve tracking details for this emergency reference."}
          </p>
          <div className="pt-2">
            <Link
              href="/track"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-burgundy text-cream text-xs font-bold hover:bg-burgundy-light transition shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Report Search</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const safetyTips = getSafetyTipsForCategory(data.category);

  const formatCountdown = (totalSec: number) => {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="min-h-screen bg-cream py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Top Navigation & Status Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/track"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-navy/70 hover:text-navy transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Search Another Code</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchTracking(false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate/40 text-[11px] font-bold text-navy hover:bg-cream transition disabled:opacity-60"
              title="Refresh status"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-burgundy" : ""}`} />
              <span>{isRefreshing ? "Updating..." : "Live 5s"}</span>
            </button>
          </div>
        </div>

        {/* Emergency Callout Banner */}
        <div className="rounded-2xl border-2 border-burgundy bg-burgundy/10 p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-burgundy text-cream flex items-center justify-center shrink-0">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-burgundy">
                Critical Safety Alert
              </p>
              <p className="text-xs sm:text-sm font-bold text-navy">
                In immediate life-threatening danger, call <strong className="text-burgundy">112</strong>
              </p>
            </div>
          </div>
          <a
            href="tel:112"
            className="px-3.5 py-2 rounded-xl bg-burgundy text-cream font-black text-xs hover:bg-burgundy-light transition shrink-0 shadow-sm"
          >
            Call 112
          </a>
        </div>

        {/* Header Incident Card */}
        <div className="rounded-2xl border border-slate/40 bg-cardBg p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-dark">
                  Emergency Tracking Code
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className="font-mono text-2xl sm:text-3xl font-black text-burgundy tracking-wider mt-0.5">
                {data.trackingCode}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <SeverityBadge severity={data.severity} size="md" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-navy/80 pt-1 border-t border-slate/20">
            <div className="flex items-center gap-1.5 font-bold">
              <CategoryIcon category={data.category as CategoryType} className="h-4 w-4 text-burgundy" />
              <span>{formatCategoryName(data.category)}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1 text-slate-dark font-medium">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(data.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        </div>

        {/* 5-Stage Visual Progress Banner */}
        <div className="rounded-2xl border border-slate/40 bg-cardBg p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-dark">
              Response Progression
            </h2>
            <span className="text-xs font-bold text-navy px-2.5 py-0.5 rounded-full bg-navy/10">
              {PROGRESS_STEPS[activeStepIdx].label}
            </span>
          </div>

          {/* Stepper bar */}
          <div className="relative pt-2">
            <div className="hidden sm:flex items-center justify-between relative z-10">
              {PROGRESS_STEPS.map((step, idx) => {
                const isCompleted = idx < activeStepIdx;
                const isCurrent = idx === activeStepIdx;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-all border-2 ${
                        isCompleted
                          ? "bg-navy border-navy text-cream"
                          : isCurrent
                          ? "bg-burgundy border-burgundy text-cream ring-4 ring-burgundy/20 scale-110"
                          : "bg-cream border-slate/50 text-slate"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] mt-2 text-center font-bold tracking-tight px-1 ${
                        isCurrent
                          ? "text-burgundy"
                          : isCompleted
                          ? "text-navy"
                          : "text-slate"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Stepper line */}
            <div className="hidden sm:block absolute top-6 left-8 right-8 h-0.5 bg-slate/30 z-0" />
            <div
              className="hidden sm:block absolute top-6 left-8 h-0.5 bg-burgundy z-0 transition-all duration-500"
              style={{
                width: `${(activeStepIdx / (PROGRESS_STEPS.length - 1)) * 80}%`,
              }}
            />

            {/* Mobile simplified active step */}
            <div className="sm:hidden flex items-center gap-3 p-3 rounded-xl bg-cream/70 border border-slate/30">
              <div className="h-8 w-8 rounded-full bg-burgundy text-cream flex items-center justify-center font-bold text-xs shrink-0">
                {activeStepIdx + 1}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-dark uppercase">Current Stage</p>
                <p className="text-sm font-black text-navy">{PROGRESS_STEPS[activeStepIdx].label}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Response Team Card */}
        {data.assignedTeam ? (
          <div className="rounded-2xl border-2 border-navy/20 bg-cardBg p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-burgundy" />
                <h2 className="text-xs font-black uppercase tracking-wider text-navy">
                  Dispatched Emergency Unit
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Active Deployment
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-cream/60 border border-slate/30">
                <span className="text-[10px] font-bold text-slate-dark uppercase">Unit Identification</span>
                <p className="font-mono text-base font-black text-navy mt-0.5">
                  {data.assignedTeam.code}
                </p>
                <p className="text-[11px] text-navy/70 font-semibold">
                  {data.assignedTeam.category} Division
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-cream/60 border border-slate/30">
                <span className="text-[10px] font-bold text-slate-dark uppercase">Estimated Arrival</span>
                {data.status === "RESOLVED" ? (
                  <p className="text-sm font-black text-emerald-700 mt-1">Incident Completed</p>
                ) : activeStepIdx >= 3 ? (
                  <p className="text-sm font-black text-burgundy mt-1">Unit On Scene</p>
                ) : etaRemainingSeconds !== null && etaRemainingSeconds > 0 ? (
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono text-xl font-black text-burgundy">
                      {formatCountdown(etaRemainingSeconds)}
                    </span>
                    <span className="text-[11px] text-slate-dark font-bold">mins</span>
                  </div>
                ) : (
                  <p className="text-sm font-black text-burgundy mt-1">Arriving Momentarily</p>
                )}
                {data.distanceKm && data.status !== "RESOLVED" && (
                  <p className="text-[11px] text-slate-dark font-medium mt-0.5">
                    Approx. {data.distanceKm.toFixed(1)} km transit corridor
                  </p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-dark italic font-medium">
              * Note: Exact GPS telemetry coordinates are restricted to authorized emergency command personnel to ensure responder safety.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate/40 bg-cardBg p-5 text-center space-y-1">
            <Clock className="h-6 w-6 text-slate mx-auto" />
            <p className="text-xs font-bold text-navy">Emergency Unit Assignment in Progress</p>
            <p className="text-[11px] text-navy/60 font-medium">
              Central triage is routing the closest verified team to your location.
            </p>
          </div>
        )}

        {/* Public Event Timeline */}
        <div className="rounded-2xl border border-slate/40 bg-cardBg p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-dark">
            Public Incident Timeline
          </h2>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate/30">
            {data.publicEvents.map((evt, idx) => (
              <div key={idx} className="relative group">
                {/* Node icon */}
                <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-cream bg-burgundy group-hover:scale-125 transition" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-navy/70">
                      {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-navy/10 text-navy uppercase tracking-wider">
                      {evt.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-navy mt-1">
                    {evt.publicMessage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Tips Card with Web Speech Read Aloud */}
        <div className="rounded-2xl border border-slate/40 bg-cardBg p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-burgundy" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-dark">
                  Immediate Safety Guidelines ({formatCategoryName(data.category)})
                </h2>
              </div>
              <p className="text-[11px] text-navy/70 font-medium mt-0.5">
                Recommended protocols while waiting for emergency responders to arrive.
              </p>
            </div>

            {/* Read Aloud Button */}
            <button
              type="button"
              onClick={toggleSpeech}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                isSpeaking
                  ? "bg-rose-600 text-cream animate-pulse"
                  : "bg-navy text-cream hover:bg-navy-light"
              }`}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Stop audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Read aloud</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {safetyTips.map((tip, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate/30 bg-cream/40 space-y-1"
              >
                <p className="text-xs font-black text-navy flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-burgundy/10 text-burgundy text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span>{tip.title}</span>
                </p>
                <p className="text-[11px] text-navy/75 leading-relaxed font-medium pl-5">
                  {tip.instruction}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/"
            className="text-xs font-bold text-slate-dark hover:text-navy transition"
          >
            ← Return to CRISISPULSE Home
          </Link>

          <Link
            href="/report"
            className="text-xs font-bold text-burgundy hover:underline flex items-center gap-1"
          >
            <span>Submit another report</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

