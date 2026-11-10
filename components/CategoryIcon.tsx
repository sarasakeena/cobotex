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
  size?: number | "sm" | "md" | "lg";
}

export function CategoryIcon({
  category,
  className = "",
  size = "md",
}: CategoryIconProps) {
  let pixelSize: number | undefined;
  let defaultClass = "w-5 h-5";

  if (typeof size === "number") {
    pixelSize = size;
    defaultClass = "";
  } else if (size === "sm") {
    pixelSize = 16;
    defaultClass = "w-4 h-4";
  } else if (size === "lg") {
    pixelSize = 24;
    defaultClass = "w-6 h-6";
  } else {
    pixelSize = 20;
    defaultClass = "w-5 h-5";
  }

  const finalClass = `${defaultClass} ${className}`.trim();

  switch (category) {
    case "FIRE":
      return <Flame className={`text-orange-500 ${finalClass}`} size={pixelSize} />;
    case "ROAD_ACCIDENT":
      return <Car className={`text-amber-600 ${finalClass}`} size={pixelSize} />;
    case "MEDICAL":
      return <HeartPulse className={`text-rose-500 ${finalClass}`} size={pixelSize} />;
    case "FLOOD":
      return <Waves className={`text-blue-500 ${finalClass}`} size={pixelSize} />;
    case "BUILDING_COLLAPSE":
      return <Building2 className={`text-purple-600 ${finalClass}`} size={pixelSize} />;
    case "OTHER":
    default:
      return <AlertTriangle className={`text-slate-500 ${finalClass}`} size={pixelSize} />;
  }
}
