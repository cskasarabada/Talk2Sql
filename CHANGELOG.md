# Changelog

All notable changes to Talk2Sql are documented here.

## [3.14.0] — 2026-06-23 · "Ariadne Config Builder (Pass 1)"

Ariadne starts building configuration, not just guiding it. Pilot: **Foundation (Geographies)** — buildable from base details with no upstream. (Downstream/calculation modules like ICM need their full dependency chain + plan details first, so they're modeled for later.)

### Added
- **AI Config Builder — capture → generate → preview → download.** A new "🛠 Build & Push config" view (from any module's loop or module view) where you fill a **questionnaire**, it's **captured and stored**, and Ariadne **generates the upload file** in the best format for that object.
- **Channel auto-pick.** Each object routes to the right mechanism — **FBDI** (bulk import CSV), **REST** (JSON payload), or **FSM Setup Data** (setup-data CSV) — with the rationale shown, and an override dropdown.
- **Foundation pilot — 15 objects.** Geographies (8): Country Geography Structure, Geography Types, Master Reference Usage, Geography Nodes (FBDI), Parent-Child hierarchy (FBDI), Address-Style Mapping, Validation Control, Import (Loqate/file). Plus the core chain: Enterprise Definition, Currencies, COA Structure + Segment Values (FBDI), Primary Ledger, Legal Entities, Business Units. Repeatable tier editors for nodes/segments/currencies/LEs/BUs.
- **6 ICM objects** also modeled (Comp Plan, Component, Rate Table, Rate Dimension, Participant/Role, Comp Transaction) for when the dependency chain is in place.
- Each object generates the artifact text + a step-by-step **Fusion upload runbook** + a **⬇ Download**. Every artifact is fenced "best-effort template — validate column names against your pod's import template."

### Next (Pass 2)
- Gated push: confirm → submit the generated artifact via the chosen channel using your pod's auth → verify by detection (the node flips to ✓ Configured). Dev-first, environment-aware.

### Safety
- The builder generates files only — it does not write to the pod in this pass, never touches the SQL grid, and the anti-fabrication guard is untouched.

---

## [3.13.0] — 2026-06-23 · "Ariadne Brain"

Ariadne now thinks like an SI / Enterprise / Solution Architect and guides you — bidirectionally.

### Added
- **Architect rules engine (the brain).** A deterministic reasoning layer over the framework — phase position, readiness, next moves with the architect's "why," blockers with the exact unmet prerequisites, and an **EA-grade audit** (foundation-gate, CX→SCM PIM, ICM-needs-OM/AR/HCM, clean-TCA-first, detection drift, discovery gaps). Offline, never fabricates, always cites the rule.
- **Architect Guidance panel** at the top of Ariadne: phase + readiness, next moves, **🔍 Run review**, and **agentic clarifying questions** — when scope or key discovery answers are missing, Ariadne asks, and your quick-pick answers configure the app (bidirectional).
- **Ask-Ariadne Q&A.** Ask "What do I do first?", "Why is ICM blocked?", "Show my critical path," etc. — answered from the dependency/flow rules, citing the why.
- **Claude API layer (optional).** Connect your Anthropic key (stored encrypted in the OS keychain — never in the renderer, code, or logs) and Ask-Ariadne answers with senior-architect reasoning grounded in your live state snapshot. Falls back to the rules engine when no key is set. AI guidance is fenced to the advisor panel — never the SQL grid.

### Changed / Fixed
- **Graph interaction redesigned.** **Left-click a box → opens its end-to-end loop** (the docked hover panel was covering right-side nodes and eating their clicks — fixed). **Right-click → connection popup at the node** (prereqs/dependents with status), so it appears right where you're looking instead of far away. Hover now just highlights the node's edges.

---

## [3.12.0] — 2026-06-23 · "Ariadne Scope"

You answer Discovery and pick what you're implementing; the roadmap narrows to your choices.

### Added
- **Discovery is now answerable.** Every Discovery question has an answer field that saves automatically (locally). Per-group and overall "answered" counts, plus a **📋 Copy answers** button to export the whole Q&A as text.
- **Scope picker — choose your modules/pillars.** A "🎯 Scope — what are you implementing?" panel lets you select modules (or whole pillars). Your picks persist.
- **Scope-driven roadmap.** Once a scope is set, the roadmap shows **only what you need** — your chosen modules plus the prerequisites they pull in automatically (transitive). Out-of-scope nodes dim; prereq-pulled-in nodes are marked with a dashed ring + "↳" so you see why they're there. The summary, "next actions," and counts recompute to the in-scope set. A toggle flips between **in-scope only** and **show all 46** (choices preserved).

### Fixed
- **Hover panel visibility.** The connection side-panel had a hardcoded dark background that made text unreadable in the light theme — it now uses a theme-aware opaque surface with high-contrast text and slightly larger type.

---

## [3.11.0] — 2026-06-23 · "Ariadne Loops"

Click a box → see its connections, their status, and runnable SQL for the whole end-to-end loop with data.

### Added
- **Hover → connection side-panel.** Hovering a node docks a panel showing its connection map — prerequisites (in) and dependents (out), each status-colored — plus P1-remaining and the business loop it belongs to. Prereq/dependent names are clickable.
- **Click → end-to-end loop view.** Clicking a box opens the domain process loop it lives in, with a connection strip (prereqs → this → dependents) and the ordered flow steps.
- **10 domain end-to-end flows** (64 steps): Earn-to-Pay (ICM), Order-to-Cash, Procure-to-Pay, Record-to-Report, Plan-to-Produce, Lead-to-Order, Request-to-Resolution, Hire-to-Retire, Subscription-to-Cash, and Foundation/Master-Data. All 46 modules mapped to their flow.
- **Loop SQL — stacked + joined.** Each loop gives you a **per-step script** (every step's read-only data SQL, commented) and a **combined join query** that returns the data flowing across the whole loop. Open either in the editor, or hit **⚡ Run loop** to execute the join and see the rows inline.
- **🔧 Build steps** button in the loop view jumps to the Probe → Learn → Build detail for that module.

---

## [3.10.0] — 2026-06-23 · "Ariadne Drive"

The roadmap becomes the command center — it drives the work, not just shows it.

### Added
- **🛰 Probe the pod (1-click).** One button runs a read-only detect across all 46 modules and lights the whole graph up by **real pod state** — Configured / Missing / Error. Connect → click → instant implementation-status dashboard. Includes a Clear and a graceful "connect first" guard.
- **⚡ Live edges.** Every dependency connection now shows whether it's *live*: when a prerequisite is Done or detected-configured, its edges turn green and **flow** (animated) — the live thread spreads through the graph as the implementation gets built. The SCM → CX Products reconciliation edge flows green when satisfied.
- **▶ What's-next guidance.** A "Next actions" panel lists the Ready tasks in priority order (most P1-critical first), each click-to-drill; Ready nodes pulse so your eye goes straight to what's actionable.
- **Filter / focus / search.** Filter the graph by pillar, phase, status, or "has P1 remaining"; click legend chips to isolate a status; type to search-and-highlight (the rest dim); live "N of 46 shown" count. Rich **hover cards** show task, prereqs (status-colored), P1-remaining, and stage counts without drilling in.
- **Node → SQL workspace.** **⇧-click** any node (or use the new "▶ Open detect SQL in editor" / per-item "▶ Editor" buttons) to load that detect SQL straight into the query editor — the roadmap now drives the live SQL side.
- **⛶ Full screen** for the roadmap (from v3.9.x) — button on the summary line and in the graph controls; Esc to exit.

---

## [3.9.0] — 2026-06-23 · "Ariadne Prioritized"

### Added
- **Probe → Learn → Build prioritization on every step.** All 563 config items are now classified by **stage** (🔎 Probe = inspect current/upstream state · 📐 Learn = design decisions to settle first · 🔧 Build = create/configure/load) and ranked **P1 / P2 / P3** (P1 = critical path or hard to reverse), each with a one-line rationale that holds up to a deep-dive. Distribution: Probe 43 · Learn 109 · Build 411; P1 174 · P2 267 · P3 122.
- **"⚑ Priority Path" panel** in each module — the do-this-next ordered checklist (all P1, then P2), sequenced Probe → Learn → Build, each row showing the priority chip, stage, item, its section, and the rationale. Built for presenting.
- **Stage rail + "P1 remaining"** per module, and a **P1-remaining badge on each graph node** that ticks down as live detection confirms items configured.
- **L4 items grouped by stage** (Probe → Learn → Build) and sorted P1-first, with a `⚑ why` rationale line on every item.

---

## [3.8.0] — 2026-06-23 · "Ariadne Live"

### Added
- **Interactive dependency graph.** The Ariadne roadmap is now a zoomable, pannable SVG graph of all 46 tasks laid out in six phase columns, edges drawn prerequisite → task. Nodes are colored by status (Done / Ready / Blocked); the cross-pillar reconciliation edge **SCM Item Master → CX Products** is highlighted. Wheel to zoom, drag to pan, ＋ / − / ⤢ Reset.
- **Drill-down L1 → L4.** Click a node to drill: **L2** module map → **L3** module detail (prerequisites, dependents, build-lifecycle sections) → **L4** config items. Breadcrumbs (`All ▸ pillar · task ▸ section`) navigate back up.
- **46 full module lifecycles.** Authored `ARIADNE_L34` — **187 sections / 563 config items** across all 46 tasks (Foundation, ERP, SCM/Mfg, HCM, CX, Subscriptions, Marketing, PRM, ICM), each item tagged LIVE or GUIDE.
- **Live pod detection.** **351 read-only detect queries** run against the connected pod via the BIP engine. Detect a single item or a whole module; results roll up to **Configured / Partial / Missing** and a fully-configured module auto-marks Done. Detection is SELECT-only and never writes — a missing object yields a safe "Missing," a wrong table a safe error.

### Changed
- The static phase list from 3.7.0 is replaced by the interactive graph. Manual Mark-Done still persists locally; live detection is in-memory and reflects real pod state.

---

## [3.7.0] — 2026-06-23 · "Ariadne"

### Added
- **Ariadne** 🧵 — *Your Thread Through the Fusion Labyrinth.* Pillar 5 (formerly "Greenfield") is now an agentic, dependency-gated **end-to-end Fusion implementation builder**. *Probe → Learn → Build.*
- **46-task dependency engine** spanning **11 pillars** across phases 1–6: Foundation (Common) → Customer Data Cleansing → ERP/Financials, SCM/Procurement/Mfg, HCM → CX (Sales/Service/CPQ), Subscriptions, Marketing/Eloqua, PRM → ICM. Encoded in `ARIADNE_DEPS` as the authoritative graph (`{id: {phase, pillar, task, prereqs}}`).
- **Live Ready / Blocked / Done gating.** Each task shows `✓ Done` / `● Ready` / `🔒 Blocked` with a "needs: …" list of unmet prerequisites. Mark a task Done and every downstream task recomputes instantly. A header summary tracks "X done · Y ready · Z blocked · of 46." Progress persists locally (planning state only — never pod data, so the read-only-pod guarantee is intact).

### Changed
- Pillar 5 renamed **Greenfield → Ariadne** (tab, header, code comments). Subtitle: *"Probe → Learn → Build. Dependency-gated, end-to-end, agentic."*
- The CX build lifecycle was **reconciled against the Foundation dependency model**. Cross-pillar edges now enforced: **CX Products & Catalog ← SCM Inventory/Item Master (PIM)**; the CX stack is gated behind **Foundation + Customer Data Cleansing**; ICM is terminal at Phase 6 (Transactions ← Plans + Order Management + Receivables).

### Notes
- Source of truth for the graph: `HANDOFF_Fusion_Foundation.md`, `Fusion_SI_Implementation_Playbook.docx`, and `Fusion_Implementation_Tracker.xlsx` (Module Tracker + Dependencies tabs).
- Anti-fabrication guard, SQL engines (REST/BIP), auth modes, and other pillars unchanged. Parse check + `npm test` green.

---

## [3.6.0] — 2026-06
- Added Pillar 5 "Build" — SI implementation copilot (Discovery / Foundation / Modules). Moved `foundation` out of Config Export into `BUILD_JOURNEY`.

## [3.5.0] — 2026-06
- Live Schema Explorer (⚡ Live toggle): lazy schema → table/view → column tree from the data dictionary, module-aware family chips. Docs: SETUP, FEDERATED-ACCESS-JOURNEY, SSO-PLAYBOOK (+PDF).

## [3.3.x] — 2026-06
- **Federated-pod live SQL solved.** Local non-federated service account + standard BI roles + OFJDBC data model (`DBMS_XMLGEN` over `:p_sql`) + BIP SOAP (`ExternalReportWSSService`, WS-Security UsernameToken) + nested-`<ROWSET>` parsing. Verified against the SAML-federated Alto-Shaam DEV pod.

## [3.2.0] — 2026-06
- BIP SQL engine: real server-side SQL via BI Publisher `runReport`. Engine toggle REST | BIP.

## [3.0.1] — 2026-06
- Removed the `aiData()` LLM fallback entirely. Anti-fabrication invariant enforced via `t2sProcessResponse` choke point + `t2sAssertRenderable` render boundary + guard test. Read-only SQL gate (SELECT/WITH only).
