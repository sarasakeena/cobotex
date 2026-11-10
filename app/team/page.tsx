"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Siren, Shield, KeyRound, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

export default function TeamLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("FIRE-01");
  const [pin, setPin] = useState("1234");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsLoading(true);
      const res = await fetch("/api/team/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/team/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid team credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-burgundy flex items-center justify-center text-cream shadow-xl border border-burgundy-light">
            <Shield className="h-8 w-8 animate-pulse" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-black text-navy tracking-tight">
          Field Response Unit Portal
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-navy/70 font-semibold">
          CRISIS<span className="text-burgundy">PULSE</span> Tactical Mobile Dispatch
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-cardBg py-8 px-6 shadow-xl rounded-2xl border border-slate/40 sm:px-10 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-navy mb-1.5">
                Unit Call-Sign / Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. FIRE-01, RESCUE-01"
                className="w-full rounded-xl border border-slate/40 bg-cream px-3.5 py-2.5 text-sm font-bold text-navy uppercase placeholder:text-slate focus:border-burgundy focus:outline-none focus:ring-1 focus:ring-burgundy"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-navy">
                  Security PIN
                </label>
                <span className="text-[11px] font-black text-burgundy bg-burgundy/10 px-2 py-0.5 rounded-md border border-burgundy/20">
                  Demo PIN: 1234
                </span>
              </div>
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 4-digit PIN"
                className="w-full rounded-xl border border-slate/40 bg-cream px-3.5 py-2.5 text-sm font-bold text-navy placeholder:text-slate focus:border-burgundy focus:outline-none focus:ring-1 focus:ring-burgundy"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-burgundy text-cream text-sm font-black hover:bg-burgundy-light active:bg-burgundy-hover transition shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-cream border-t-transparent" />
                  <span>Authenticating Unit...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Mobile Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-slate/30">
            <span className="text-[11px] font-extrabold text-slate-dark uppercase tracking-wider block mb-2">
              Quick Select Demo Units:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              {["FIRE-01", "FIRE-02", "RESCUE-01", "MEDICAL-01"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCode(c);
                    setPin("1234");
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-cream hover:bg-slate-200 text-navy border border-slate/40 text-left transition"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/admin"
            className="text-xs font-bold text-navy/70 hover:text-burgundy transition"
          >
            &larr; Return to Admin Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}

