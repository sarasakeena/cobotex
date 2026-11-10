import React from "react";

interface StatusBadgeProps {
  status: "REPORTED" | "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | string;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const normalized = status?.toUpperCase() || "REPORTED";

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold",
    md: "px-2.5 py-1 text-xs font-bold",
    lg: "px-3 py-1.5 text-sm font-bold",
  }[size];

  switch (normalized) {
    case "PENDING":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-300 ${sizeClasses}`}
        >
          Pending
        </span>
      );
    case "ASSIGNED":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-purple-100 text-purple-900 border border-purple-300 ${sizeClasses}`}
        >
          Assigned
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-blue-100 text-blue-900 border border-blue-300 ${sizeClasses}`}
        >
          In Progress
        </span>
      );
    case "RESOLVED":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 ${sizeClasses}`}
        >
          Resolved
        </span>
      );
    case "REPORTED":
    default:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses}`}
        >
          Reported
        </span>
      );
  }
}
