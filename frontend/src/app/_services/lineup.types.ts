export type SortMetric =
  | "total_possessions"
  | "offensive_possessions"
  | "defensive_possessions"
  | "offensive_rating"
  | "defensive_rating"
  | "net_rating"
  | "offensive_effective_fg_pct"
  | "defensive_effective_fg_pct"
  | "offensive_turnover_pct"
  | "assist_to_turnover_ratio"
  | "offensive_rebound_pct"
  | "defensive_rebound_pct";

export interface LineupQuery {
  lineup_size: number;
  min_possessions: number;
  sort_by: SortMetric;
  sort_order: "asc" | "desc";
  limit: number;
}

export interface LineupSummary {
  team_id: string;
  player_ids: string[];
  players: { player_id: string; name: string }[];
  // All possession totals and derived metrics are numeric in the API.
  [key: string]:
    | number
    | string
    | string[]
    | { player_id: string; name: string }[];
}

export const DEFAULT_QUERY: LineupQuery = {
  lineup_size: 5,
  min_possessions: 0,
  sort_by: "total_possessions",
  sort_order: "desc",
  limit: 100,
};

export const SORT_METRICS: { value: SortMetric; label: string }[] = [
  { value: "total_possessions", label: "Total possessions" },
  { value: "net_rating", label: "Net rating" },
  { value: "offensive_rating", label: "Offensive rating" },
  { value: "defensive_rating", label: "Defensive rating" },
  { value: "offensive_effective_fg_pct", label: "Offensive effective FG%" },
  { value: "defensive_effective_fg_pct", label: "Opponent effective FG%" },
  { value: "offensive_rebound_pct", label: "Offensive rebound %" },
  { value: "defensive_rebound_pct", label: "Defensive rebound %" },
  { value: "offensive_turnover_pct", label: "Turnover rate" },
  { value: "assist_to_turnover_ratio", label: "Assist / turnover ratio" },
  { value: "offensive_possessions", label: "Offensive possessions" },
  { value: "defensive_possessions", label: "Defensive possessions" },
];

export function lineupKey(row: LineupSummary): string {
  return `${row.team_id}:${row.player_ids.join(",")}`;
}

export function numericStat(row: LineupSummary, key: string): number {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

// The API uses 0 for zero denominators. Display unavailable rates as a dash.
export function metricValue(row: LineupSummary, key: string): number | null {
  if (typeof row[key] !== "number" || !Number.isFinite(row[key])) return null;
  const denominators: Record<string, string[]> = {
    offensive_rating: ["offensive_possessions"],
    defensive_rating: ["defensive_possessions"],
    net_rating: ["offensive_possessions", "defensive_possessions"],
    offensive_turnover_pct: ["offensive_possessions"],
    assist_to_turnover_ratio: ["offensive_turnovers"],
    offensive_rebound_pct: ["offensive_rebound_opportunities"],
    defensive_rebound_pct: ["defensive_rebound_opportunities"],
  };
  const required =
    denominators[key] ??
    (key.endsWith("effective_fg_pct")
      ? [key.replace("effective_fg_pct", "fg_attempted")]
      : key.endsWith("_pct")
        ? [key.replace("_pct", "_attempted")]
        : []);
  return required.some((field) => numericStat(row, field) === 0)
    ? null
    : numericStat(row, key);
}
