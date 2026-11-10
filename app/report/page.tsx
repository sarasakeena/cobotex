"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Copy,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  X,
  Camera,
  Image as ImageIcon,
  AlertCircle,
  Phone,
  Volume2,
} from "lucide-react";
import { CategoryType, SeverityType, formatCategoryName } from "@/lib/severity";
import { SeverityBadge } from "@/components/SeverityBadge";

// Dynamically import Leaflet Map Picker without SSR
const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-300 text-slate-400 text-sm">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading map interface...</span>
      </div>
    </div>
  ),
});

const CATEGORIES: {
  value: CategoryType;
  label: string;
  icon: any;
  colorClass: string;
}[] = [
  {
    value: "FIRE",
    label: "Fire Emergency",
    icon: Flame,
    colorClass: "hover:border-orange-500 text-orange-600 bg-orange-50/50",
  },
  {
    value: "ROAD_ACCIDENT",
    label: "Road Accident",
    icon: Car,
    colorClass: "hover:border-amber-500 text-amber-600 bg-amber-50/50",
  },
  {
    value: "MEDICAL",
    label: "Medical Emergency",
    icon: HeartPulse,
    colorClass: "hover:border-rose-500 text-rose-600 bg-rose-50/50",
  },
  {
    value: "FLOOD",
    label: "Flood",
    icon: Waves,
    colorClass: "hover:border-blue-500 text-blue-600 bg-blue-50/50",
  },
  {
    value: "BUILDING_COLLAPSE",
    label: "Building Collapse",
    icon: Building2,
    colorClass: "hover:border-purple-500 text-purple-600 bg-purple-50/50",
  },
  {
    value: "OTHER",
    label: "Other Emergencies",
    icon: AlertTriangle,
    colorClass: "hover:border-slate-500 text-slate-600 bg-slate-50/50",
  },
];

