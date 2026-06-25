# Talk2Sql v3.9.0 — Ariadne Prioritized 🧵⚑

**Every step now knows when to do it, how much it matters, and why.**

Built for the deep-dive. When sharp Oracle architects pull on any thread, the prioritization holds.

## What's new

**Probe → Learn → Build on all 563 steps.**
Every config item is classified by stage and ranked by priority, each with a defensible one-line rationale:

- 🔎 **Probe** — inspect current & upstream state (does it exist? is the prerequisite there?)
- 📐 **Learn** — the design decisions to settle *before* building (hard-to-reverse blueprints: COA design, territory dimensions, ICM plan components & rate dimensions, pricing strategy…)
- 🔧 **Build** — create / configure / load the object

Ranked **P1 / P2 / P3** — P1 = critical path or expensive to reverse post-go-live. Distribution: Probe 43 · Learn 109 · Build 411; P1 174 · P2 267 · P3 122.

**The "⚑ Priority Path" panel.**
Open any module and you get a do-this-next ordered checklist — all P1 items first, then P2, sequenced Probe → Learn → Build — each row showing the priority, the stage, the item, its section, and *why*. This is the view to put on screen in a working session.

**Prioritized everywhere.**
L4 items are grouped by stage and sorted P1-first with a rationale line on each. Each module shows a stage rail (Probe N · Learn N · Build N) and a **P1-remaining** count. Every node on the graph carries a small **P1-remaining badge** that ticks down as live detection confirms items are configured.

## Why it matters
The dependency graph already told you *which task* to do next. The prioritization tells you, inside each task, *which step* to do next and what's safe to defer — and it survives the "why is that P1?" question because the rationale is right there.

## Unchanged
Interactive graph, live pod detection, dependency engine, anti-fabrication guard, SQL engines. Parse check and `npm test` pass.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
