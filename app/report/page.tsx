"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Flame,
  Car,
  HeartPulse,
  Waves,
  Building2,
  AlertTriangle,
  MapPin,
  Navigation,
  Mic,
  MicOff,
  Check,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  X,
  Camera,
  AlertCircle,
  Phone,
  Sparkles,
  Edit3,
  RotateCcw,
} from "lucide-react";
import { CategoryType, SeverityType, formatCategoryName } from "@/lib/severity";
import { SeverityBadge } from "@/components/SeverityBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { parseVoiceReport, ParsedVoiceReport } from "@/lib/voiceParser";

// Dynamically import Leaflet Map Picker without SSR
const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-2xl bg-cream flex items-center justify-center border border-slate/40 text-navy/70 text-sm font-semibold">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 border-2 border-burgundy border-t-transparent rounded-full animate-spin" />
        <span>Loading map interface...</span>
      </div>
    </div>
  ),
});

const CATEGORIES: {
  value: CategoryType;
  label: string;
  icon: any;
}[] = [
  { value: "FIRE", label: "Fire Emergency", icon: Flame },
  { value: "ROAD_ACCIDENT", label: "Road Accident", icon: Car },
  { value: "MEDICAL", label: "Medical Emergency", icon: HeartPulse },
  { value: "FLOOD", label: "Flood", icon: Waves },
  { value: "BUILDING_COLLAPSE", label: "Building Collapse", icon: Building2 },
  { value: "OTHER", label: "Other Emergencies", icon: AlertTriangle },
];

const CATEGORY_TAGS: Record<CategoryType, string[]> = {
  FIRE: ["Trapped inside", "Spreading", "Explosion risk", "Smoke", "Unconscious"],
  ROAD_ACCIDENT: ["Injuries", "Vehicle on fire", "Road blocked"],
  MEDICAL: ["Unconscious", "Bleeding", "Not breathing", "Chest pain"],
  FLOOD: ["Rising water", "People stranded", "Houses submerged"],
  BUILDING_COLLAPSE: ["People trapped", "Gas leak", "Partial collapse"],
  OTHER: ["Needs rescue", "Needs medical help", "Needs shelter"],
};

const PEOPLE_PRESETS = [
  { label: "1", value: 1 },
  { label: "2–5", value: 3 },
  { label: "6–10", value: 8 },
  { label: "10+", value: 15 },
];

const SPEECH_LANGUAGES = [
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "Hindi (हिंदी)" },
  { code: "ta-IN", label: "Tamil (தமிழ்)" },
  { code: "te-IN", label: "Telugu (తెలుగు)" },
  { code: "en-US", label: "English (US)" },
];

interface SubmittedReport {
  id: string;
  title: string;
  category: string;
  location: string;
  peopleAffected: number;
  severity: SeverityType;
  severityScore?: number;
  severityReasons?: string[];
  status: string;
  createdAt: string;
}

