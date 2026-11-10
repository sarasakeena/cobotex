import { CategoryType } from "@/lib/severity";

export interface ParsedVoiceReport {
  category?: CategoryType;
  peopleAffected?: number;
  tags: string[];
  contactPhone?: string;
  addressText?: string;
  useCurrentLocation?: boolean;
  confidence: {
    category: boolean;
    peopleAffected: boolean;
    tags: boolean;
    contactPhone: boolean;
    addressText: boolean;
  };
}

/**
 * Quick-tag definitions per emergency category.
 * Includes common synonyms and multilingual spoken phrases.
 */
export const CATEGORY_TAG_PATTERNS: Record<
  CategoryType,
  { tag: string; patterns: (string | RegExp)[] }[]
> = {
  FIRE: [
    {
      tag: "Trapped inside",
      patterns: [
        "trapped inside",
        "trapped",
        "stuck inside",
        "stuck",
        "fasa hua",
        "maatikkitaanga",
      ],
    },
    {
      tag: "Spreading",
      patterns: [
        "spreading",
        "spread",
        "rapidly spreading",
        "phail raha",
        "paravuthu",
      ],
    },
    {
      tag: "Explosion risk",
      patterns: [
        "explosion risk",
        "explosion",
        "cylinder blast",
        "blast",
        "blast risk",
        "dhamaka",
      ],
    },
    {
      tag: "Smoke",
      patterns: ["smoke", "heavy smoke", "black smoke", "suffocating", "dhuan"],
    },
    {
      tag: "Unconscious",
      patterns: [
        "unconscious",
        "passed out",
        "behosh",
        "behoshi",
        "mayakkam",
      ],
    },
  ],
  ROAD_ACCIDENT: [
    {
      tag: "Injuries",
      patterns: [
        "injuries",
        "injured",
        "hurt",
        "chot",
        "ghayal",
        "kaayam",
      ],
    },
    {
      tag: "Vehicle on fire",
      patterns: [
        "vehicle on fire",
        "car on fire",
        "bike on fire",
        "bus on fire",
        "gaadi mein aag",
      ],
    },
    {
      tag: "Road blocked",
      patterns: [
        "road is blocked",
        "road blocked",
        "traffic blocked",
        "traffic jammed",
        "blocked road",
        "rasta band",
      ],
    },
  ],
  MEDICAL: [
    {
      tag: "Unconscious",
      patterns: [
        "unconscious",
        "passed out",
        "behosh",
        "behoshi",
        "mayakkam",
      ],
    },
    {
      tag: "Bleeding",
      patterns: [
        "bleeding",
        "blood",
        "khoon",
        "bleeding heavily",
        "severe bleeding",
        "ratham",
      ],
    },
    {
      tag: "Not breathing",
      patterns: [
        "not breathing",
        "cannot breathe",
        "breathless",
        "stopped breathing",
        "saans nahi",
        "moochu",
      ],
    },
    {
      tag: "Chest pain",
      patterns: [
        "chest pain",
        "heart attack",
        "severe chest pain",
        "seene mein dard",
        "marbu vali",
      ],
    },
  ],
  FLOOD: [
    {
      tag: "Rising water",
      patterns: [
        "rising water",
        "water rising",
        "water level rising",
        "water is rising",
        "pani badh raha",
      ],
    },
    {
      tag: "People stranded",
      patterns: [
        "people stranded",
        "stranded",
        "trapped in water",
        "stuck in flood",
        "log fase hue",
      ],
    },
    {
      tag: "Houses submerged",
      patterns: [
        "water is entering houses",
        "houses submerged",
        "house flooded",
        "submerged",
        "homes submerged",
        "ghar doob",
      ],
    },
  ],
  BUILDING_COLLAPSE: [
    {
      tag: "People trapped",
      patterns: [
        "people trapped",
        "trapped inside",
        "trapped",
        "stuck under debris",
        "under rubble",
        "malbe mein",
      ],
    },
    {
      tag: "Gas leak",
      patterns: [
        "gas leak",
        "gas smell",
        "cylinder leak",
        "smell of gas",
        "gas risav",
      ],
    },
    {
      tag: "Partial collapse",
      patterns: [
        "partial collapse",
        "wall fell",
        "roof fell",
        "partially collapsed",
        "deewar gir gayi",
      ],
    },
  ],
  OTHER: [
    {
      tag: "Needs rescue",
      patterns: ["needs rescue", "rescue needed", "save us", "madad", "kaappattunga"],
    },
    {
      tag: "Needs medical help",
      patterns: ["needs medical help", "doctor needed", "medic", "ilaj"],
    },
    {
      tag: "Needs shelter",
      patterns: ["needs shelter", "shelter needed", "no place to go", "aasra"],
    },
  ],
};

