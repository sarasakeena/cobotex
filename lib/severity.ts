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

export interface SeverityInput {
  category: CategoryType | string;
  peopleAffected: number;
  tags?: string[];
  description?: string;
  title?: string;
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
 * Pure function to calculate incident severity.
 * Supports both object input { category, peopleAffected, tags, description, title }
 * and legacy positional arguments (category, peopleAffected, title, description, tags).
 *
 * Scoring Formula:
 * Score = category base + people affected + keyword/tag boost (capped at +3).
 *
 * Mapping:
 * - Score <= 3: LOW
 * - Score 4 - 5: MEDIUM
 * - Score 6 - 7: HIGH
 * - Score >= 8: CRITICAL
 */
export function calculateSeverity(
  inputOrCategory: SeverityInput | CategoryType | string,
  maybePeopleAffected?: number,
  maybeTitle?: string,
  maybeDescription?: string,
  maybeTags?: string[]
): SeverityResult {
  let category: CategoryType | string;
  let peopleAffected: number;
  let title = "";
  let description = "";
  let tags: string[] = [];

  // Parse whether input was passed as an object or positional arguments
  if (typeof inputOrCategory === "object" && inputOrCategory !== null) {
    category = inputOrCategory.category;
    peopleAffected = inputOrCategory.peopleAffected;
    title = inputOrCategory.title || "";
    description = inputOrCategory.description || "";
    tags = inputOrCategory.tags || [];
  } else {
    category = inputOrCategory;
    peopleAffected = maybePeopleAffected ?? 0;
    title = maybeTitle || "";
    description = maybeDescription || "";
    tags = maybeTags || [];
  }

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

  // 3. Keyword & Tag Boost (+1 each, capped at +3, no double counting)
  const combinedText = `${title} ${description}`.toLowerCase();
  const matchedWords = new Set<string>();
  const escalationItems: { text: string; points: number }[] = [];

  // First process selected tags as keyword matches (+1 each)
  for (const tag of tags) {
    const cleanTag = tag.trim();
    if (!cleanTag) continue;
    const lowerTag = cleanTag.toLowerCase();

    // Check if tag maps to any known critical keyword
    let foundKeyword: string | null = null;
    for (const kw of CRITICAL_KEYWORDS) {
      if (lowerTag.includes(kw)) {
        foundKeyword = kw;
        break;
      }
    }

    const key = foundKeyword || lowerTag;
    if (!matchedWords.has(key)) {
      matchedWords.add(key);
      escalationItems.push({ text: `Tag '${cleanTag}' (+1)`, points: 1 });
    }
  }

  // Next check remaining critical keywords in title and description (without double-counting)
  for (const keyword of CRITICAL_KEYWORDS) {
    if (matchedWords.has(keyword)) continue;

    const pattern = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (pattern.test(combinedText)) {
      matchedWords.add(keyword);
      escalationItems.push({
        text: `Keyword '${keyword}' in description/title (+1)`,
        points: 1,
      });
    }
  }

  const rawBoostCount = escalationItems.length;
  const keywordScore = Math.min(3, rawBoostCount);

  if (rawBoostCount > 0) {
    for (const item of escalationItems) {
      reasons.push(item.text);
    }
    if (rawBoostCount > 3) {
      reasons.push(`Total keyword & tag boost capped at +3 (from ${rawBoostCount} detected)`);
    }
  } else {
    reasons.push(`No critical escalation keywords or high-risk tags detected: +0`);
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
