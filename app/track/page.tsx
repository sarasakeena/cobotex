"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Clock,
  PhoneCall,
  ArrowRight,
  ShieldAlert,
  History,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatCategoryName, CategoryType } from "@/lib/severity";

interface MyReportItem {
  code: string;
  category: string;
  createdAt: string;
}

export default function TrackSearchPage() {
  const router = useRouter();
  const [codeInput, setCodeInput] = useState("");
  const [recentReports, setRecentReports] = useState<MyReportItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("myReports");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentReports(parsed);
        }
      }
    } catch (e) {
      console.error("Could not load reports from localStorage", e);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = codeInput.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg("Please enter a tracking reference code.");
      return;
    }
    setErrorMsg(null);
    router.push(`/track/${encodeURIComponent(cleanCode)}`);
  };

  const handleClearHistory = () => {
    try {
      localStorage.removeItem("myReports");
      setRecentReports([]);
    } catch {}
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin} min ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours} hr ago`;
      return date.toLocaleDateString();
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="min-h-screen bg-cream py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Emergency Callout Card */}
        <div className="rounded-2xl border-2 border-burgundy bg-burgundy/10 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-burgundy text-cream flex items-center justify-center shrink-0">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-burgundy">
                Life-Threatening Emergency?
              </p>
              <p className="text-sm font-bold text-navy">
                In a real emergency call <strong className="text-burgundy">112</strong> immediately
              </p>
            </div>
          </div>
          <a
            href="tel:112"
            className="px-4 py-2 rounded-xl bg-burgundy text-cream font-black text-xs hover:bg-burgundy-light transition shrink-0 shadow-sm"
          >
            Call 112
          </a>
        </div>

        {/* Main Tracking Search Card */}
        <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 sm:p-8 shadow-md space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy/10 text-navy text-[11px] font-bold tracking-wide mb-3">
              <ShieldAlert className="h-3.5 w-3.5 text-burgundy" />
              <span>Public Citizen Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
              Track Your Emergency Report
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-navy/70 font-medium">
              Check real-time response unit status, estimated time of arrival, and on-site updates using your reference code.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label
                htmlFor="trackingCode"
                className="block text-xs font-bold uppercase tracking-wider text-slate-dark mb-1.5"
              >
                Tracking Reference Code
              </label>
              <div className="relative">
                <input
                  id="trackingCode"
                  type="text"
                  placeholder="e.g. ERP-7K8M2X"
                  value={codeInput}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setCodeInput(e.target.value.toUpperCase());
                  }}
                  className="w-full rounded-xl border-2 border-slate/40 px-4 py-3.5 text-base sm:text-lg font-mono font-bold text-navy placeholder-slate focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy bg-cream/40 uppercase tracking-wider"
                />
              </div>
              {errorMsg && (
                <p className="mt-1.5 text-xs font-bold text-rose-600">
                  {errorMsg}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-burgundy py-3.5 px-6 text-sm font-black text-cream hover:bg-burgundy-light active:bg-burgundy-hover transition shadow-md cursor-pointer"
            >
              <Search className="h-4 w-4" />
              <span>Track Report Status</span>
            </button>
          </form>
        </div>

        {/* Recent Reports from LocalStorage */}
        <div className="rounded-2xl border border-slate/40 bg-cardBg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-dark">
              <History className="h-4 w-4 text-navy" />
              <span>My Recent Reports ({recentReports.length})</span>
            </div>
            {recentReports.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-[11px] font-bold text-slate hover:text-burgundy transition flex items-center gap-1"
                title="Clear browser history"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {recentReports.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate/30 rounded-xl bg-cream/30">
              <p className="text-xs text-navy/60 font-medium">
                No recent reports saved in this browser.
              </p>
              <Link
                href="/report"
                className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-burgundy hover:underline"
              >
                <span>Submit a new emergency report</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentReports.map((item) => (
                <Link
                  key={item.code}
                  href={`/track/${item.code}`}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate/30 bg-cream/40 hover:bg-cream hover:border-burgundy/40 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-navy/10 text-navy group-hover:bg-burgundy group-hover:text-cream transition">
                      <CategoryIcon category={item.category as CategoryType} className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-mono text-sm font-black text-navy group-hover:text-burgundy transition">
                        {item.code}
                      </div>
                      <div className="text-[11px] text-slate-dark font-medium flex items-center gap-2">
                        <span>{formatCategoryName(item.category)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate group-hover:text-burgundy transition transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer Link back */}
        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs font-bold text-slate-dark hover:text-navy transition"
          >
            ← Return to CRISISPULSE Home
          </Link>
        </div>
      </div>
    </div>
  );
}

