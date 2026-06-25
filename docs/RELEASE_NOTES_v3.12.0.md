# Talk2Sql v3.12.0 — Ariadne Scope 🧵🎯

**Answer Discovery, pick what you're implementing, and the roadmap narrows to your choices.**

## What's new

**Discovery is now answerable.**
Every Discovery question has an answer field that saves as you type (locally). Each group shows an "answered" count, there's an overall tally, and a **📋 Copy answers** button exports the full Q&A as text for your notes or SOW.

**Scope picker — choose your modules and pillars.**
A new "🎯 Scope — what are you implementing?" panel lets you tick the modules in scope, or whole pillars at once. Your selection is remembered.

**Scope-driven roadmap.**
The moment you set a scope, the roadmap shows **only what you need**:
- your chosen modules, **plus** every prerequisite they require — pulled in automatically by walking the dependency chain (pick ICM Transactions and it brings in Plans, Participants, Resources, Territories, Order Management, AR, and their foundations);
- out-of-scope modules dim away; prerequisite-pulled-in modules are flagged with a dashed ring and "↳" so it's clear why they're included;
- the done/ready/blocked summary, the "next actions" list, and the counts all recompute against your in-scope set.

A toggle flips between **in-scope only** and **show all 46** — your choices are preserved either way.

## Fixed
- **Hover panel readability.** The connection side-panel used a fixed dark background that made its text nearly invisible in the light theme. It now uses a theme-aware opaque surface with high-contrast text and slightly larger type — clear in any theme.

## Unchanged
Connection maps, end-to-end loop SQL, probe-the-pod, live edges, what's-next, filter/search, full-screen, Probe → Learn → Build prioritization, dependency engine, anti-fabrication guard. Parse check and `npm test` pass.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
