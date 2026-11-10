/**
 * Location-based Response Team Assignment Engine (Pure Function)
 *
 * Implements:
 * 1. Haversine distance formula between GPS coordinates (in km).
 * 2. Suitable team categories per incident category with operational priority order.
 * 3. rankTeams: filters AVAILABLE and suitable teams, computes fit score with 2km penalty
 *    per step down the suitability list, calculates ETA at 40 km/h, and sorts best first.
 */

export interface TeamLike {
  id: string;
  code: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  status: string; // AVAILABLE | BUSY
  currentIncidentId?: string | null;
  memberCount?: number;
}

export interface IncidentLocationLike {
  category: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RankedCandidate {
  team: TeamLike;
  distanceKm: number;
  etaMinutes: number;
  fitScore: number;
  suitabilityRank: number; // 0-based index in suitability list
  penaltyKm: number;
}

/**
 * Incident category to suitable team categories mapping (in preference order).
 */
export const SUITABLE_TEAM_CATEGORIES: Record<string, string[]> = {
  FIRE: ["FIRE", "RESCUE"],
  ROAD_ACCIDENT: ["MEDICAL", "POLICE", "RESCUE"],
  MEDICAL: ["MEDICAL"],
  FLOOD: ["DISASTER", "RESCUE"],
  BUILDING_COLLAPSE: ["RESCUE", "FIRE", "MEDICAL"],
  OTHER: ["RESCUE", "POLICE", "FIRE", "MEDICAL", "DISASTER"],
};

/**
 * Calculates great-circle distance between two GPS coordinates using Haversine formula (in km).
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Round to 2 decimal places
  return Math.round(distance * 100) / 100;
}

/**
 * Estimates travel time in minutes assuming average emergency transit speed of 40 km/h.
 * Rounded up to nearest minute, minimum 1 minute.
 */
export function calculateEtaMinutes(distanceKm: number): number {
  if (distanceKm <= 0) return 1;
  const minutes = (distanceKm / 40) * 60;
  return Math.max(1, Math.ceil(minutes));
}

/**
 * Ranks available and suitable teams for an incident.
 * Lowest fit score is best.
 * Fit score = distanceKm + 2 km penalty per step down the suitability list.
 */
export function rankTeams(
  incident: IncidentLocationLike,
  teams: TeamLike[]
): RankedCandidate[] {
  if (
    typeof incident.latitude !== "number" ||
    typeof incident.longitude !== "number" ||
    isNaN(incident.latitude) ||
    isNaN(incident.longitude)
  ) {
    return [];
  }

  const normalizedCategory = (incident.category || "OTHER").toUpperCase();
  const suitableCategories =
    SUITABLE_TEAM_CATEGORIES[normalizedCategory] ||
    SUITABLE_TEAM_CATEGORIES["OTHER"];

  // Filter only AVAILABLE and suitable teams
  const availableSuitable = teams.filter((team) => {
    const isAvailable = (team.status || "").toUpperCase() === "AVAILABLE";
    const teamCat = (team.category || "").toUpperCase();
    return isAvailable && suitableCategories.includes(teamCat);
  });

  const ranked: RankedCandidate[] = availableSuitable.map((team) => {
    const distanceKm = haversine(
      incident.latitude!,
      incident.longitude!,
      team.latitude,
      team.longitude
    );

    const teamCat = (team.category || "").toUpperCase();
    const suitabilityRank = suitableCategories.indexOf(teamCat);
    const penaltyKm = suitabilityRank * 2; // 2 km penalty per step down
    const fitScore = Math.round((distanceKm + penaltyKm) * 100) / 100;
    const etaMinutes = calculateEtaMinutes(distanceKm);

    return {
      team,
      distanceKm,
      etaMinutes,
      fitScore,
      suitabilityRank,
      penaltyKm,
    };
  });

  // Sort by fit score ascending (lowest score is best)
  return ranked.sort((a, b) => a.fitScore - b.fitScore);
}