export default function ReportPage() {
  // Mode: "speak" (default) or "manual"
  const [mode, setMode] = useState<"speak" | "manual">("speak");
  const [hasSpoken, setHasSpoken] = useState(false);

  // 1. Category (single select)
  const [category, setCategory] = useState<CategoryType>("FIRE");

  // 2. Location
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [locationSource, setLocationSource] = useState<"gps" | "geocode" | "manual" | null>(null);

  // 3. People Affected
  const [selectedPeoplePreset, setSelectedPeoplePreset] = useState<number | null>(1);
  const [exactPeople, setExactPeople] = useState<string>("");
  const [isExactOpen, setIsExactOpen] = useState(false);

  // 4. Quick Tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 5. Voice & Description
  const [description, setDescription] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [speechLang, setSpeechLang] = useState("en-IN");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptAccumulatorRef = useRef<string>("");

  // Track fields modified manually by user
  const [userModified, setUserModified] = useState({
    category: false,
    location: false,
    people: false,
    tags: false,
    phone: false,
    description: false,
  });

  // Track fields filled by voice
  const [voiceFilledFields, setVoiceFilledFields] = useState<Set<string>>(new Set());

  // 6. Contact
  const [contactInfo, setContactInfo] = useState("");

  // 7. Optional Photo
  const [photoData, setPhotoData] = useState<string | null>(null);

  // Ready Check & Auto-submit Countdown
  const [countdown, setCountdown] = useState<number | null>(null);
  const [missingFieldNotice, setMissingFieldNotice] = useState<string | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedIncident, setSubmittedIncident] = useState<SubmittedReport | null>(null);

  // Load saved contact on mount
  useEffect(() => {
    try {
      const savedPhone = localStorage.getItem("crisis_contact_phone");
      if (savedPhone) {
        setContactInfo(savedPhone);
      }
    } catch {}
  }, []);

  // Cancel countdown if user touches any input
  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  }, []);

  // Category switch handler: resets tags
  const handleCategorySelect = (newCat: CategoryType) => {
    cancelCountdown();
    setUserModified((prev) => ({ ...prev, category: true }));
    setCategory(newCat);
    setSelectedTags([]);
  };

  // Tag toggle handler
  const handleTagToggle = (tag: string) => {
    cancelCountdown();
    setUserModified((prev) => ({ ...prev, tags: true }));
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Reverse geocode coordinates using Nominatim API (5s timeout)
  const reverseGeocodeCoords = async (
    lat: number,
    lng: number
  ): Promise<string | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
        {
          signal: controller.signal,
          headers: {
            "Accept-Language": "en",
            "User-Agent": "CrisisPulse-EmergencyResponse/1.0",
          },
        }
      );
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
        return parts.slice(0, 3).join(", ");
      }
      return null;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  };

  // Forward geocode address using Nominatim OpenStreetMap API
  const geocodeAddress = async (
    query: string
  ): Promise<{ lat: number; lng: number } | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=in`,
        {
          signal: controller.signal,
          headers: {
            "Accept-Language": "en",
            "User-Agent": "CrisisPulse-EmergencyResponse/1.0",
          },
        }
      );
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
      return null;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  };

  // Geolocation acquisition + reverse geocode
  const requestCurrentLocation = useCallback(
    (onSuccess?: (pos: { lat: number; lng: number }) => void) => {
      if (!navigator.geolocation) {
        setLocError("Geolocation not supported. Please drop pin on map.");
        setShowMap(true);
        return;
      }

      setLocLoading(true);
      setLocError(null);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCoords(pos);
          setLocationSource("gps");

          const revAddress = await reverseGeocodeCoords(pos.lat, pos.lng);
          if (revAddress) {
            setAddress(revAddress);
          } else {
            setAddress(`${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
          }

          setLocLoading(false);
          setLocError(null);
          if (onSuccess) onSuccess(pos);
        },
        (error) => {
          setLocLoading(false);
          let msg = "Could not fetch GPS. Please tap pin on map.";
          if (error.code === error.PERMISSION_DENIED) {
            msg = "Location permission denied. Please tap pin on map.";
          } else if (error.code === error.TIMEOUT) {
            msg = "GPS timed out. Please tap pin on map.";
          }
          setLocError(msg);
          setShowMap(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        }
      );
    },
    []
  );

  // Manual GPS Button click
  const handleGetCurrentLocation = () => {
    cancelCountdown();
    setUserModified((prev) => ({ ...prev, location: true }));
    requestCurrentLocation();
  };

  // Trigger auto-submit countdown
  const triggerAutoSubmitCountdown = useCallback(() => {
    cancelCountdown();
    setMissingFieldNotice(null);
    setCountdown(5);

    let currentCount = 5;
    countdownIntervalRef.current = setInterval(() => {
      currentCount -= 1;
      if (currentCount <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(0);
        submitReportDirect();
      } else {
        setCountdown(currentCount);
      }
    }, 1000);
  }, [cancelCountdown]);

  // Execute Smart Voice Parser on transcript
  const processVoiceTranscript = useCallback(
    async (fullTranscript: string) => {
      if (!fullTranscript.trim()) return;

      setHasSpoken(true);
      const parsed: ParsedVoiceReport = parseVoiceReport(fullTranscript);
      const newVoiceFields = new Set<string>();

      // 1. Category
      let resolvedCategory = category;
      if (parsed.category && !userModified.category) {
        setCategory(parsed.category);
        resolvedCategory = parsed.category;
        newVoiceFields.add("category");
      }

      // 2. People Affected
      if (parsed.peopleAffected !== undefined && !userModified.people) {
        newVoiceFields.add("people");
        const count = parsed.peopleAffected;
        const matchingPreset = PEOPLE_PRESETS.find((p) => p.value === count);
        if (matchingPreset) {
          setIsExactOpen(false);
          setSelectedPeoplePreset(matchingPreset.value);
        } else {
          setIsExactOpen(true);
          setExactPeople(String(count));
          setSelectedPeoplePreset(null);
        }
      }

      // 3. Quick Tags
      if (parsed.tags && parsed.tags.length > 0 && !userModified.tags) {
        setSelectedTags(parsed.tags);
        newVoiceFields.add("tags");
      }

      // 4. Contact Phone
      if (parsed.contactPhone && !userModified.phone) {
        setContactInfo(parsed.contactPhone);
        newVoiceFields.add("phone");
      }

      // 5. Address text
      let resolvedAddress = address;
      if (parsed.addressText && !userModified.location && !parsed.useCurrentLocation) {
        setAddress(parsed.addressText);
        resolvedAddress = parsed.addressText;
        newVoiceFields.add("address");
      }

      // 6. Description
      if (!userModified.description) {
        setDescription(fullTranscript);
        newVoiceFields.add("description");
      }

      setVoiceFilledFields(newVoiceFields);

      // Location resolution
      let finalCoords = coords;

      if (parsed.useCurrentLocation || !parsed.addressText) {
        if (!userModified.location) {
          setAddress("");
        }
        requestCurrentLocation((gpsCoords) => {
          finalCoords = gpsCoords;
          if (resolvedCategory && gpsCoords) {
            triggerAutoSubmitCountdown();
          }
        });
      } else if (resolvedAddress && !userModified.location && !coords) {
        setLocLoading(true);
        const geoRes = await geocodeAddress(resolvedAddress);
        setLocLoading(false);
        if (geoRes) {
          setCoords(geoRes);
          finalCoords = geoRes;
          setLocationSource("geocode");
          newVoiceFields.add("location");
          if (resolvedCategory) {
            triggerAutoSubmitCountdown();
          }
        } else {
          requestCurrentLocation((gpsCoords) => {
            finalCoords = gpsCoords;
            if (resolvedCategory && gpsCoords) {
              triggerAutoSubmitCountdown();
            }
          });
        }
      } else {
        const isComplete = Boolean(resolvedCategory && (finalCoords || resolvedAddress));
        if (isComplete) {
          triggerAutoSubmitCountdown();
        } else {
          setMissingFieldNotice("Almost done: please confirm your location pin on the map.");
          setShowMap(true);
        }
      }
    },
    [
      category,
      address,
      coords,
      userModified,
      requestCurrentLocation,
      triggerAutoSubmitCountdown,
    ]
  );

  // Toggle voice recognition
  const toggleSpeechRecognition = () => {
    cancelCountdown();

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        "Voice recognition is not supported in this browser. Please type description directly."
      );
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      setSpeechError(null);
      transcriptAccumulatorRef.current = "";
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimText("");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let finalStr = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        setInterimText(interim);

        if (finalStr) {
          transcriptAccumulatorRef.current = (
            transcriptAccumulatorRef.current + " " + finalStr
          ).trim();
          setDescription((prev) =>
            prev ? `${prev.trim()} ${finalStr.trim()}` : finalStr.trim()
          );
        }

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
          }
        }, 3000);
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setSpeechError("Microphone access denied. Please type description.");
        } else if (event.error !== "no-speech") {
          setSpeechError(`Voice error (${event.error}). Please type description.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText("");
        const fullSpoken = transcriptAccumulatorRef.current.trim();
        if (fullSpoken) {
          processVoiceTranscript(fullSpoken);
        }
      };

      recognition.start();
    } catch {
      setSpeechError("Could not start voice recognition. Please type description.");
      setIsListening(false);
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelCountdown();
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setPhotoData(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Determine people affected value
  const getPeopleAffectedCount = (): number => {
    if (isExactOpen && exactPeople.trim() !== "") {
      const parsed = parseInt(exactPeople, 10);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    }
    return selectedPeoplePreset ?? 1;
  };

  // Core Submit function
  const submitReportDirect = async () => {
    cancelCountdown();
    if (!category || (!coords && !address.trim())) {
      setMissingFieldNotice("Location is required. Please tap map or use GPS.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const peopleCount = getPeopleAffectedCount();
    const categoryLabel = formatCategoryName(category);

    const cleanAddr = address.trim();
    const isJunkAddr =
      !cleanAddr ||
      cleanAddr.length < 3 ||
      /\b(?:please|use\s+my|current\s+location|my\s+location)\b/i.test(cleanAddr) ||
      cleanAddr.toLowerCase() === description.trim().toLowerCase();

    const validAddress = !isJunkAddr ? cleanAddr : undefined;

    const autoTitle = validAddress
      ? `${categoryLabel} reported - ${validAddress}`
      : `${categoryLabel} reported`;

    let autoDesc = description.trim();
    if (!autoDesc) {
      const presetLabel =
        PEOPLE_PRESETS.find((p) => p.value === selectedPeoplePreset)?.label ||
        `${peopleCount}`;
      const tagText = selectedTags.length > 0 ? ` ${selectedTags.join(", ")}.` : "";
      autoDesc = `${categoryLabel} reported. ${presetLabel} people affected.${tagText}`;
    }

    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          latitude: coords?.lat,
          longitude: coords?.lng,
          address: validAddress,
          peopleAffected: peopleCount,
          tags: selectedTags,
          title: autoTitle,
          description: autoDesc,
          contactInfo: contactInfo.trim() || undefined,
          photo: photoData || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit emergency report.");
      }

      if (contactInfo.trim()) {
        try {
          localStorage.setItem("crisis_contact_phone", contactInfo.trim());
        } catch {}
      }

      setSubmittedIncident(data);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitReportDirect();
  };

  const resetForm = () => {
    cancelCountdown();
    setMode("speak");
    setHasSpoken(false);
    setCategory("FIRE");
    setCoords(null);
    setAddress("");
    setSelectedPeoplePreset(1);
    setExactPeople("");
    setIsExactOpen(false);
    setSelectedTags([]);
    setDescription("");
    setPhotoData(null);
    setSubmitError(null);
    setSubmittedIncident(null);
    setVoiceFilledFields(new Set());
    setUserModified({
      category: false,
      location: false,
      people: false,
      tags: false,
      phone: false,
      description: false,
    });
  };

  const hasLocation = Boolean(coords || (address.trim() && !/\b(?:please|use\s+my|current\s+location|my\s+location)\b/i.test(address.trim())));

  // CONFIRMATION SCREEN
  if (submittedIncident) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 bg-cream">
        <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 sm:p-8 shadow-xl text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-300">
            <Check className="h-8 w-8 stroke-[3]" />
          </div>

          <h2 className="text-2xl font-black text-navy">
            Emergency Report Submitted
          </h2>
          <p className="mt-1 text-sm text-navy/70 font-mono font-bold">
            ID #{submittedIncident.id}
          </p>

          <div className="my-6 flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-cream/70 border border-slate/30">
            <span className="text-xs font-bold text-slate-dark uppercase tracking-wider">
              Assigned Priority Tier
            </span>
            <SeverityBadge severity={submittedIncident.severity} size="lg" />
            {submittedIncident.severityScore !== undefined && (
              <span className="text-xs text-navy/70 mt-1 font-semibold">
                Triage Score: <strong>{submittedIncident.severityScore} pts</strong>
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link
              href="/admin"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-bold text-cream hover:bg-navy-light transition shadow-sm"
            >
              <span>View On Dashboard</span>
              <ExternalLink className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={resetForm}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-burgundy px-4 py-3 text-sm font-bold text-cream hover:bg-burgundy-light transition shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Report Another</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10 pb-28 bg-cream">
      {/* Top Banner / Mode Toggle Header */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-navy tracking-tight">
              Emergency Intake
            </h1>
            <p className="text-xs text-slate-dark font-medium">
              Voice-first rapid response reporting
            </p>
          </div>

          {/* Segmented Mode Toggle */}
          <div className="inline-flex rounded-xl p-1 bg-cardBg border border-slate/40 shadow-sm">
            <button
              type="button"
              onClick={() => {
                cancelCountdown();
                setMode("speak");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === "speak"
                  ? "bg-burgundy text-cream shadow-sm"
                  : "text-navy hover:text-burgundy"
              }`}
            >
              Speak
            </button>
            <button
              type="button"
              onClick={() => {
                cancelCountdown();
                setMode("manual");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === "manual"
                  ? "bg-burgundy text-cream shadow-sm"
                  : "text-navy hover:text-burgundy"
              }`}
            >
              Manual
            </button>
          </div>
        </div>
      </div>

      {/* AUTO-SUBMIT COUNTDOWN BANNER */}
      {countdown !== null && (
        <div className="mb-6 rounded-2xl border-2 border-burgundy bg-burgundy text-cream p-4 shadow-xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cream text-burgundy flex items-center justify-center font-black text-lg shrink-0 shadow-inner">
                {countdown}
              </div>
              <div>
                <p className="font-black text-sm sm:text-base text-cream">
                  Report ready. Submitting in {countdown}...
                </p>
                <p className="text-[11px] text-cream/80 font-medium">
                  Touch any field to pause &amp; edit.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={submitReportDirect}
                className="rounded-xl bg-cream px-3.5 py-2 text-xs font-black text-burgundy hover:bg-cream-light transition shadow-sm"
              >
                Submit now
              </button>
              <button
                type="button"
                onClick={() => {
                  cancelCountdown();
                  setMode("manual");
                }}
                className="rounded-xl border-2 border-cream bg-transparent px-3.5 py-2 text-xs font-bold text-cream hover:bg-cream hover:text-burgundy transition"
              >
                Edit details
              </button>
              <button
                type="button"
                onClick={cancelCountdown}
                className="p-1.5 text-xs text-cream/70 hover:text-cream underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MISSING FIELD NOTICE */}
      {missingFieldNotice && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-bold text-amber-900 flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-black">{missingFieldNotice}</p>
            <p className="text-amber-800 font-medium mt-0.5">
              Please drop a pin on the map or use GPS to confirm incident coordinates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMissingFieldNotice(null)}
            className="text-amber-700 hover:text-amber-900 p-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {submitError && (
        <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-4 flex items-start gap-2.5 text-xs text-red-800 font-bold">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* 3. VOICE-FIRST HERO SECTION (VISUALLY DOMINANT) */}
      <section className="rounded-2xl border border-slate/40 bg-cardBg p-6 sm:p-8 shadow-sm text-center mb-6">
        <div className="flex justify-end mb-2">
          {/* Language Selector */}
          <div className="inline-flex items-center gap-1.5 text-xs">
            <span className="text-slate-dark font-semibold">Lang:</span>
            <select
              value={speechLang}
              onChange={(e) => setSpeechLang(e.target.value)}
              disabled={isListening}
              className="rounded-xl border border-slate/40 bg-cream/80 px-2 py-1 text-xs text-navy font-bold focus:outline-none"
            >
              {SPEECH_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Large Burgundy Mic Button (120px-140px) */}
        <div className="relative inline-flex items-center justify-center my-4">
          {isListening && (
            <div className="absolute inset-0 rounded-full bg-burgundy/30 animate-ping" />
          )}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            aria-label="Toggle voice recording"
            className={`relative flex items-center justify-center w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-burgundy text-cream shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
              isListening ? "pulse-burgundy ring-8 ring-burgundy/30" : ""
            }`}
          >
            {isListening ? (
              <MicOff className="h-14 w-14 text-cream animate-pulse" />
            ) : (
              <Mic className="h-14 w-14 text-cream" />
            )}
          </button>
        </div>

        {/* Heading & State */}
        <h2 className="text-xl sm:text-2xl font-black text-navy mt-2">
          {isListening ? "Listening..." : "Tap and tell us what happened"}
        </h2>

        {/* Example sentence in slate */}
        <p className="mt-2 text-xs sm:text-sm text-slate-dark max-w-md mx-auto leading-relaxed font-medium">
          Try saying: &ldquo;Fire in a building near Tambaram railway station, six people trapped and one is unconscious, my number is 98765 43210&rdquo;
        </p>

        {/* Live transcript in cream box with navy border */}
        {interimText && (
          <div className="mt-4 rounded-2xl bg-cream border-2 border-navy p-4 text-navy font-bold text-sm shadow-inner text-left animate-fadeIn">
            <span className="text-burgundy font-black mr-2">&bull; Hearing:</span>
            {interimText}...
          </div>
        )}

        {speechError && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-300 p-3 text-xs text-amber-900 font-bold">
            {speechError}
          </div>
        )}

        {/* Secondary manual switch link below mic */}
        {mode === "speak" && (
          <div className="mt-6 pt-4 border-t border-slate/20">
            <button
              type="button"
              onClick={() => {
                cancelCountdown();
                setMode("manual");
              }}
              className="text-xs font-bold text-navy hover:text-burgundy underline inline-flex items-center gap-1.5"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Prefer to type? Fill the form manually</span>
            </button>
          </div>
        )}
      </section>

      {/* IN SPEAK MODE: After speaking, show Summary Card */}
      {mode === "speak" && hasSpoken && (
        <section className="rounded-2xl border border-slate/40 bg-cardBg p-5 sm:p-6 shadow-sm mb-6 animate-fadeIn space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-burgundy" />
              <h3 className="text-base font-black text-navy">
                Extracted Incident Dossier
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-burgundy/10 text-burgundy">
              Voice Processed
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-cream/70 p-3 border border-slate/30">
              <span className="text-slate-dark font-bold uppercase tracking-wider text-[10px]">
                Category
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <CategoryIcon category={category} className="h-4 w-4" />
                <span className="font-black text-navy">
                  {formatCategoryName(category)}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-cream/70 p-3 border border-slate/30">
              <span className="text-slate-dark font-bold uppercase tracking-wider text-[10px]">
                Casualties
              </span>
              <p className="font-black text-navy mt-1">
                {getPeopleAffectedCount()} affected
              </p>
            </div>

            <div className="rounded-xl bg-cream/70 p-3 border border-slate/30 col-span-2">
              <span className="text-slate-dark font-bold uppercase tracking-wider text-[10px]">
                Reported Location
              </span>
              <p className="font-bold text-navy mt-1">
                {address || (coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Pending GPS position")}
              </p>
            </div>

            {selectedTags.length > 0 && (
              <div className="rounded-xl bg-cream/70 p-3 border border-slate/30 col-span-2">
                <span className="text-slate-dark font-bold uppercase tracking-wider text-[10px]">
                  Detected Tags
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-navy text-cream"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons for voice summary */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={submitReportDirect}
              disabled={isSubmitting || !category || !hasLocation}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-burgundy px-4 py-3 text-sm font-black text-cream hover:bg-burgundy-light transition shadow-sm disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Submit now</span>
            </button>
            <button
              type="button"
              onClick={() => {
                cancelCountdown();
                setMode("manual");
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-navy px-4 py-3 text-sm font-bold text-navy hover:bg-navy hover:text-cream transition"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit details</span>
            </button>
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate/40 bg-cream/60 px-3 py-3 text-sm font-bold text-navy hover:bg-cream transition"
              title="Speak again"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* MANUAL FORM SECTIONS (Shown in manual mode or when user clicks Edit details) */}
      {mode === "manual" && (
        <form onSubmit={handleManualFormSubmit} className="space-y-6 animate-fadeIn">
          {/* 1. CATEGORY: 6 tiles in 2x3 grid */}
          <section
            className={`rounded-2xl border bg-cardBg p-4 sm:p-5 shadow-sm transition ${
              voiceFilledFields.has("category")
                ? "border-burgundy ring-2 ring-burgundy/20"
                : "border-slate/40"
            }`}
            onClick={cancelCountdown}
          >
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-dark">
                1. Emergency Category <span className="text-burgundy">*</span>
              </label>
              {voiceFilledFields.has("category") && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-burgundy/10 text-burgundy flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Auto-detected
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategorySelect(cat.value)}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? "border-burgundy bg-burgundy text-cream shadow-md font-black"
                        : "border-slate/40 bg-cream/40 hover:bg-cream text-navy font-bold"
                    }`}
                  >
                    <Icon
                      className={`h-7 w-7 mb-1.5 ${
                        isSelected ? "text-cream" : "text-navy"
                      }`}
                    />
                    <span className="text-xs sm:text-sm font-bold leading-tight">
                      {cat.label}
                    </span>
                    {isSelected && (
                      <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-cream" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. LOCATION */}
          <section
            className={`rounded-2xl border bg-cardBg p-4 sm:p-5 shadow-sm space-y-3 transition ${
              !hasLocation && missingFieldNotice
                ? "border-burgundy ring-2 ring-burgundy/20"
                : voiceFilledFields.has("location")
                ? "border-burgundy ring-2 ring-burgundy/10"
                : "border-slate/40"
            }`}
            onClick={cancelCountdown}
          >
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-dark">
                2. Incident Location <span className="text-burgundy">*</span>
              </label>
              {coords && (
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Position Set
                </span>
              )}
            </div>

            {/* Quick GPS Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={locLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-bold text-cream hover:bg-navy-light active:bg-navy-hover transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {locLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                  <span>Acquiring Coordinates &amp; Address...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 text-cream" />
                  <span>Use My Current Location</span>
                </>
              )}
            </button>

            {/* Coordinates Confirmation Chip */}
            {coords && (
              <div className="flex items-center justify-between bg-cream border border-slate/40 rounded-xl px-3.5 py-2 text-xs text-navy font-bold">
                <div className="flex items-center gap-1.5 font-mono">
                  <MapPin className="h-3.5 w-3.5 text-burgundy shrink-0" />
                  <span>
                    {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </span>
                  <span className="text-[10px] text-slate-dark font-sans font-medium">
                    ({locationSource === "geocode" ? "Address Pin" : "GPS Pin"})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMap(!showMap)}
                    className="text-[11px] font-bold underline hover:text-burgundy"
                  >
                    {showMap ? "Hide Map" : "Adjust Pin"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCoords(null);
                      setLocationSource(null);
                    }}
                    className="p-0.5 text-slate-dark hover:text-burgundy"
                    title="Remove coordinates"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {locError && (
              <div className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{locError}</span>
              </div>
            )}

            {/* Leaflet Map Picker */}
            {(showMap || (!coords && locError)) && (
              <div className="pt-2">
                <MapPicker
                  position={coords}
                  onPositionChange={async (pos) => {
                    cancelCountdown();
                    setCoords(pos);
                    setLocationSource("manual");
                    setLocError(null);
                    setMissingFieldNotice(null);

                    const revAddress = await reverseGeocodeCoords(pos.lat, pos.lng);
                    if (revAddress) {
                      setAddress(revAddress);
                    } else {
                      setAddress(`${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
                    }
                  }}
                />
              </div>
            )}

            {/* Address text */}
            <div className="pt-1">
              <input
                type="text"
                placeholder="Address, landmark or intersection (e.g. near Tambaram railway station)"
                value={address}
                onChange={(e) => {
                  cancelCountdown();
                  setUserModified((p) => ({ ...p, location: true }));
                  setAddress(e.target.value);
                }}
                className="w-full rounded-xl border border-slate/40 px-3.5 py-2.5 text-xs text-navy placeholder-slate-dark focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy bg-cream/40 font-medium"
              />
            </div>
          </section>

          {/* 3. PEOPLE AFFECTED */}
          <section
            className={`rounded-2xl border bg-cardBg p-4 sm:p-5 shadow-sm space-y-3 transition ${
              voiceFilledFields.has("people")
                ? "border-burgundy ring-2 ring-burgundy/20"
                : "border-slate/40"
            }`}
            onClick={cancelCountdown}
          >
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-dark">
                3. Number of People Affected
              </label>
              {voiceFilledFields.has("people") && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-burgundy/10 text-burgundy flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Voice filled
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {PEOPLE_PRESETS.map((preset) => {
                const isSelected =
                  !isExactOpen && selectedPeoplePreset === preset.value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      cancelCountdown();
                      setUserModified((p) => ({ ...p, people: true }));
                      setIsExactOpen(false);
                      setSelectedPeoplePreset(preset.value);
                    }}
                    className={`py-3 px-2 rounded-xl border text-center font-bold text-sm transition-all ${
                      isSelected
                        ? "border-navy bg-navy text-cream shadow-sm font-black"
                        : "border-slate/40 bg-cream/40 hover:bg-cream text-navy"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-1 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  cancelCountdown();
                  setIsExactOpen(!isExactOpen);
                }}
                className="text-xs text-navy font-bold hover:text-burgundy underline"
              >
                {isExactOpen ? "Use preset chips" : "Enter exact number instead"}
              </button>
              {isExactOpen && (
                <input
                  type="number"
                  min="0"
                  placeholder="Exact count"
                  value={exactPeople}
                  onChange={(e) => {
                    cancelCountdown();
                    setUserModified((p) => ({ ...p, people: true }));
                    setExactPeople(e.target.value);
                  }}
                  className="w-28 rounded-xl border border-slate/40 px-2.5 py-1 text-xs text-navy focus:outline-none focus:border-burgundy bg-cream font-bold"
                  autoFocus
                />
              )}
            </div>
          </section>

          {/* 4. QUICK TAGS */}
          <section
            className={`rounded-2xl border bg-cardBg p-4 sm:p-5 shadow-sm space-y-2 transition ${
              voiceFilledFields.has("tags")
                ? "border-burgundy ring-2 ring-burgundy/20"
                : "border-slate/40"
            }`}
            onClick={cancelCountdown}
          >
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-dark">
                4. Quick Tags ({formatCategoryName(category)})
              </label>
              <div className="flex items-center gap-2">
                {voiceFilledFields.has("tags") && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-burgundy/10 text-burgundy flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Voice matched
                  </span>
                )}
                <span className="text-[11px] text-slate-dark font-medium">Multi-select</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {CATEGORY_TAGS[category].map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? "border-navy bg-navy text-cream shadow-sm"
                        : "border-slate/40 bg-cream/40 hover:bg-cream text-navy"
                    }`}
                  >
                    {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 5. DESCRIPTION TEXTAREA */}
          <section className="rounded-2xl border border-slate/40 bg-cardBg p-4 sm:p-5 shadow-sm space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-dark">
              5. Incident Details &amp; Transcript
            </label>
            <textarea
              rows={3}
              placeholder="Incident situation notes: specific hazards, trapped persons, injuries..."
              value={description}
              onChange={(e) => {
                cancelCountdown();
                setUserModified((p) => ({ ...p, description: true }));
                setDescription(e.target.value);
              }}
              className="w-full rounded-xl border border-slate/40 p-3 text-xs text-navy placeholder-slate-dark focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy leading-relaxed bg-cream/40 font-medium"
            />
          </section>

          {/* 6. OPTIONAL CONTACT & PHOTO */}
          <section className="rounded-2xl border border-slate/40 bg-cardBg p-4 sm:p-5 shadow-sm space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-dark">
              6. Contact &amp; Photo (Optional)
            </label>

            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-navy shrink-0" />
              <input
                type="tel"
                placeholder="Your phone number (e.g. 9876543210)"
                value={contactInfo}
                onChange={(e) => {
                  cancelCountdown();
                  setUserModified((p) => ({ ...p, phone: true }));
                  setContactInfo(e.target.value);
                }}
                className="flex-1 rounded-xl border border-slate/40 px-3 py-2 text-xs text-navy placeholder-slate-dark focus:outline-none focus:border-burgundy bg-cream/40 font-medium"
              />
            </div>

            <div>
              {photoData ? (
                <div className="relative inline-block border border-slate/40 rounded-2xl overflow-hidden shadow-sm">
                  <img
                    src={photoData}
                    alt="Upload preview"
                    className="h-24 w-auto object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      cancelCountdown();
                      setPhotoData(null);
                    }}
                    className="absolute top-1 right-1 bg-navy/80 text-cream rounded-full p-1 hover:bg-burgundy transition"
                    title="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate px-3.5 py-2 text-xs font-bold text-navy hover:bg-cream cursor-pointer transition">
                  <Camera className="h-4 w-4 text-burgundy" />
                  <span>Add photo from camera / file</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              )}
            </div>
          </section>

          {/* 7. SUBMIT BUTTON: Sticky on mobile */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-cardBg/95 backdrop-blur-md border-t border-slate/30 p-3 sm:static sm:bg-transparent sm:border-0 sm:p-0">
            <div className="max-w-xl mx-auto">
              <button
                type="submit"
                disabled={isSubmitting || !category || !hasLocation}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-burgundy py-4 px-6 text-base font-black text-cream hover:bg-burgundy-light active:bg-burgundy-hover shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Emergency Report...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-5 w-5" />
                    <span>
                      Submit Emergency Report{" "}
                      {!hasLocation ? "(Location required)" : ""}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
