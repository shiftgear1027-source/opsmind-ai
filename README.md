# OpsMind AI

**Turn operational data into intelligent actions.**

OpsMind AI analyses operational records — incidents, downtime, quality problems,
delays — and converts them into patterns, anomalies, risk areas and ranked
recommended actions.

---

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database, no API keys, no backend.

Other scripts: `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`.

---

## The problem it addresses

Organisations collect large volumes of operational data but managers see rows,
not risk. OpsMind closes the gap between the record and the decision:

```
RAW DATA  →  ANALYSIS  →  AI INSIGHT  →  RISK  →  RECOMMENDED ACTION
```

Each page makes one step of that chain visible, and every figure on screen is
computed from the dataset at runtime. Nothing is hardcoded.

---

## Routes

| Route | What it shows |
|---|---|
| `/` | Landing screen; the hero is the engine's own executive summary |
| `/dashboard` | KPIs, AI executive summary with confidence, four charts, priority watchlist |
| `/dashboard/insights` | Analysis header, key findings, anomalies, risk areas, recommendations, risk score |
| `/dashboard/operations` | Searchable, filterable, sortable record table with a detail drawer |
| `/dashboard/analytics` | Eight filter-driven charts plus the "Ask AI about this data" panel |

---

## The analysis engine

`lib/aiAnalysis.ts` exposes an `AIAnalysisEngine` interface with a single local
implementation, `LocalAnalysisEngine`. It is a deterministic statistical engine
that runs entirely in the browser over the loaded records. The application never
depends on a network call.

The UI describes this accurately as **"AI-powered operational analysis"** and
carries a demo-data indicator. It does not claim to be a live ML model.

**To swap in a hosted model**, implement `AIAnalysisEngine` and return it from
`getAIEngine()`. That is the only change required — no UI touches the engine
internals, and the local engine remains available as the fallback.

What the engine computes:

- **Anomalies** — mean + 2σ thresholds on downtime, resolution time and cost,
  reported against the observed p10–p90 range, plus a rule for critical
  incidents left unresolved
- **Risk score** — a weighted composite of severity mix (0.30), open workload
  (0.25), downtime pressure (0.20), recurrence (0.15) and trend direction
  (0.10); each component displays its own value, weight and justification
- **Confidence** — derived from sample size, field completeness, pattern
  distinctness and departmental spread
- **Key findings, risk areas, recommendations, priority watchlist, trend
  explanation, and question answering** — all from the same pass

---

## Project structure

```
app/
  page.tsx                      landing
  dashboard/
    layout.tsx                  provider + sidebar + header + page transitions
    page.tsx                    overview
    insights/page.tsx
    operations/page.tsx
    analytics/page.tsx
components/                     Sidebar, Header, KpiCard, AIInsightCard,
                                ChartCard, RiskScore, OperationsTable,
                                OperationDetail, RecommendationCard,
                                NotificationDropdown, ProfileMenu, Search,
                                AnomalyCard, AskAIPanel, FilterBar,
                                PriorityWatchlist, HowItWorks, States, Badge
context/OpsContext.tsx          shared filters + memoised analysis
data/operations.ts              100 synthetic records
lib/analytics.ts                all aggregation and KPI functions
lib/aiAnalysis.ts               engine abstraction + local engine
lib/filters.ts                  filtering and timeline construction
lib/format.ts                   formatting and the status colour tokens
types/operations.ts             domain types
```

Calculations live in `lib/` and are never duplicated in components.

---

## The dataset

100 synthetic records spanning 2026-06-20 to 2026-09-15, built with deliberate
structure so the analysis has real signal to find:

- **Plant B conveyor drive motor overheating** — 9 occurrences, downtime rising
  from 126 to 196 minutes, all sharing the root cause "Deferred preventive
  maintenance schedule", with the most recent three unresolved
- **Logistics dispatch delays** — 10 occurrences against one carrier-congestion
  cause
- **Quality spike** — 9 incidents inside a 13-day window, traced to supplier
  batch QX-44, which is why the engine reads it as one batch rather than process
  drift
- **Resolution outliers** — five incidents running up to 2,040 minutes that are
  *not* the most severe records, so the correct inference is a handover or parts
  problem rather than technical difficulty
- **Cost concentration** — Maintenance and Production hold the large majority of
  financial impact

---

## Design and accessibility

Dark sidebar, light content, rounded cards, restrained borders. Glass treatment
is reserved for AI-generated content so the provenance of any panel is readable
at a glance. Status colours are consistent throughout: critical red, high
orange, medium amber, low green.

Animation is handled with Framer Motion — page transitions, staggered card
entrances, counting KPI numbers, chart mount animations, a spring-driven
sidebar indicator and drawer. `prefers-reduced-motion` is respected globally in
`globals.css` and in the counting-number component.

Responsive from desktop down to mobile: the sidebar becomes a drawer, charts
resize through `ResponsiveContainer`, and the operations table becomes a card
list below the `md` breakpoint. Keyboard focus is visible throughout; the table
is keyboard-navigable and the drawer closes on Escape.

---

## Demo notes

Everything is synthetic. The header carries a "Demo dataset · 100 records"
indicator with an explanatory tooltip, and the landing page states the same.
The profile menu and sign-out are demo-only; no authentication is configured.

Fonts load from Google Fonts via CSS `@import`. Without network access the app
falls back to the system sans and mono stacks and renders correctly.
