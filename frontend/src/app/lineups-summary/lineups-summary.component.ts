import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subscription, timeout } from "rxjs";
import { LineupsService } from "../_services/lineups.service";
import {
  DEFAULT_QUERY,
  LineupQuery,
  LineupSummary,
  SORT_METRICS,
  SortMetric,
  lineupKey,
  metricValue,
  numericStat,
} from "../_services/lineup.types";

@Component({
  selector: "lineups-summary-component",
  imports: [FormsModule, DecimalPipe],
  templateUrl: "./lineups-summary.component.html",
  styleUrl: "./lineups-summary.component.scss",
})
export class LineupsSummaryComponent implements OnInit {
  private readonly service = inject(LineupsService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  readonly sortMetrics = SORT_METRICS;
  readonly lineupKey = lineupKey;
  readonly stat = numericStat;
  readonly value = metricValue;
  readonly pageSize = 15;
  readonly rows = signal<LineupSummary[]>([]);
  readonly loading = signal(false);
  readonly error = signal("");
  readonly search = signal("");
  readonly selectedKey = signal("");
  readonly page = signal(0);
  readonly applied = signal<LineupQuery>({ ...DEFAULT_QUERY });
  filters: LineupQuery = { ...DEFAULT_QUERY };

  readonly visibleRows = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.rows().filter(
      (row) =>
        !term ||
        row.players.some((player) =>
          player.name.toLowerCase().includes(term),
        ) ||
        row.team_id.toLowerCase().includes(term),
    );
  });
  readonly pagedRows = computed(() =>
    this.visibleRows().slice(
      this.page() * this.pageSize,
      (this.page() + 1) * this.pageSize,
    ),
  );
  readonly selected = computed(
    () =>
      this.visibleRows().find((row) => lineupKey(row) === this.selectedKey()) ??
      this.visibleRows()[0] ??
      null,
  );
  readonly pageCount = computed(() =>
    Math.ceil(this.visibleRows().length / this.pageSize),
  );
  readonly highlights = computed(() => [
    this.highlight("net_rating", "Best net rating", "PTS / 100 POSS", false),
    this.highlight("offensive_rating", "Best offense", "PTS / 100 POSS", false),
    this.highlight(
      "defensive_rebound_pct",
      "Best defensive rebounding",
      "OF REBOUND OPPORTUNITIES",
      true,
    ),
  ]);

  readonly detailMetrics = [
    {
      key: "offensive_effective_fg_pct",
      label: "Offensive eFG%",
      percent: true,
    },
    {
      key: "defensive_effective_fg_pct",
      label: "Opponent eFG%",
      percent: true,
    },
    {
      key: "offensive_rebound_pct",
      label: "Offensive rebound %",
      percent: true,
    },
    {
      key: "defensive_rebound_pct",
      label: "Defensive rebound %",
      percent: true,
    },
    { key: "offensive_turnover_pct", label: "Turnover rate", percent: true },
    {
      key: "assist_to_turnover_ratio",
      label: "Assists / turnover",
      percent: false,
    },
  ];
  readonly countingFields = [
    ["possessions", "Possessions"],
    ["points", "Points"],
    ["shot_attempts", "Shot attempts"],
    ["fg_made", "Field goals made"],
    ["fg_attempted", "Field goals attempted"],
    ["fg2_made", "2-pointers made"],
    ["fg2_attempted", "2-pointers attempted"],
    ["fg3_made", "3-pointers made"],
    ["fg3_attempted", "3-pointers attempted"],
    ["ft_made", "Free throws made"],
    ["ft_attempted", "Free throws attempted"],
    ["rebounds_offense", "Offensive rebounds"],
    ["rebounds_defense", "Defensive rebounds"],
    ["rebound_opportunities", "Rebound opportunities"],
    ["assists", "Assists"],
    ["steals", "Steals"],
    ["turnovers", "Turnovers"],
    ["blocks", "Blocks"],
    ["offensive_fouls", "Offensive fouls"],
    ["defensive_fouls", "Defensive fouls"],
    ["shooting_fouls", "Shooting fouls"],
    ["shot_attempt_points", "Shot attempt points"],
    ["ft_potential_points", "FT potential points"],
    ["transition_take_fouls", "Transition take fouls"],
  ];

  constructor() {
    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.request?.unsubscribe();
    const bounded = (
      input: number,
      fallback: number,
      min: number,
      max: number,
    ) =>
      Number.isFinite(input)
        ? Math.max(min, Math.min(max, Math.trunc(input)))
        : fallback;
    const query = {
      ...this.filters,
      lineup_size: bounded(this.filters.lineup_size, 5, 1, 5),
      min_possessions: bounded(
        this.filters.min_possessions,
        0,
        0,
        Number.MAX_SAFE_INTEGER,
      ),
      limit: bounded(this.filters.limit, 100, 1, 5000),
    };
    this.filters = { ...query };
    this.applied.set(query);
    this.loading.set(true);
    this.error.set("");
    this.rows.set([]);
    this.page.set(0);
    this.selectedKey.set("");
    this.request = this.service
      .getLineupsLeagueSummary(query.lineup_size, {
        min_possessions: query.min_possessions,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
        limit: query.limit,
      })
      .pipe(timeout(30000))
      .subscribe({
        next: ({ apiResponse }) => {
          if (!Array.isArray(apiResponse)) {
            this.error.set(
              "The API returned an unexpected response. Please check the API inspector.",
            );
          } else {
            this.rows.set(apiResponse);
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set(
            "We couldn’t load the lineup data. Check that the backend is running and the database is available, then try again.",
          );
          this.loading.set(false);
        },
      });
  }

  reset(): void {
    this.filters = { ...DEFAULT_QUERY };
    this.search.set("");
    this.load();
  }

  updateSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
  }

  sort(metric: SortMetric): void {
    const query = this.applied();
    this.filters = {
      ...query,
      sort_by: metric,
      sort_order:
        query.sort_by === metric && query.sort_order === "desc"
          ? "asc"
          : "desc",
    };
    this.load();
  }

  sortState(metric: SortMetric): "ascending" | "descending" | "none" {
    return this.applied().sort_by !== metric
      ? "none"
      : this.applied().sort_order === "asc"
        ? "ascending"
        : "descending";
  }

  sortArrow(metric: SortMetric): string {
    return this.applied().sort_by !== metric
      ? "↕"
      : this.applied().sort_order === "asc"
        ? "↑"
        : "↓";
  }

  select(row: LineupSummary): void {
    this.selectedKey.set(lineupKey(row));
    if (window.matchMedia("(max-width: 1100px)").matches) {
      // On narrow screens the detail panel follows the table.
      requestAnimationFrame(() =>
        document.getElementById("lineup-details")?.scrollIntoView(),
      );
    }
  }

  selectHighlight(row: LineupSummary): void {
    this.select(row);
    this.page.set(Math.floor(this.visibleRows().indexOf(row) / this.pageSize));
  }

  private highlight(
    key: string,
    label: string,
    unit: string,
    percent: boolean,
  ) {
    let best: LineupSummary | null = null;
    let bestValue: number | null = null;
    for (const row of this.visibleRows()) {
      const value = metricValue(row, key);
      if (value !== null && (bestValue === null || value > bestValue)) {
        best = row;
        bestValue = value;
      }
    }
    return { key, label, unit, percent, row: best, value: bestValue };
  }
}
