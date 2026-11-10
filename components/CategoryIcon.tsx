import React from "react";
import {
  Flame,
  Car,
  HeartPulse,
  Waves,
  Building2,
  AlertTriangle,
} from "lucide-react";

interface CategoryIconProps {
  category: string;
  className?: string;
  size?: number;
}

export function CategoryIcon({
  category,
  className = "w-5 h-5",
  size,
}: CategoryIconProps) {
  switch (category) {
    case "FIRE":
      return <Flame className={`text-orange-500 ${className}`} size={size} />;
    case "ROAD_ACCIDENT":
      return <Car className={`text-amber-600 ${className}`} size={size} />;
    case "MEDICAL":
      return <HeartPulse className={`text-rose-500 ${className}`} size={size} />;
    case "FLOOD":
      return <Waves className={`text-blue-500 ${className}`} size={size} />;
    case "BUILDING_COLLAPSE":
      return <Building2 className={`text-purple-600 ${className}`} size={size} />;
    case "OTHER":
    default:
      return <AlertTriangle className={`text-slate-500 ${className}`} size={size} />;
  }
}
