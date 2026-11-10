"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Flame,
  Car,
  HeartPulse,
  Waves,
  Building2,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Check,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import { CategoryType, SeverityType } from "@/lib/severity";
import { SeverityBadge } from "@/components/SeverityBadge";
import { CategoryIcon } from "@/components/CategoryIcon";

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

const CATEGORIES: { value: CategoryType; label: string; icon: any; desc: string }[] = [
  {
    value: "FIRE",
    label: "Fire Emergency",
    icon: Flame,
    desc: "Wildfires, structural fires, gas or chemical fires",
  },
  {
    value: "ROAD_ACCIDENT",
    label: "Road Accident",
    icon: Car,
    desc: "Vehicle collisions, highway pileups, transit accidents",
  },
  {
    value: "MEDICAL",
    label: "Medical Emergency",
    icon: HeartPulse,
    desc: "Mass casualties, cardiac arrest, severe trauma",
  },
  {
    value: "FLOOD",
    label: "Flood",
    icon: Waves,
    desc: "Flash floods, river overflows, storm surges",
  },
  {
    value: "BUILDING_COLLAPSE",
    label: "Building Collapse",
    icon: Building2,
    desc: "Structural failures, earthquake collapses, sinkholes",
  },
  {
    value: "OTHER",
    label: "Other Emergencies",
    icon: AlertTriangle,
    desc: "Power grid failure, environmental hazard, civil unrest",
  },
];

