# Frontend captures

Captured locally on September 20, 2026. These are development-preview captures,
not evidence of a deployed application.

## Data and verification scope

The production Angular build was served locally on port 4200. A temporary,
loopback-only adapter on port 8000 invoked the actual
`backend/app/helpers/lineups.py` aggregation function against all 1,348 bundled
records in `backend/raw_data/possessions.json` and the bundled player names.
Only the ORM access was substituted. The adapter is outside the repository and
is not part of the application or its deployment.

This verifies the frontend with the helper's actual calculated results. It does
**not** verify Django routing, PostgreSQL queries, database import, production
CORS, or a deployed end-to-end stack. The UI itself has no demo-data fallback.

## Captures

- [Desktop overview](desktop.png): default five-player lineups and details.
- [Two-player filters](two-player.png): minimum possessions, net-rating sort, limit.
- [Expanded details](detail.png): possession totals and shooting statistics.
- [Mobile overview](mobile.png): narrow-screen layout.
- [Mobile selection](mobile-detail.png): selection scrolls to the detail panel.
- [Empty results](empty.png): minimum-possession filter excludes all lineups.
- [Connection error](error.png): adapter stopped; explicit error and retry action.
- [API inspector](api-inspector.png): raw JSON from the aggregation helper.
- [Animated walkthrough](walkthrough.gif): sampled browser screenshots covering
  filtering, selection, pagination, ascending sort, player search, empty states,
  one-player lineups, API inspector, error/retry, and metric explanations.

The GIF is a slideshow of actual browser captures, **not a continuous screen
recording**. Before final submission, record a continuous walkthrough of all
views and controls against the real backend as required by the root README.

## Checks completed

- Node 22: all seven metric/identity unit tests pass; production Angular build passes.
- Browser: query controls, both sort directions, pagination, local player search,
  row selection, one-/two-/five-player results, API-empty and search-empty states,
  connection error and successful retry, raw JSON inspector.
- Mobile: 390-pixel viewport; no document-level horizontal overflow; lineup table
  scrolls within its container; selection brings the details into view.
- Keyboard spot checks: metric disclosure opens with Enter; skip link preserves
  the current route. This is not a full accessibility audit.
- No additional frontend dependencies were introduced; lockfile was refreshed.

## Deployment attempt and remaining submission work

Railway CLI authentication check returned `Unauthorized. Please login with
railway login`. No services were created or deployed. The production backend
domain and submission deployment URL were intentionally not fabricated.

Remaining: authenticate Railway, follow the root README's PostgreSQL/backend/
frontend setup and data import, configure the real backend domain, verify the
deployed application, fill in `SUBMISSION.md`, and capture the required continuous
screen recording. The data-analysis deliverable is separate from this frontend work.

These captures are uploaded on `codex/frontend-captures`. That branch contains
capture evidence only; the implementation changes remain in the local working
tree until reviewed and committed.
