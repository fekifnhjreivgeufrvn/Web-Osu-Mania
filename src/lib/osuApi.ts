import type { GetBeatmapsResponse } from "@/routes/api/getBeatmaps";
import queryString from "query-string";
import type { Category } from "./searchParams/categoryParam";
import { DEFAULT_CATEGORY } from "./searchParams/categoryParam";
import type { Genre } from "./searchParams/genreParam";
import { GENRE_ID_MAP } from "./searchParams/genreParam";
import type { Language } from "./searchParams/languageParam";
import { LANGUAGE_INDEXES } from "./searchParams/languageParam";
import type { SortCriteria, SortDirection } from "./searchParams/sortParam";
import {
  DEFAULT_SORT_CRITERIA,
  DEFAULT_SORT_DIRECTION,
} from "./searchParams/sortParam";
import type { Stars } from "./searchParams/starsParam";
import { API_BASE_PATH } from "./utils";
import { useSettingsStore } from "@/stores/settingsStore";

const RULESETS = ["fruits", "mania", "osu", "taiko"] as const;
export type Ruleset = (typeof RULESETS)[number];
// type RankStatus = "-2" | "-1" | "0" | "1" | "2" | "3" | "4;";

const STATUSES = [
  "ranked",
  "qualified",
  "loved",
  "pending",
  "graveyard",
  "wip",
] as const;
export type Status = (typeof STATUSES)[number];

// NeriNyan API response type
type NerinyanSearchResponse = {
  beatmapsets?: BeatmapSet[];
  beatmapsets_count?: number;
  total?: number;
  offset?: number;
};

// Commented properties are unused and removed before caching

export type Beatmap = {
  beatmapset_id: number;
  difficulty_rating: number;
  id: number;
  mode: Ruleset;
  // status: RankStatus;
  total_length: number;
  user_id: number;
  version: string;
  bpm: number;

  cs: number; // Key count
  accuracy: number; // OD
  drain: number; // HP

  count_circles: number; // Tap note count
  count_sliders: number; // Hold note count
};

// Helper function to map NeriNyan status to osu! API status
function mapNerinyanStatusToStandard(status: string | null): Status {
  const statusMap: Record<string, Status> = {
    ranked: "ranked",
    approved: "ranked",
    qualified: "qualified",
    loved: "loved",
    pending: "pending",
    wip: "wip",
    graveyard: "graveyard",
  };
  return statusMap[status?.toLowerCase() || "pending"] || "pending";
}

// Fetch beatmap sets from NeriNyan API
async function getBeatmapSetsFromNerinyan({
  query,
  category,
  sortCriteria = DEFAULT_SORT_CRITERIA,
  sortDirection = DEFAULT_SORT_DIRECTION,
  keys,
  stars,
  nsfw = true,
}: {
  query: string;
  category: Category;
  sortCriteria: SortCriteria;
  sortDirection: SortDirection;
  keys: string[];
  stars: Stars;
  nsfw: boolean;
  genre: Genre;
  language: Language;
}) {
  // Map sort criteria
  const sortMap: Record<string, string> = {
    title: "title",
    artist: "artist",
    creator: "creator",
    difficulty: "difficulty_rating",
    updated: "updated",
    ranked: "ranked",
    plays: "plays",
    favorites: "favorites",
  };

  const nerinyanSort = sortMap[sortCriteria] || "updated";
  const sortOrder = sortDirection === "asc" ? "asc" : "desc";

  // Map category/status
  const statusMap: Record<string, string> = {
    Any: "any",
    Ranked: "ranked",
    Qualified: "qualified",
    Loved: "loved",
    Pending: "pending",
    WIP: "wip",
    Graveyard: "graveyard",
  };
  
  const nerinyanStatus = statusMap[category] || "any";

  // Build query parameters object
  const queryParams: Record<string, any> = {
    q: query || undefined,
    m: "3", // 3 = mania mode
    sort: `${nerinyanSort}_${sortOrder}`,
    nsfw: nsfw,
  };

  // Add status filter if not "any"
  if (nerinyanStatus !== "any") {
    queryParams.s = nerinyanStatus;
  }

  // Add difficulty rating filters (maps to stars)
  if (stars.min !== null) {
    queryParams["difficulty_rating.min"] = stars.min;
  }
  if (stars.max !== null) {
    queryParams["difficulty_rating.max"] = stars.max;
  }

  // Add keys filter - map to CS value
  // In mania: 4K = CS 4, 7K = CS 7, etc.
  if (keys && keys.length > 0) {
    const csValues = keys.map(k => {
      const match = k.match(/(\d+)K/);
      return match ? match[1] : null;
    }).filter(Boolean);
    
    if (csValues.length > 0) {
      // Use CS.min and CS.max or create OR condition
      // For simplicity, if only one key count is selected, use it
      if (csValues.length === 1) {
        queryParams.cs = csValues[0];
      } else {
        // For multiple key counts, we'd need to make separate requests
        // For now, just use the first one
        queryParams.cs = csValues[0];
      }
    }
  }

  // Build URL with proper query string
  let url = "https://api.nerinyan.moe/v2/search?";
  const params = new URLSearchParams();
  
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  }
  
  url += params.toString();

  const res = await fetch(url);

  if (!res.ok) {
    let errorMessage = `Code ${res.status}`;
    try {
      const message = await res.text();
      errorMessage += `: ${message}`;
    } catch (error) {}
    throw new Error(errorMessage);
  }

  const data = await res.json() as NerinyanSearchResponse;

  // Transform NeriNyan response to match GetBeatmapsResponse format
  const beatmapsets = (data.beatmapsets || []).map(set => ({
    ...set,
    // Ensure status is mapped correctly
    status: mapNerinyanStatusToStandard(set.status),
  }));

  return {
    beatmapsets,
    search: { sort: `${nerinyanSort}_${sortOrder}` },
    recommended_difficulty: null,
    error: null,
    total: data.total || data.beatmapsets_count || 0,
    cursor: null,
    cursor_string: "",
  } as GetBeatmapsResponse;
}

