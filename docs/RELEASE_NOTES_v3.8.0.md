# Talk2Sql v3.8.0 — Ariadne Live 🧵

**The thread is now interactive — and it reads the real pod.**

Ariadne's dependency map went from a static list to a **live, zoomable, drill-down graph** wired to your pod. Probe → Learn → Build, end to end.

## What's new

**Interactive dependency graph.**
All 46 tasks laid out across six phase columns, with prerequisite → task edges. Nodes colored by status (Done / Ready / Blocked). Wheel to zoom, drag to pan, ＋ / − / ⤢ Reset. The cross-pillar reconciliation edge **SCM Item Master → CX Products** is drawn bold so the key gate is always visible.

**Drill from map to config item (L1 → L4).**
Click any module to drill in: **L3** shows its build lifecycle — prerequisites, dependents, and sections; **L4** lists the individual config items. Breadcrumbs walk you back up.

**Every module is now mapped.**
`ARIADNE_L34` adds **187 sections and 563 config items** spanning Foundation, ERP, SCM/Manufacturing, HCM, the full CX stack, Subscriptions, Marketing, PRM, and ICM.

**Live pod detection.**
**351 read-only detect queries** check what's actually configured. Detect one item or a whole module; results roll up to **Configured / Partial / Missing**, and a fully-configured module auto-marks Done. Everything is SELECT-only — a missing object reads as "Missing," never a write. (Requires an active pod connection with the BIP report path configured.)

## Unchanged
Anti-fabrication guard, REST/BIP SQL engines, auth modes, Schema Explorer, and the dependency engine itself are intact. Parse check and `npm test` pass.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
