export type CategoryType =
  | "FIRE"
  | "ROAD_ACCIDENT"
  | "MEDICAL"
  | "FLOOD"
  | "BUILDING_COLLAPSE"
  | "OTHER";

export type SeverityType = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SeverityResult {
  severity: SeverityType;
  score: number;
  reasons: string[];
}

/**
 * Keywords in incident title or description that trigger an escalation boost.
 * Case-insensitive, each unique match adds +1 to the severity score (capped at +3).
 */
export const CRITICAL_KEYWORDS: readonly string[] = [
  "trapped",
  "unconscious",
  "explosion",
  "fatal",
  "dead",
  "death",
  "bleeding",
  "children",
  "collapsed",
  "spreading",
  "gas leak",
] as const;

/**
 * Base score contribution for each emergency category.
 * - Building Collapse: 4
 * - Fire: 3
 * - Medical: 3
 * - Flood: 3
 * - Road Accident: 2
 * - Other: 1
 */
export const CATEGORY_BASE_SCORES: Record<CategoryType, number> = {
  BUILDING_COLLAPSE: 4,
  FIRE: 3,
  MEDICAL: 3,
  FLOOD: 3,
  ROAD_ACCIDENT: 2,
  OTHER: 1,
};

/**
 * Pure function to calculate incident severity based on:
 * 1. Category base score
 * 2. Number of people affected
 * 3. High-risk keyword boost found in title & description
 *
 * Mapping:
 * - Score <= 3: LOW
 * - Score 4 - 5: MEDIUM
 * - Score 6 - 7: HIGH
 * - Score >= 8: CRITICAL
 *
 * @param category - The emergency category
 * @param peopleAffected - Number of individuals affected (min 0)
 * @param title - Incident title
 * @param description - Incident detailed description
 * @returns {SeverityResult} Calculated severity, total score, and explanatory reasons
 */
export function calculateSeverity(
  category: CategoryType | string,
  peopleAffected: number,
  title: string = "",
  description: string = ""
): SeverityResult {
  const reasons: string[] = [];

  // 1. Category Base Score
  const normalizedCategory = (category || "OTHER") as CategoryType;
  const categoryBase = CATEGORY_BASE_SCORES[normalizedCategory] ?? 1;
  reasons.push(
    `Category base score for ${formatCategoryName(normalizedCategory)}: +${categoryBase}`
  );

  // 2. People Affected Score
  let peopleScore = 0;
  const count = Math.max(0, Math.floor(peopleAffected || 0));

  if (count === 0) {
    peopleScore = 0;
    reasons.push(`People affected (0): +0`);
  } else if (count >= 1 && count <= 2) {
    peopleScore = 1;
    reasons.push(`People affected (1–2): +1 (${count} reported)`);
  } else if (count >= 3 && count <= 9) {
    peopleScore = 2;
    reasons.push(`People affected (3–9): +2 (${count} reported)`);
  } else if (count >= 10 && count <= 49) {
    peopleScore = 3;
    reasons.push(`People affected (10–49): +3 (${count} reported)`);
  } else {
    // 50+
    peopleScore = 4;
    reasons.push(`People affected (50+): +4 (${count} reported)`);
  }

  // 3. Keyword Boost (+1 per detected unique keyword, capped at +3)
  const combinedText = `${title} ${description}`.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const keyword of CRITICAL_KEYWORDS) {
    // Escape keyword regex pattern and check for word boundary
    const pattern = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (pattern.test(combinedText)) {
      matchedKeywords.push(keyword);
    }
  }

  const rawKeywordCount = matchedKeywords.length;
  const keywordScore = Math.min(3, rawKeywordCount);

  if (rawKeywordCount > 0) {
    if (rawKeywordCount > 3) {
      reasons.push(
        `Critical keywords detected (${matchedKeywords.join(", ")}): +${keywordScore} (capped at +3)`
      );
    } else {
      reasons.push(
        `Critical keywords detected (${matchedKeywords.join(", ")}): +${keywordScore}`
      );
    }
  } else {
    reasons.push(`No critical escalation keywords detected: +0`);
  }

  // Total Score Calculation
  const totalScore = categoryBase + peopleScore + keywordScore;

  // Severity Tier Mapping
  let severity: SeverityType;
  if (totalScore <= 3) {
    severity = "LOW";
  } else if (totalScore <= 5) {
    severity = "MEDIUM";
  } else if (totalScore <= 7) {
    severity = "HIGH";
  } else {
    severity = "CRITICAL";
  }

  reasons.push(`Total severity score: ${totalScore} → Assigned Severity: ${severity}`);

  return {
    severity,
    score: totalScore,
    reasons,
  };
}

/**
 * Formats enum category string into human readable title
 */
export function formatCategoryName(category: CategoryType | string): string {
  switch (category) {
    case "FIRE":
      return "Fire Emergency";
    case "ROAD_ACCIDENT":
      return "Road Accident";
    case "MEDICAL":
      return "Medical Emergency";
    case "FLOOD":
      return "Flood";
    case "BUILDING_COLLAPSE":
      return "Building Collapse";
    case "OTHER":
    default:
      return "Other Emergencies";
  }
}
