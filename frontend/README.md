# Lineup explorer

An Angular interface for comparing lineup efficiency and inspecting the events
behind those results. Uses the existing Angular, Forms, RxJS, and Material
dependencies; no charting or table packages were added.

## Run locally

Use Node.js 22 and npm 10+. From `frontend/`:

```sh
npm ci
npm start
```

Start Django and import the possession data using the root README first. The
frontend calls `http://127.0.0.1:8000/api/v1/lineups` during local development.

- `http://localhost:4200/lineups-summary`: dashboard.
- `http://localhost:4200/lineups-summary-api`: raw JSON inspector.

The app does not silently substitute demo data when the API is unavailable.

## Controls and scope

- Lineup size: 1–5 players, default 5.
- Minimum possessions: filters by total offensive + defensive possessions.
- Sort by: every sortable metric supported by the helper; both directions.
- Result limit: 25, 50, 100 (default), 500, or 5,000.
- Apply filters sends the selected options to the API. New requests cancel older
  requests; requests time out after 30 seconds.
- Click a table heading to sort through the API. The filter controls synchronize
  to that new query. Results are paged locally in groups of 15.
- Player search is local to the returned results. The page reports when the
  selected API limit is reached. Clear search or increase the limit for more results.
- Click a lineup or a leader card to select its detail panel. On narrow screens,
  selection scrolls to the detail panel below the table.
- Expand "Possession totals & shooting" for all of the sample response's
  offensive/defensive counting fields and shooting percentages.

The three leader cards describe only returned/search-matching lineups, not an
unfiltered league-wide ranking. Team IDs are shortened for display because the
current endpoint does not include team names.

## Metric interpretation

Ratings, effective FG%, turnover rate, assist/turnover ratio, and rebounding
percentages come from the backend. The UI formats fractions as percentages and
does not average or sum rates across overlapping lineups.

The API returns zero when a denominator is zero. The UI displays a dash in those
cases (including net rating when either possession count is zero), and excludes
unavailable values from leader cards. Backend sorting still uses the API's
numeric zeros. "How to read these numbers" explains this convention and formulas.

Lower defensive rating and opponent effective FG% are better. In the full totals,
the prefix describes the possession role: defensive points/FG are opponent
production; defensive rebounds/steals are events by the defending team.

## Verify

```sh
npm test
npm run build
npm run deploy
```

`npm test` uses Node's test runner and the existing TypeScript compiler to test
missing/zero-denominator metrics, legitimate zeroes, percentages, and selection
identity. `npm run build` runs Angular's strict template and type checks.
`npm run deploy` serves the production build locally (it does not publish it).

Browser checks should cover filter submission, both sort directions, player
search, selection, paging, no results, connection errors/retry, the JSON inspector,
and keyboard/mobile access. Capture provenance and the observed deployment status
are documented in `../docs/screenshots/README.md`.

## Railway

The existing `railway.json` builds with `npm run build` and serves with
`npm run deploy`. Before publishing, set `BACKEND_PUBLIC_DOMAIN` in
`src/environments/environment.prod.ts` to the actual deployed Django HTTPS origin
(no trailing slash). Follow the root README for the separate PostgreSQL, backend,
and frontend services, data import, and the URL in `SUBMISSION.md`.

The production backend domain remains blank until an actual deployment exists.
The frontend implementation alone is not a working full-stack deployment.
