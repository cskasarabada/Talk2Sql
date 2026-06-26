# Talk2Sql v3.19.0 — Everything Extractable 🧵✓

**The architect's job: document every configured item, then validate it.** So nearly every config object in the per-area Config Batch is now extractable — not just shown as setup guidance.

## What changed
- **Setup-only → extractable.** 15 entries that previously only showed the Setup & Maintenance path now **extract real configuration via SQL**: Accounting Calendars, COA Value Sets, Cross-Validation Rules, Data Access Sets, SLA Methods, Tax Regimes, AP/AR Options, Payment Process Profiles, Cash Management, Fixed Assets controls; Item Statuses & Types, Shipping/Carriers, Cost Books; Source System References, Account Relationship Types. The Setup & Maintenance navigation is kept on each as a reference.
- **Result: 66 extractable + 2 setup-only** across Finance / SCM / Customer. Only **Data Quality / Duplicate Identification** and **per-country Geography Validation** remain setup-only — they have no clean config table to query. 11 duplicate entries were merged into their existing extractable object.
- Every extractable object can now be **run, batched, downloaded (documented), and validated** — the full architect loop.

## Fixed
- **Config Batch buttons did nothing when clicked** — the batch was rendering into a panel below the fold. Navigation now scrolls the result into view, so 💰 Finance / 📦 SCM / 👥 Customer open immediately.
- **Config Export ↔ Config Batch bridge** — the **📦 Batch & Validate →** button in Config Export (tab 4) opens the matching area's batch (Financials → Finance, SCM → SCM, CX → Customer).

## How to use
Ariadne → **📦 Config Batch** → pick an area → every object now has extract SQL: **▶ Run** one, **Generate batch script** for all, **Download .sql / FSM manifest**, and **✓ Validate Configs** → **Generate report**.

## Pod note
Several config table/column names are release-dependent (flagged in the build). A name your pod doesn't have shows as an error on extract/validate — adjust and re-run; nothing can write.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
