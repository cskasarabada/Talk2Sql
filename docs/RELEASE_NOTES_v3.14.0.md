# Talk2Sql v3.14.0 — Ariadne Config Builder (Pass 1) 🧵🛠

**Ariadne starts building configuration, not just guiding it.** Pilot: Foundation (Geographies).

## The flow
From any module's loop or detail view, open **🛠 Build & Push config**: fill a **questionnaire** → it's **captured and stored** → Ariadne **generates the upload file** in the right format → **preview** → **⬇ download** (gated push comes next pass).

## Channel auto-pick
Each object routes to the best mechanism, with the rationale shown (and an override):
- **FBDI** — bulk-import CSV (geography nodes, hierarchy, COA values).
- **FSM Setup Data** — config CSV (geography structure/types/validation, enterprise, ledger, COA structure, LE, BU).
- **REST** — JSON payload where an endpoint fits.

## Pilot — Foundation (15 objects)
**Geographies (the Step-1 example you flagged), 8 objects:** Country Geography Structure · Geography Types · Master Reference Usage · Geography Nodes (FBDI) · Parent-Child hierarchy (FBDI) · Address-Style Mapping · Validation Control · Import (Loqate/file).
**Core chain:** Enterprise Definition · Currencies · COA Structure · COA Segment Values (FBDI) · Primary Ledger · Legal Entities · Business Units.

Repeatable tier editors handle multi-row inputs (nodes, segments, currencies, LEs, BUs). Each object also produces a concrete **Fusion upload runbook** (FSM task path or the Scheduled-Process import steps).

## Why not ICM first
ICM is the end of the chain — its config is calculation-oriented and needs plan details, participants, territories, and live OM/AR transactions to credit. It can't be built from base foundation, so it's modeled for later. Foundation builds from nothing, which is the right place to start.

## Next (Pass 2)
Gated push: confirm → submit the generated artifact via the chosen channel using your pod's auth → verify by detection (the node flips to ✓ Configured). Environment-aware, Dev-first.

## Safety
The builder generates files only in this pass — no pod writes, never touches the SQL grid, anti-fabrication guard untouched. Generated files are fenced "validate column names against your pod's import template."

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
