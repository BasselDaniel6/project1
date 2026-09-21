import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

// Use the existing TypeScript compiler; no additional testing dependencies.
const source = await readFile(
  new URL("../src/app/_services/lineup.types.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});
const { metricValue, lineupKey } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const lineup = {
  team_id: "team-a",
  player_ids: ["one", "two"],
  players: [],
  offensive_possessions: 10,
  defensive_possessions: 0,
  offensive_rating: 0,
  defensive_rating: 0,
  net_rating: 0,
  offensive_fg_attempted: 4,
  offensive_effective_fg_pct: 0.625,
  offensive_fg_pct: 0,
  offensive_fg3_attempted: 0,
  offensive_fg3_pct: 0,
  offensive_rebound_opportunities: 0,
  offensive_rebound_pct: 0,
  defensive_rebound_opportunities: 2,
  defensive_rebound_pct: 0.5,
  offensive_turnovers: 0,
  assist_to_turnover_ratio: 0,
};

test("no defensive possessions cannot appear as perfect defense or a valid net rating", () => {
  assert.equal(metricValue(lineup, "defensive_rating"), null);
  assert.equal(metricValue(lineup, "net_rating"), null);
});
test("legitimate zero scoring and shooting remain zero, not unavailable", () => {
  assert.equal(metricValue(lineup, "offensive_rating"), 0);
  assert.equal(metricValue(lineup, "offensive_fg_pct"), 0);
});
test("unattempted shots and rebound opportunities are unavailable", () => {
  assert.equal(metricValue(lineup, "offensive_fg3_pct"), null);
  assert.equal(metricValue(lineup, "offensive_rebound_pct"), null);
});
test("percentages preserve the API fraction for later percentage formatting", () => {
  assert.equal(metricValue(lineup, "offensive_effective_fg_pct"), 0.625);
  assert.equal(metricValue(lineup, "defensive_rebound_pct"), 0.5);
});
test("an assist/turnover ratio with no turnovers is undefined", () => {
  assert.equal(metricValue(lineup, "assist_to_turnover_ratio"), null);
  assert.equal(
    metricValue(
      { ...lineup, offensive_turnovers: 2, assist_to_turnover_ratio: 4 },
      "assist_to_turnover_ratio",
    ),
    4,
  );
});
test("missing and non-finite metrics cannot show as measured zeroes", () => {
  assert.equal(metricValue(lineup, "missing_metric"), null);
  assert.equal(
    metricValue({ ...lineup, offensive_rating: NaN }, "offensive_rating"),
    null,
  );
});
test("selection identity includes the team and all lineup members", () => {
  assert.notEqual(
    lineupKey(lineup),
    lineupKey({ ...lineup, team_id: "team-b" }),
  );
  assert.notEqual(
    lineupKey(lineup),
    lineupKey({ ...lineup, player_ids: ["one", "three"] }),
  );
  assert.equal(lineupKey(lineup), lineupKey({ ...lineup }));
});