// Fetch single beatmap set from NeriNyan API
async function getBeatmapSetFromNerinyan(beatmapSetId: number) {
  const url = `https://api.nerinyan.moe/v2/search?setId=${beatmapSetId}&m=3`;

  const res = await fetch(url);

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message);
  }

  const data = await res.json() as NerinyanSearchResponse;
  
  if (!data.beatmapsets || data.beatmapsets.length === 0) {
    throw new Error("Beatmap set not found");
  }

  const beatmapSet = data.beatmapsets[0];
  
  // Ensure status is mapped correctly
  return {
    ...beatmapSet,
    status: mapNerinyanStatusToStandard(beatmapSet.status),
  } as BeatmapSet;
}

// type Covers = {
// cover: string;
// "cover@2x": string;
// card: string;
// "card@2x": string;
// list: string;
// "list@2x": string;
// slimcover: string;
// "slimcover@2x": string;
// };

export type BeatmapSet = {
  artist: string;
  artist_unicode: string;
  // covers: Covers;
  creator: string;
  // favourite_count: number;
  id: number;
  nsfw: boolean;
  offset: number;
  // play_count: number;
  // preview_url: string;
  // source: string;
  status: Status;
  // spotlight: boolean;
  title: string;
  title_unicode: string;
  // user_id: number;
  // video: boolean;

  beatmaps: Beatmap[];
};

export async function getBeatmapSets({
  query,
  category,
  sortCriteria = DEFAULT_SORT_CRITERIA,
  sortDirection = DEFAULT_SORT_DIRECTION,
  cursorString,
  keys,
  stars,
  nsfw = true,
  genre,
  language,
}: {
  query: string;
  category: Category;
  sortCriteria: SortCriteria;
  sortDirection: SortDirection;
  cursorString?: string;
  keys: string[];
  stars: Stars;
  nsfw: boolean;
  genre: Genre;
  language: Language;
}) {
  // Check if NeriNyan is selected as the beatmap provider
  const beatmapProvider = useSettingsStore.getState().beatmapProvider;
  
  if (beatmapProvider === "NeriNyan") {
    return getBeatmapSetsFromNerinyan({
      query,
      category,
      sortCriteria,
      sortDirection,
      keys,
      stars,
      nsfw,
      genre,
      language,
    });
  }

  // Fallback to original backend proxy
  const { min, max } = stars;

  const q = [
    stars.min !== null && `stars>=${min}`,
    stars.max !== null && `stars<=${max}`,
    keys && keys.map((key) => `key=${key}`).join(" "),
    query,
  ]
    .filter(Boolean)
    .join(" ");

  const url = queryString.stringifyUrl({
    url: `${API_BASE_PATH}/api/getBeatmaps`,
    query: {
      q: q || undefined,
      m: 3, // 3 = mania mode
      sort:
        sortCriteria !== DEFAULT_SORT_CRITERIA ||
        sortDirection !== DEFAULT_SORT_DIRECTION
          ? `${sortCriteria}_${sortDirection}`
          : undefined,
      cursor_string: cursorString || undefined,
      s: category !== DEFAULT_CATEGORY ? category.toLowerCase() : undefined,
      nsfw,
      g: GENRE_ID_MAP[genre],
      l: LANGUAGE_INDEXES.get(language),
    },
  });

  const res = await fetch(url);

  if (!res.ok) {
    let errorMessage = `Code ${res.status}`;

    try {
      const message = await res.text();
      errorMessage += `: ${message}`;
    } catch (error) {}

    throw new Error(errorMessage);
  }

  const data: GetBeatmapsResponse = await res.json();
  return data;
}

export async function getBeatmapSet(beatmapSetId: number) {
  // Check if NeriNyan is selected as the beatmap provider
  const beatmapProvider = useSettingsStore.getState().beatmapProvider;
  
  if (beatmapProvider === "NeriNyan") {
    return getBeatmapSetFromNerinyan(beatmapSetId);
  }

  // Fallback to original backend proxy
  const url = queryString.stringifyUrl({
    url: `${API_BASE_PATH}/api/getBeatmap`,
    query: { beatmapSetId },
  });

  const beatmapSetRes = await fetch(url);

  if (!beatmapSetRes.ok) {
    const message = await beatmapSetRes.text();

    throw new Error(message);
  }

  const beatmapSet: BeatmapSet = await beatmapSetRes.json();

  return beatmapSet;
}