export default function ReportPage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "FIRE" as CategoryType,
    location: "",
    peopleAffected: "0",
    contactInfo: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedIncident, setSubmittedIncident] = useState<SubmittedReport | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Incident title is required.";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Detailed incident description is required.";
    }

    if (!formData.category) {
      newErrors.category = "Please select an emergency category.";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Incident location or address is required.";
    }

    const people = parseInt(formData.peopleAffected, 10);
    if (isNaN(people) || people < 0) {
      newErrors.peopleAffected = "Number of people affected must be a number (0 or greater).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          location: formData.location.trim(),
          peopleAffected: parseInt(formData.peopleAffected, 10) || 0,
          contactInfo: formData.contactInfo.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ submit: data.error || "Failed to submit emergency report." });
        }
        return;
      }

      setSubmittedIncident(data);
    } catch (err: any) {
      setErrors({
        submit: "Network error occurred while submitting the report. Please try again.",
      });
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
    setFormData({
      title: "",
      description: "",
      category: "FIRE",
      location: "",
      peopleAffected: "0",
      contactInfo: "",
    });
    setErrors({});
    setSubmittedIncident(null);
  };

  // SUCCESS SCREEN
  if (submittedIncident) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
          {/* Header */}
          <div className="flex items-center gap-3 text-emerald-600 mb-6">
            <div className="rounded-full bg-emerald-100 p-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Incident Report Submitted
              </h2>
              <p className="text-sm text-slate-500">
                The emergency incident has been logged and queued for first responder dispatch.
              </p>
            </div>
          </div>

          {/* Assigned Severity & ID Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Assigned Severity
              </p>
              <div className="mt-2 flex items-center gap-2">
                <SeverityBadge severity={submittedIncident.severity} size="lg" />
              </div>
              {submittedIncident.severityScore !== undefined && (
                <p className="text-xs text-slate-500 mt-2">
                  Triage Score: <span className="font-semibold text-slate-700">{submittedIncident.severityScore} pts</span>
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Incident ID
              </p>
              <div className="mt-2 flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-sm text-slate-800">
                <span className="truncate">{submittedIncident.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="ml-2 text-slate-400 hover:text-slate-600"
                  title="Copy incident ID"
                >
                  {copiedId ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Keep this ID for status updates &amp; reference.
              </p>
            </div>
          </div>

          {/* Incident Details Summary */}
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white mb-6">
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Title</span>
              <span className="text-sm font-semibold text-slate-900">
                {submittedIncident.title}
              </span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Category</span>
              <div className="flex items-center gap-1.5">
                <CategoryIcon category={submittedIncident.category} className="h-4 w-4" />
                <span className="text-sm font-medium text-slate-800">
                  {CATEGORIES.find((c) => c.value === submittedIncident.category)?.label || submittedIncident.category}
                </span>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Location</span>
              <span className="text-sm text-slate-700">{submittedIncident.location}</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">People Affected</span>
              <span className="text-sm font-semibold text-slate-800">
                {submittedIncident.peopleAffected} individuals
              </span>
            </div>
          </div>

          {/* Severity Calculation Breakdown */}
          {submittedIncident.severityReasons && submittedIncident.severityReasons.length > 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-6">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Severity Score Calculation Logic
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {submittedIncident.severityReasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">&bull;</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/admin"
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition shadow-sm"
            >
              <span>View On Dashboard</span>
              <ExternalLink className="h-4 w-4" />
            </Link>

            <Link
              href={`/admin/incidents/${submittedIncident.id}`}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
            >
              <span>Incident Details</span>
              <ChevronRight className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={resetForm}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Report Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // INCIDENT REPORT FORM
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Breadcrumb / Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" />
          Emergency Intake
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
        <div className="border-b border-slate-100 pb-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Report an Emergency Incident
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Provide precise details regarding the emergency. Reports are scored and classified
            automatically for emergency services dispatch.
          </p>
        </div>

        {errors.submit && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800">{errors.submit}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Incident Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-slate-800 mb-1"
            >
              Incident Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              placeholder="e.g., 3-Alarm Commercial Warehouse Fire with Trapped Workers"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: "" });
              }}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                errors.title
                  ? "border-red-400 focus:ring-red-400 bg-red-50/20"
                  : "border-slate-300 focus:border-red-500 focus:ring-red-500/20"
              }`}
            />
            {errors.title && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Emergency Category */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-semibold text-slate-800 mb-1"
            >
              Emergency Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="category"
                value={formData.category}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    category: e.target.value as CategoryType,
                  });
                  if (errors.category) setErrors({ ...errors, category: "" });
                }}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition cursor-pointer appearance-none pr-10"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} ({cat.desc})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <ChevronRight className="h-4 w-4 rotate-90" />
              </div>
            </div>
            {errors.category && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.category}
              </p>
            )}
          </div>

          {/* Detailed Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-slate-800 mb-1"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Describe what is occurring, hazards present (e.g. trapped individuals, explosion, collapse, spreading fire), and any immediate danger..."
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (errors.description) setErrors({ ...errors, description: "" });
              }}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                errors.description
                  ? "border-red-400 focus:ring-red-400 bg-red-50/20"
                  : "border-slate-300 focus:border-red-500 focus:ring-red-500/20"
              }`}
            />
            {errors.description && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.description}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Tip: Include key factors like people trapped, unconscious, explosions, or hazards for accurate triage scoring.
            </p>
          </div>

          {/* Location & People Affected Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-semibold text-slate-800 mb-1"
              >
                Location / Address <span className="text-red-500">*</span>
              </label>
              <input
                id="location"
                type="text"
                placeholder="e.g., 450 Broadway &amp; 5th Ave, Sector 4"
                value={formData.location}
                onChange={(e) => {
                  setFormData({ ...formData, location: e.target.value });
                  if (errors.location) setErrors({ ...errors, location: "" });
                }}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                  errors.location
                    ? "border-red-400 focus:ring-red-400 bg-red-50/20"
                    : "border-slate-300 focus:border-red-500 focus:ring-red-500/20"
                }`}
              />
              {errors.location && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.location}
                </p>
              )}
            </div>

            {/* People Affected */}
            <div>
              <label
                htmlFor="peopleAffected"
                className="block text-sm font-semibold text-slate-800 mb-1"
              >
                Number of People Affected <span className="text-red-500">*</span>
              </label>
              <input
                id="peopleAffected"
                type="number"
                min="0"
                placeholder="0"
                value={formData.peopleAffected}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    peopleAffected: e.target.value,
                  });
                  if (errors.peopleAffected) setErrors({ ...errors, peopleAffected: "" });
                }}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                  errors.peopleAffected
                    ? "border-red-400 focus:ring-red-400 bg-red-50/20"
                    : "border-slate-300 focus:border-red-500 focus:ring-red-500/20"
                }`}
              />
              {errors.peopleAffected && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.peopleAffected}
                </p>
              )}
            </div>
          </div>

          {/* Contact Information (Optional) */}
          <div>
            <label
              htmlFor="contactInfo"
              className="block text-sm font-semibold text-slate-800 mb-1"
            >
              Contact Information <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              id="contactInfo"
              type="text"
              placeholder="e.g., Officer Davis / 555-0199 or user@agency.gov"
              value={formData.contactInfo}
              onChange={(e) =>
                setFormData({ ...formData, contactInfo: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
            />
            <p className="mt-1 text-xs text-slate-400">
              Reporter name, phone number, or radio callsign if follow-up is needed.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-base font-bold text-white hover:bg-red-700 active:bg-red-800 shadow-md shadow-red-600/30 transition disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Classifying &amp; Submitting Report...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-5 w-5" />
                  <span>Submit Incident Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