/**
 * Keyword dictionaries for category extraction.
 * Includes English keywords plus Hindi/Tamil transliterations.
 */
const CATEGORY_KEYWORDS: Record<CategoryType, string[]> = {
  BUILDING_COLLAPSE: [
    "building collapse",
    "collapse",
    "collapsed",
    "building fell",
    "debris",
    "rubble",
    "gir gaya",
    "gir gayi",
    "malba",
    "kattidam",
  ],
  FIRE: [
    "fire",
    "burning",
    "smoke",
    "flames",
    "aag",
    "thee",
    "theeyanai",
    "agni",
    "jalan",
  ],
  FLOOD: [
    "flood",
    "water level",
    "submerged",
    "rain",
    "drowning",
    "baadh",
    "pani",
    "vellam",
    "mazhai",
  ],
  MEDICAL: [
    "heart attack",
    "unconscious",
    "bleeding",
    "injured",
    "not breathing",
    "ambulance",
    "sick",
    "pregnant",
    "fainted",
    "stroke",
    "hospital",
    "behosh",
    "maruthuvam",
  ],
  ROAD_ACCIDENT: [
    "road accident",
    "accident",
    "crash",
    "collision",
    "hit",
    "vehicle",
    "bike",
    "car",
    "lorry",
    "bus",
    "truck",
    "highway crash",
    "highway",
    "haadsa",
    "vibathu",
  ],
  OTHER: ["hazard", "emergency", "help", "danger"],
};

/**
 * Tie-breaker priority order when multiple categories match with equal hits:
 * BUILDING_COLLAPSE > FIRE > FLOOD > MEDICAL > ROAD_ACCIDENT > OTHER
 */
const CATEGORY_PRIORITY: CategoryType[] = [
  "BUILDING_COLLAPSE",
  "FIRE",
  "FLOOD",
  "MEDICAL",
  "ROAD_ACCIDENT",
  "OTHER",
];

const NUMBER_WORD_MAP: Record<string, number> = {
  zero: 0,
  one: 1,
  someone: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  hundred: 100,
};

const DIGIT_WORD_MAP: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

/**
 * Phrases indicating explicit intent to use device GPS or current location
 */
const CURRENT_LOCATION_PATTERNS = [
  /\b(?:my\s+current\s+location|current\s+location|my\s+location)\b/i,
  /\b(?:where\s+i\s+am|where\s+am\s+i)\b/i,
  /\b(?:right\s+here|\bhere\b|this\s+place)\b/i,
  /\b(?:use\s+my\s+location|use\s+my\s+current\s+location|use\s+current\s+location|use\s+gps)\b/i,
];

/**
 * Pure function to extract structured emergency report fields from a spoken transcript.
 *
 * @param transcript - Voice transcript string
 * @returns {ParsedVoiceReport} Extracted category, casualty count, tags, phone, address, and current location intent
 */
