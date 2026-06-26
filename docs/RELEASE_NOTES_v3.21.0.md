# Talk2Sql v3.21.0 — Batch BR100 🧵📄

**The batch export now produces a full BR100 setup document** — the Oracle BR.100 format from the single-item Config Snapshot, but covering every configured object in the area at once.

## What's new
After **⚡ Extract All**, a **📄 BR100 Report** button generates one self-contained BR100 document for the whole area:
- **Cover page** — BR100 logo, area title, pod/instance, extracted date, totals (objects · with data · configured · setup-only).
- **Table of contents** of every object.
- **A BR100 section per object** — heading with the table name + record count, then the extracted configuration as a BR100 data table (capped, with row counts).
- **Empty** objects noted as "not configured / none present"; **errored** objects show their SQL ("table/column may not exist on this pod"); **setup-only** objects documented with their Setup & Maintenance path.
- **Sign-off** table — Prepared / Reviewed / Approved.

It's a standalone HTML file (print to PDF) — the as-built configuration workbook for audit, migration, and change management.

## How to use
Ariadne → 📦 Config Batch → pick an area → **⚡ Extract All → Report** (runs the manifest against your pod) → **📄 BR100 Report**.

## Notes
- Built entirely from the extracted results — read-only, no new queries, no network.
- Objects whose table/column names don't match your pod show as errors in the document (with the SQL) rather than failing the run — send those and they get corrected with ground truth.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
