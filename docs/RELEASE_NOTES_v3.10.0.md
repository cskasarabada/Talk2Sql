# Talk2Sql v3.10.0 — Ariadne Drive 🧵🛰

**The roadmap is now the driving factor — it runs the work, not just pictures it.**

## What's new

**🛰 Probe the pod — one click.**
Hit "Probe pod" and Ariadne runs a read-only detect across all 46 modules and lights the entire graph by **real pod state**: Configured, Missing, or Error. Connect → click → you're looking at a live implementation-status dashboard. (Gracefully tells you to connect + set the BIP report path if you haven't.)

**⚡ Live edges — see the live thread.**
Every dependency connection now shows whether it's *live*. When a prerequisite is Done or detected on the pod, its edges turn green and **flow**. As the build progresses, the green thread spreads through the graph — you can watch the implementation come alive. The SCM Item Master → CX Products reconciliation edge flows green once it's satisfied.

**▶ What's next.**
A "Next actions" panel surfaces the Ready tasks in priority order — most P1-critical first — each click-to-drill. Ready nodes pulse so your eye lands on what's actionable right now.

**Filter, focus, search.**
Filter the graph by pillar, phase, status, or "has P1 remaining." Click legend chips to isolate a status. Type to search — matches highlight, the rest dim, with a live "N of 46 shown" count. Hover any node for a card showing its prerequisites (color-coded by status), P1-remaining, and Probe/Learn/Build counts — no drilling required.

**Node → SQL workspace.**
**⇧-click** any node — or use the new "▶ Open detect SQL in editor" and per-item "▶ Editor" buttons — to drop that detect SQL straight into the query editor. The roadmap now drives the live SQL side, not just the plan.

**⛶ Full screen.**
Expand the roadmap to fill the window — button on the summary line and in the graph controls, Esc to exit. Built for presenting.

## Unchanged
Dependency engine, Probe → Learn → Build prioritization, anti-fabrication guard, REST/BIP SQL engines, Schema Explorer. Parse check and `npm test` pass.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
