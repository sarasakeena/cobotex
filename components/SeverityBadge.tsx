import React from "react";

interface SeverityBadgeProps {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  size?: "sm" | "md" | "lg";
}

export function SeverityBadge({ severity, size = "md" }: SeverityBadgeProps) {
  const normalized = severity?.toUpperCase() || "LOW";

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold",
    md: "px-2.5 py-1 text-xs font-bold tracking-wide",
    lg: "px-3.5 py-1.5 text-sm font-bold tracking-wider",
  }[size];

  switch (normalized) {
    case "CRITICAL":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-800 border border-red-300 shadow-sm ${sizeClasses}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
          </span>
          CRITICAL
        </span>
      );
    case "HIGH":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300 ${sizeClasses}`}
        >
          <span className="inline-block h-2 w-2 rounded-full bg-orange-500"></span>
          HIGH
        </span>
      );
    case "MEDIUM":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 ${sizeClasses}`}
        >
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500"></span>
          MEDIUM
        </span>
      );
    case "LOW":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-800 border border-green-300 ${sizeClasses}`}
        >
          <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
          LOW
        </span>
      );
  }
}