export function parseVoiceReport(transcript: string): ParsedVoiceReport {
  const text = (transcript || "").trim();
  const lower = text.toLowerCase();

  const confidence = {
    category: false,
    peopleAffected: false,
    tags: false,
    contactPhone: false,
    addressText: false,
  };

  if (!text) {
    return {
      tags: [],
      confidence,
    };
  }

  // ==========================================
  // 1. CATEGORY EXTRACTION
  // ==========================================
  const categoryScores: Record<CategoryType, number> = {
    BUILDING_COLLAPSE: 0,
    FIRE: 0,
    FLOOD: 0,
    MEDICAL: 0,
    ROAD_ACCIDENT: 0,
    OTHER: 0,
  };

  for (const cat of CATEGORY_PRIORITY) {
    const kwList = CATEGORY_KEYWORDS[cat] || [];
    for (const kw of kwList) {
      const pattern = new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (pattern.test(lower)) {
        categoryScores[cat] += 1;
      }
    }
  }

  let detectedCategory: CategoryType | undefined = undefined;
  let maxHits = 0;

  for (const cat of CATEGORY_PRIORITY) {
    const hits = categoryScores[cat];
    if (hits > maxHits) {
      maxHits = hits;
      detectedCategory = cat;
    }
  }

  if (detectedCategory) {
    confidence.category = true;
  } else {
    detectedCategory = undefined;
  }

  // ==========================================
  // 2. PEOPLE AFFECTED EXTRACTION
  // ==========================================
  let detectedPeople: number | undefined = undefined;

  const casualtyKeywords = [
    "people",
    "person",
    "persons",
    "injured",
    "trapped",
    "victims",
    "victim",
    "families",
    "family",
    "fainted",
    "hurt",
    "stranded",
    "unconscious",
  ];

  if (/\b(?:many people|many)\b/i.test(lower)) {
    detectedPeople = 10;
  } else if (/\b(?:several people|several)\b/i.test(lower)) {
    detectedPeople = 5;
  } else if (/\b(?:a couple of people|a couple)\b/i.test(lower)) {
    detectedPeople = 2;
  } else if (/\b(?:a few people|few)\b/i.test(lower)) {
    detectedPeople = 3;
  } else if (/\b(?:a person|someone)\b/i.test(lower)) {
    detectedPeople = 1;
  }

  const words = lower.split(/[\s,]+/);

  if (detectedPeople === undefined) {
    let bestDistance = Infinity;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];

      let val: number | null = null;
      if (/^\d+$/.test(w)) {
        val = parseInt(w, 10);
      } else if (NUMBER_WORD_MAP[w] !== undefined) {
        val = NUMBER_WORD_MAP[w];
      }

      if (val !== null) {
        let minD = Infinity;
        for (let j = 0; j < words.length; j++) {
          if (casualtyKeywords.includes(words[j])) {
            const dist = Math.abs(i - j);
            if (dist < minD) minD = dist;
          }
        }

        if (minD < bestDistance) {
          bestDistance = minD;
          detectedPeople = val;
        }
      }
    }
  }

  if (detectedPeople !== undefined) {
    confidence.peopleAffected = true;
  }

  // ==========================================
  // 3. TAGS EXTRACTION
  // ==========================================
  const detectedTags: string[] = [];
  const targetCategory = detectedCategory || "OTHER";
  const tagDefinitions = CATEGORY_TAG_PATTERNS[targetCategory] || [];

  for (const tagDef of tagDefinitions) {
    let matched = false;
    for (const pat of tagDef.patterns) {
      if (typeof pat === "string") {
        const regex = new RegExp(`\\b${pat.replace(/\s+/g, "\\s+")}\\b`, "i");
        if (regex.test(lower)) {
          matched = true;
          break;
        }
      } else if (pat.test(lower)) {
        matched = true;
        break;
      }
    }

    if (matched && !detectedTags.includes(tagDef.tag)) {
      detectedTags.push(tagDef.tag);
    }
  }

  if (detectedTags.length > 0) {
    confidence.tags = true;
  }

  // ==========================================
  // 4. PHONE NUMBER EXTRACTION
  // ==========================================
  let detectedPhone: string | undefined = undefined;

  let normalizedDigits = lower;
  for (const [dw, d] of Object.entries(DIGIT_WORD_MAP)) {
    const dRegex = new RegExp(`\\b${dw}\\b`, "gi");
    normalizedDigits = normalizedDigits.replace(dRegex, d);
  }

  const rawDigitMatch = normalizedDigits.match(
    /(?:\+?91[\s-]?)?([6-9](?:[\s-]?\d){9})/
  );

  if (rawDigitMatch) {
    const cleanNum = rawDigitMatch[0].replace(/\D/g, "");
    if (cleanNum.length === 12 && cleanNum.startsWith("91")) {
      detectedPhone = cleanNum.slice(2);
    } else if (cleanNum.length === 10) {
      detectedPhone = cleanNum;
    } else if (cleanNum.length > 10) {
      detectedPhone = cleanNum.slice(-10);
    }
  }

  if (detectedPhone) {
    confidence.contactPhone = true;
  }

  // ==========================================
  // 5. CURRENT LOCATION INTENT & ADDRESS EXTRACTION
  // ==========================================
  let useCurrentLocation = false;

  for (const pattern of CURRENT_LOCATION_PATTERNS) {
    if (pattern.test(lower)) {
      useCurrentLocation = true;
      break;
    }
  }

  let detectedAddress: string | undefined = undefined;

  // Only extract addressText if NOT an explicit current-location intent
  if (!useCurrentLocation) {
    // Look for place prepositions: near, at, in, opposite, behind, beside, on, outside, inside, next to, close to
    // Landmark prepositions take top precedence
    const prepRegex =
      /\b(?:near|opposite|behind|beside|outside|inside|next to|close to|at|on|in)\s+([^,.;]+)/gi;

    let match: RegExpExecArray | null;
    const candidates: string[] = [];

    while ((match = prepRegex.exec(text)) !== null) {
      let rawCandidate = match[1].trim();

      // Stop candidate at words: comma, "and", "please", numbers, or verbs
      rawCandidate = rawCandidate
        .replace(
          /\s+(?:and|please|my number|with|where|call me|phone|contact|\d+|two|three|four|five|six|is|are|fell|collapsed|trapped|stranded|injured|bleeding|fainted|submerged|entering|burning|need|needs|help|use).*$/i,
          ""
        )
        .replace(/^(?:the|a|an)\s+/i, "")
        .trim();

      // Reject junk:
      // - Shorter than 3 chars
      // - Contains words like please, use, current, location, my, me, where, here, this
      // - Matches emergency keywords only or generic non-places
      const lowerCand = rawCandidate.toLowerCase();
      const containsJunkWords =
        /\b(?:please|use|current|location|my|me|where|here|this|right)\b/i.test(
          lowerCand
        );

      const isGenericOrEmergency =
        lowerCand === "fire" ||
        lowerCand === "accident" ||
        lowerCand === "flood" ||
        lowerCand === "collapse" ||
        lowerCand === "building" ||
        lowerCand === "a building" ||
        lowerCand === "highway" ||
        lowerCand === "the highway" ||
        lowerCand === "road" ||
        lowerCand === "the road" ||
        lowerCand === "house" ||
        lowerCand === "houses";

      if (
        rawCandidate.length >= 3 &&
        !containsJunkWords &&
        !isGenericOrEmergency
      ) {
        candidates.push(rawCandidate);
      }
    }

    if (candidates.length > 0) {
      detectedAddress = candidates[0];
      confidence.addressText = true;
    }
  }

  return {
    category: detectedCategory,
    peopleAffected: detectedPeople,
    tags: detectedTags,
    contactPhone: detectedPhone,
    addressText: detectedAddress,
    useCurrentLocation,
    confidence,
  };
}
