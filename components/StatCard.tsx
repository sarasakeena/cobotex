import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "critical" | "warning" | "success" | "info";
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
}: StatCardProps) {
  const variantStyles = {
    default: {
      border: "border-slate-200",
      iconBg: "bg-slate-100 text-slate-700",
      valColor: "text-slate-900",
    },
    critical: {
      border: "border-red-200 bg-red-50/50",
      iconBg: "bg-red-100 text-red-600",
      valColor: "text-red-700",
    },
    warning: {
      border: "border-amber-200 bg-amber-50/50",
      iconBg: "bg-amber-100 text-amber-600",
      valColor: "text-amber-700",
    },
    success: {
      border: "border-emerald-200 bg-emerald-50/50",
      iconBg: "bg-emerald-100 text-emerald-600",
      valColor: "text-emerald-700",
    },
    info: {
      border: "border-blue-200 bg-blue-50/50",
      iconBg: "bg-blue-100 text-blue-600",
      valColor: "text-blue-700",
    },
  }[variant];

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${variantStyles.border}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`rounded-lg p-2.5 ${variantStyles.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">
        <h3 className={`text-3xl font-bold tracking-tight ${variantStyles.valColor}`}>
          {value}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