const CATEGORY_TAGS: Record<CategoryType, string[]> = {
  FIRE: ["Trapped inside", "Spreading", "Explosion risk", "Smoke"],
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
  // 1. Category (single select)
  const [category, setCategory] = useState<CategoryType>("FIRE");

  // 2. Location
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  // 3. People Affected
  const [selectedPeoplePreset, setSelectedPeoplePreset] = useState<number | null>(1);
  const [exactPeople, setExactPeople] = useState<string>("");
  const [isExactOpen, setIsExactOpen] = useState(false);

  // 4. Quick Tags (multi-select, reset on category change)
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 5. Voice & Description
  const [description, setDescription] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [speechLang, setSpeechLang] = useState("en-IN");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // 6. Contact
  const [contactInfo, setContactInfo] = useState("");

  // 7. Optional Photo
  const [photoData, setPhotoData] = useState<string | null>(null);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedIncident, setSubmittedIncident] = useState<SubmittedReport | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Load saved contact on mount
  useEffect(() => {
    try {
      const savedPhone = localStorage.getItem("crisis_contact_phone");
      if (savedPhone) {
        setContactInfo(savedPhone);
      }
    } catch {}
  }, []);

  // Category switch handler: resets tags
  const handleCategorySelect = (newCat: CategoryType) => {
    setCategory(newCat);
    setSelectedTags([]);
  };

  // Tag toggle handler
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Location via Geolocation API
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      setShowMap(true);
      return;
    }

    setLocLoading(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocLoading(false);
        setLocError(null);
      },
      (error) => {
        setLocLoading(false);
        let msg = "Could not fetch GPS location. Please tap pin on map.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission denied. Use map to tap your location.";
        } else if (error.code === error.TIMEOUT) {
          msg = "GPS location request timed out. Use map to tap your location.";
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
  };

  // Speech Recognition (Web Speech API)
  const toggleSpeechRecognition = () => {
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
          setDescription((prev) => (prev ? `${prev.trim()} ${finalStr.trim()}` : finalStr.trim()));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setSpeechError("Microphone access denied. Please type in description box.");
        } else if (event.error === "no-speech") {
          // ignore silent pause
        } else {
          setSpeechError(`Voice error (${event.error}). Please type description.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText("");
      };

      recognition.start();
    } catch (err: any) {
      setSpeechError("Could not start voice recognition. Please type your description.");
      setIsListening(false);
    }
  };

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Location validity
  const hasLocation = Boolean(coords || address.trim());

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !hasLocation) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const peopleCount = getPeopleAffectedCount();

    // Auto-generate Title on submit: "<Category label> reported" + " - <address>" if address exists
    const categoryLabel = formatCategoryName(category);
    const autoTitle = address.trim()
      ? `${categoryLabel} reported - ${address.trim()}`
      : `${categoryLabel} reported`;

    // Auto-generate Description: voice/typed text if present; otherwise built from selections
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
          address: address.trim() || undefined,
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

      // Save contact to localStorage if provided
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

  const handleCopyId = () => {
    if (submittedIncident) {
      navigator.clipboard.writeText(submittedIncident.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const resetForm = () => {
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
  };

  // 4. AFTER SUBMIT CONFIRMATION SCREEN
  if (submittedIncident) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 stroke-[3]" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900">
            Emergency Report Submitted
          </h2>
          <p className="mt-1 text-sm text-slate-500 font-mono">
            ID #{submittedIncident.id}
          </p>

          <div className="my-6 flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Assigned Priority
            </span>
            <SeverityBadge severity={submittedIncident.severity} size="lg" />
            {submittedIncident.severityScore !== undefined && (
              <span className="text-xs text-slate-500 mt-1">
                Triage Score: <strong>{submittedIncident.severityScore} pts</strong>
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link
              href="/admin"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              <span>View On Dashboard</span>
              <ExternalLink className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={resetForm}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Report Another</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FAST, TAP-FIRST, VOICE-ENABLED FORM
  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10 pb-28">
      {/* Top Banner */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Fast Emergency Intake</span>
          </h1>
          <p className="text-xs text-slate-500">
            Tap-first triage. 1-tap geolocation and voice transcript enabled.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
          <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
          ACTIVE
        </span>
      </div>

      {submitError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-2.5 text-xs text-red-800 font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. CATEGORY: 6 large icon tiles in a 2x3 grid */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            1. Select Emergency Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => handleCategorySelect(cat.value)}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 text-center transition-all ${
                    isSelected
                      ? "border-red-600 bg-red-50/80 shadow-md ring-2 ring-red-500/20 text-slate-900 font-bold"
                      : "border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <Icon
                    className={`h-7 w-7 mb-1.5 ${
                      isSelected ? "text-red-600" : "text-slate-500"
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-bold leading-tight">
                    {cat.label}
                  </span>
                  {isSelected && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. LOCATION */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Incident Location <span className="text-red-500">*</span>
            </label>
            {coords && (
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> GPS Pin Set
              </span>
            )}
          </div>

          {/* Quick GPS Button */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={locLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 active:bg-slate-950 transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {locLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Acquiring GPS Position...</span>
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 text-red-400" />
                <span>Use My Current Location</span>
              </>
            )}
          </button>

          {/* Confirmation Chip if coordinates acquired */}
          {coords && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-xs text-emerald-800">
              <div className="flex items-center gap-1.5 font-mono">
                <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </span>
                <span className="text-[10px] text-emerald-600 font-sans">
                  (GPS Confirmed)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="text-[11px] font-bold underline hover:text-emerald-900 ml-2"
              >
                {showMap ? "Hide Map" : "Adjust Pin"}
              </button>
            </div>
          )}

          {locError && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{locError}</span>
            </div>
          )}

          {/* Leaflet Map Picker fallback or user triggered */}
          {(showMap || (!coords && locError)) && (
            <div className="pt-2">
              <MapPicker
                position={coords}
                onPositionChange={(pos) => {
                  setCoords(pos);
                  setLocError(null);
                }}
              />
            </div>
          )}

          {/* Optional Short Text Address / Landmark */}
          <div className="pt-1">
            <input
              type="text"
              placeholder="Address, landmark or intersection (e.g. 5th Ave Gate, Sector 4)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
        </section>

        {/* 3. PEOPLE AFFECTED */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            3. Number of People Affected
          </label>

          <div className="grid grid-cols-4 gap-2">
            {PEOPLE_PRESETS.map((preset) => {
              const isSelected =
                !isExactOpen && selectedPeoplePreset === preset.value;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setIsExactOpen(false);
                    setSelectedPeoplePreset(preset.value);
                  }}
                  className={`py-3 px-2 rounded-xl border text-center font-bold text-sm transition-all ${
                    isSelected
                      ? "border-red-600 bg-red-600 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
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
              onClick={() => setIsExactOpen(!isExactOpen)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
            >
              {isExactOpen ? "Use preset chips" : "Enter exact number instead"}
            </button>
            {isExactOpen && (
              <input
                type="number"
                min="0"
                placeholder="Exact count"
                value={exactPeople}
                onChange={(e) => setExactPeople(e.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                autoFocus
              />
            )}
          </div>
        </section>

        {/* 4. QUICK TAGS (multi-select, resets with category) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              4. Quick Tags ({formatCategoryName(category)})
            </label>
            <span className="text-[11px] text-slate-400">Multi-select</span>
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
                      ? "border-red-600 bg-red-600 text-white shadow-sm"
                      : "border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                </button>
              );
            })}
          </div>
        </section>

        {/* 5. VOICE MESSAGE + EDITABLE DESCRIPTION */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              5. Voice Message &amp; Details
            </label>

            {/* Language Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Lang:</span>
              <select
                value={speechLang}
                onChange={(e) => setSpeechLang(e.target.value)}
                disabled={isListening}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none"
              >
                {SPEECH_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Big Mic Button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`w-full flex items-center justify-center gap-3 rounded-2xl py-4 px-4 font-bold text-sm transition-all shadow-sm ${
              isListening
                ? "bg-red-600 text-white ring-4 ring-red-400/40 animate-pulse"
                : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="h-5 w-5" />
                <span>Listening... Tap again to stop</span>
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 text-red-600" />
                <span>Tap and describe the emergency</span>
              </>
            )}
          </button>

          {interimText && (
            <p className="text-xs text-red-600 italic bg-red-50/50 p-2 rounded-lg border border-red-100">
              {interimText}...
            </p>
          )}

          {speechError && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
              {speechError}
            </p>
          )}

          {/* Editable Description Textarea */}
          <textarea
            rows={3}
            placeholder="Transcript or typed notes: specific hazards, trapped persons, injuries, gas leaks..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 leading-relaxed"
          />
        </section>

        {/* 6. OPTIONAL CONTACT & PHOTO */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            6. Contact &amp; Photo (Optional)
          </label>

          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="tel"
              placeholder="Your phone number (optional)"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Photo attachment */}
          <div>
            {photoData ? (
              <div className="relative inline-block border rounded-xl overflow-hidden shadow-sm">
                <img
                  src={photoData}
                  alt="Upload preview"
                  className="h-24 w-auto object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoData(null)}
                  className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full p-1 hover:bg-red-600 transition"
                  title="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition">
                <Camera className="h-4 w-4 text-slate-500" />
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

        {/* 7. SUBMIT: Sticky at bottom on mobile */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:static sm:bg-transparent sm:border-0 sm:p-0">
          <div className="max-w-xl mx-auto">
            <button
              type="submit"
              disabled={isSubmitting || !category || !hasLocation}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-red-600 py-4 px-6 text-base font-extrabold text-white hover:bg-red-700 active:bg-red-800 shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
    </div>
  );
}
