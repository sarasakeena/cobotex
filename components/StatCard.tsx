import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?:
    | "default"
    | "critical"
    | "warning"
    | "success"
    | "info"
    | "resolved"
    | "pending";
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
}: StatCardProps) {
  const isCritical = variant === "critical";
  const isSuccess = variant === "success" || variant === "resolved";
  const isWarning = variant === "warning" || variant === "pending";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-cardBg p-5 shadow-sm transition hover:shadow-md ${isCritical ? "border-red-300 ring-1 ring-red-200" : "border-slate/40"
        }`}
    >
      {/* Burgundy or semantic accent bar at top */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 ${
          isCritical
            ? "bg-red-600"
            : isSuccess
            ? "bg-emerald-600"
            : isWarning
            ? "bg-amber-500"
            : "bg-burgundy"
        }`}
      />

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-dark">
          {title}
        </p>
        <div
          className={`rounded-xl p-2.5 ${isCritical
              ? "bg-red-100 text-red-700"
              : isSuccess
              ? "bg-emerald-100 text-emerald-800"
              : isWarning
              ? "bg-amber-100 text-amber-800"
              : "bg-navy/5 text-navy"
            }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">
        <h3
          className={`text-3xl font-black tracking-tight ${isCritical ? "text-red-700" : "text-navy"
            }`}
        >
          {value}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-navy/70 font-semibold">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
