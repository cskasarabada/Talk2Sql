# Talk2Sql v3.11.0 — Ariadne Loops 🧵🔁

**Click a box → see its connections, their status, and runnable SQL for the whole end-to-end loop, with data.**

## What's new

**Hover → connection side-panel.**
Hover any node and a panel docks to the side showing its connection map: prerequisites coming in and dependents going out, each color-coded by status, plus P1-remaining and the business loop the box belongs to. Prereq and dependent names are clickable to jump straight there.

**Click → end-to-end loop view.**
Clicking a box now opens the domain process loop it lives in — a connection strip (prereqs → this → dependents) on top, then the ordered flow steps laid out as a pipeline.

**10 domain flows, all 46 modules mapped.**
Earn-to-Pay (ICM), Order-to-Cash, Procure-to-Pay, Record-to-Report, Plan-to-Produce, Lead-to-Order, Request-to-Resolution, Hire-to-Retire, Subscription-to-Cash, and Foundation/Master-Data — 64 steps total. The ICM earn-to-pay loop (Collect → Classify → Credit → Calculate → Roll-up → Pay) is mapped table-by-table.

**Loop SQL — stacked *and* joined, with data.**
Every loop gives you two things:
- a **per-step script** — each step's read-only data SQL, commented and ordered, to run and inspect step by step;
- a **combined join query** — one statement that returns the data flowing across the entire loop.

Open either in the editor, or hit **⚡ Run loop** to execute the join and see the rows inline. Read-only throughout.

**🔧 Build steps** in the loop view jumps to the Probe → Learn → Build detail (Priority Path, sections, per-item detect) for that module.

## A note on the SQL
The flow SQL uses standard Oracle Fusion table/view names and real join keys, capped to 100 rows. Some table/column names vary by pod release (flagged in the build) — if a query errors, it's a name to adjust, never a write. The ICM `CN_` tables and the proven `CN_COMP_PLANS_ALL_VL` are the anchor.

## Unchanged
Probe-the-pod, live edges, what's-next, filter/search, full-screen, Probe → Learn → Build prioritization, dependency engine, anti-fabrication guard. Parse check and `npm test` pass.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
