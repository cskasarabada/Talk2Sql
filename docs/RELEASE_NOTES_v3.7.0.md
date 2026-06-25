# Talk2Sql v3.7.0 — Ariadne 🧵

**Your thread through the Fusion labyrinth.**

Ariadne is an agentic, dependency-gated **end-to-end Fusion implementation builder**. *Daedalus built the Labyrinth — Ariadne's thread is how you navigate it.* A Fusion implementation is that labyrinth; Ariadne is the thread. **Probe → Learn → Build**, never lose the path.

## What's new

**46-task dependency engine across 11 pillars (phases 1–6).**
Foundation (Common) → Customer Data Cleansing → ERP/Financials · SCM/Procurement/Mfg · HCM → CX (Sales/Service/CPQ) · Subscriptions · Marketing/Eloqua · PRM → ICM. Every task knows its prerequisites.

**Live Ready / Blocked / Done gating.**
Each task shows `✓ Done`, `● Ready`, or `🔒 Blocked` — and when blocked, exactly *what it needs first*. Mark a task Done and everything downstream recomputes instantly. A running summary tracks "X done · Y ready · Z blocked · of 46." Progress is saved locally as planning state — never pod data, so the read-only-pod guarantee stays intact.

**Reconciled CX dependencies.**
The CX build lifecycle was checked against the Foundation dependency model and corrected. The graph now enforces:
- **CX Products & Catalog ← SCM Inventory / Item Master (PIM)** — the cross-pillar edge a CX-only view misses.
- The **entire CX stack is gated behind Foundation + clean TCA customer data** (Customer Data Cleansing).
- **ICM is terminal** (Phase 6): Transactions & Calculation ← Plans/Quota + Order Management + Receivables.

## Unchanged
Anti-fabrication guard, REST/BIP SQL engines, auth modes, Schema Explorer, and all other pillars are untouched. Parse check and `npm test` pass.

## Install
Download the DMG (macOS) or EXE (Windows) below. The app is unsigned — on macOS, right-click → Open the first time (or run the included `Fix-macOS-Open.command`).
