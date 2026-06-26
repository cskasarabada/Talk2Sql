# Talk2Sql v3.24.0 — BI Builder + Dashboards 🧵📊

**The base SQL core now drives BI.** A new 📊 pillar builds reports and dashboards on the schema you learned from the pod — no hand-written SQL, no guessing.

## What's new

**📊 BI / Dashboards (tab 6).**

**Report builder.** Search your learned tables/views, then:
- pick **Dimensions** (group-by) and **Measures** (a column + COUNT / SUM / AVG / MIN / MAX, or COUNT(*)),
- add filters (`col = / != / > / < / LIKE value`), order-by, and a row limit,
- optionally **join** a second table — the builder suggests the condition on a shared `_ID` column.

It generates a read-only SELECT, **auto-heals the table names against the catalog**, runs it via BIP, and shows a **data table + chart**. Open the SQL in the editor or download it anytime.

**Charts.** Vanilla inline SVG (no libraries, offline-safe): **Bar · Line · Pie · KPI · Table**, switchable without re-running the query. Light/dark theme aware.

**Dashboards.** Save a report as a **tile**, lay tiles out in a responsive grid (small / medium / large), and each tile re-runs its query and renders its chart. **🔄 Refresh all** runs them in sequence; per-tile refresh, chart-type quick-switch (from cache), open-in-builder, and remove are all there. Name the dashboard, **⬇ Export** it as JSON, and it persists locally.

## How to use
1. 🧠 Schema Catalog → **Learn Schema** (so the builder knows your real tables/columns).
2. 📊 BI → **Report Builder** → pick a table, add a dimension + a measure → **▶ Run** → choose a chart.
3. **💾 Save** / **➕ Add to dashboard** → switch to **📊 Dashboard** → **🔄 Refresh all**.

## Next
Deeper BI: calculated measures, multi-series charts, scheduled dashboard refresh, and AI-suggested reports off the catalog.

## Safety
Read-only end to end — every report and tile runs SELECTs through the existing anti-fabrication guard; charts render real query results only; nothing is written to the pod.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
