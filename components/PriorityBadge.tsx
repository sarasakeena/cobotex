import React from "react";
import { PriorityLevel } from "@/lib/priority";

interface PriorityBadgeProps {
  level: PriorityLevel | string;
  score?: number;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PriorityBadge({
  level,
  score,
  showScore = false,
  size = "md",
}: PriorityBadgeProps) {
  const norm = (level || "P4").toUpperCase();

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] font-extrabold",
    md: "px-2.5 py-0.5 text-xs font-black tracking-wide",
    lg: "px-3 py-1 text-sm font-black tracking-wide",
  }[size];

  let colorClasses = "bg-slate/20 text-navy border-slate/40";
  let label = "P4 Low";

  switch (norm) {
    case "P1":
      colorClasses =
        "bg-red-600 text-white border-red-700 shadow-sm animate-pulse";
      label = "P1 Critical";
      break;
    case "P2":
      colorClasses = "bg-orange-500 text-white border-orange-600 shadow-sm";
      label = "P2 High";
      break;
    case "P3":
      colorClasses = "bg-amber-400 text-amber-950 border-amber-500";
      label = "P3 Medium";
      break;
    case "P4":
    default:
      colorClasses = "bg-slate-200 text-slate-800 border-slate-300";
      label = "P4 Normal";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border uppercase ${colorClasses} ${sizeClasses}`}
    >
      <span>{norm}</span>
      {showScore && typeof score === "number" && (
        <span className="opacity-90 font-mono text-[10px]">({score})</span>
      )}
    </span>
  );
}

