/**
 * Priority Scoring Engine (Pure Function)
 *
 * Calculates dynamic priority score (0-100) and operational triage level (P1 - P4)
 * for emergency incidents at read-time based on 4 criteria:
 * 1. Severity points (LOW: 10, MEDIUM: 25, HIGH: 40, CRITICAL: 50)
 * 2. People affected points (0 -> 0, 1-2 -> 5, 3-9 -> 10, 10-49 -> 18, 50+ -> 25)
 * 3. Waiting points (+1 per 5 minutes since reporting, max 15, ONLY for unresolved incidents)
 * 4. Category base points (BUILDING_COLLAPSE: 10, FIRE: 8, MEDICAL: 8, FLOOD: 7, ROAD_ACCIDENT: 5, OTHER: 2)
 *
 * Priority Levels:
 * - P1: Score >= 75 (Extreme Urgency)
 * - P2: Score 55 - 74 (High Priority)
 * - P3: Score 35 - 54 (Moderate Priority)
 * - P4: Score < 35 (Low / Non-Critical)
 */

export type PriorityLevel = "P1" | "P2" | "P3" | "P4";

export interface PriorityInput {
  severity: string;
  peopleAffected: number;
  category: string;
  createdAt: string | Date;
  status?: string;
}

export interface PriorityResult {
  score: number;
  level: PriorityLevel;
  reasons: string[];
  waitingMinutes: number;
}

export function calculatePriority(input: PriorityInput): PriorityResult {
  const reasons: string[] = [];

  // 1. Severity Points
  let severityPoints = 10;
  const normalizedSeverity = (input.severity || "LOW").toUpperCase();
  switch (normalizedSeverity) {
    case "CRITICAL":
      severityPoints = 50;
      break;
    case "HIGH":
      severityPoints = 40;
      break;
    case "MEDIUM":
      severityPoints = 25;
      break;
    case "LOW":
    default:
      severityPoints = 10;
      break;
  }
  reasons.push(`${normalizedSeverity} severity (+${severityPoints} pts)`);

  // 2. People Affected Points
  const people = Math.max(0, input.peopleAffected || 0);
  let peoplePoints = 0;
  if (people >= 50) {
    peoplePoints = 25;
    reasons.push(`${people} people affected (+25 pts)`);
  } else if (people >= 10) {
    peoplePoints = 18;
    reasons.push(`${people} people affected (+18 pts)`);
  } else if (people >= 3) {
    peoplePoints = 10;
    reasons.push(`${people} people affected (+10 pts)`);
  } else if (people >= 1) {
    peoplePoints = 5;
    reasons.push(`${people} person(s) affected (+5 pts)`);
  } else {
    peoplePoints = 0;
    reasons.push(`0 reported casualties (+0 pts)`);
  }

  // 3. Waiting Points (+1 per 5 mins since reporting, max 15, only for unresolved incidents)
  const isResolved = (input.status || "").toUpperCase() === "RESOLVED";
  const createdTime = new Date(input.createdAt).getTime();
  const now = Date.now();
  const elapsedMinutes = Math.max(0, Math.floor((now - createdTime) / (1000 * 60)));

  let waitingPoints = 0;
  if (!isResolved) {
    waitingPoints = Math.min(15, Math.floor(elapsedMinutes / 5));
    if (waitingPoints > 0) {
      reasons.push(`Waiting ${elapsedMinutes}m (+${waitingPoints} pts)`);
    } else {
      reasons.push(`Waiting <5m (+0 pts)`);
    }
  } else {
    reasons.push(`Incident resolved (waiting time waived)`);
  }

  // 4. Category Points
  const normalizedCategory = (input.category || "OTHER").toUpperCase();
  let categoryPoints = 2;
  switch (normalizedCategory) {
    case "BUILDING_COLLAPSE":
      categoryPoints = 10;
      reasons.push(`Building collapse (+10 pts)`);
      break;
    case "FIRE":
      categoryPoints = 8;
      reasons.push(`Fire emergency (+8 pts)`);
      break;
    case "MEDICAL":
      categoryPoints = 8;
      reasons.push(`Medical emergency (+8 pts)`);
      break;
    case "FLOOD":
      categoryPoints = 7;
      reasons.push(`Flood disaster (+7 pts)`);
      break;
    case "ROAD_ACCIDENT":
      categoryPoints = 5;
      reasons.push(`Road accident (+5 pts)`);
      break;
    case "OTHER":
    default:
      categoryPoints = 2;
      reasons.push(`Other incident (+2 pts)`);
      break;
  }

  const rawScore = severityPoints + peoplePoints + waitingPoints + categoryPoints;
  const score = Math.max(0, Math.min(100, rawScore));

  let level: PriorityLevel = "P4";
  if (score >= 75) {
    level = "P1";
  } else if (score >= 55) {
    level = "P2";
  } else if (score >= 35) {
    level = "P3";
  } else {
    level = "P4";
  }

  return {
    score,
    level,
    reasons,
    waitingMinutes: elapsedMinutes,
  };
}

