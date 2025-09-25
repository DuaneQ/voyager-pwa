// Utility to derive activity keywords from preference sliders
export const ACTIVITY_KEYWORD_MAP: Record<string, string[]> = {
  cultural: [
    "museums",
    "historic",
    "culture",
    "art galleries",
    "monuments",
    "landmarks",
    "theaters",
    "operas",
    "palaces",
    "castles",
    "archaeological sites",
  ],
  adventure: [
    "hiking",
    "mountain climbing",
    "rock climbing",
    "trekking",
    "trails",
    "kayaking",
    "rafting",
    "zipline",
    "bungee jumping",
    "diving",
    "snorkeling",
    "surfing",
    "caving",
    "spelunking",
    "adventure park",
  ],
  relaxation: ["spa", "relaxation", "beach"],
  nightlife: [
    "bars",
    "nightclubs",
    "pubs",
    "lounges",
    "karaoke",
    "casinos",
    "live music venues",
    "rooftop bars",
    "dance clubs",
    "wine bars",
    "breweries",
  ],
  shopping: ["shopping", "markets"],
  food: [
    "restaurants",
    "cafes",
    "street food",
    "food markets",
    "local cuisine",
    "fine dining",
    "bakeries",
    "breweries",
    "wineries",
    "cooking classes",
  ],
  nature: ["nature", "parks", "scenery"],
  photography: [
    "viewpoints",
    "observation decks",
    "scenic lookouts",
    "city skylines",
    "landmarks",
    "bridges",
    "towers",
    "scenic trails",
    "sunrise spots",
    "sunset spots",
    "iconic architecture",
  ],
};

// activities: object with numeric scores 0-10
export function deriveKeywordsFromActivities(
  activities: Record<string, number> | undefined,
  maxKeywords = 4
): string[] {
  if (!activities || typeof activities !== "object") return [];

  // Convert entries to [activity, score] and filter out zero/NaN
  const entries = Object.entries(activities)
    .map(([k, v]) => [k, Number(v)] as [string, number])
    .filter(([, v]) => !Number.isNaN(v) && v > 0);

  if (entries.length === 0) return [];

  // Sort by score desc and take top N
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, maxKeywords).map((e) => e[0]);

  // Map to keyword arrays and flatten, dedupe while preserving order
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const key of top) {
    const mapped = ACTIVITY_KEYWORD_MAP[key] || [key];
    for (const kw of mapped) {
      if (!seen.has(kw)) {
        seen.add(kw);
        keywords.push(kw);
      }
    }
  }
  return keywords;
}

export default deriveKeywordsFromActivities;
