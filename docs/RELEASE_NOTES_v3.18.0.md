# Talk2Sql v3.18.0 — Setup-Only Areas in Config Export 🧵📋

**Your config exports now include the setup-only areas too** — the configuration that lives in Setup & Maintenance and can't be pulled by SQL, led by **Geographies & Master Address Data**.

## What's new
Each area's **📦 Config Batch** now lists both kinds of configuration:
- **Extractable** objects (with their read-only SQL — Run / extract as before).
- **Setup-only areas** — **28 new entries** across Customer (6), Finance (12), SCM (10), each with a **📋 Setup-only area** badge and the exact **Setup & Maintenance →** navigation path.

Examples now in the export: Geographies & Master Address Data, Geography/Address Validation, Customer Profile Classes (Customer); Accounting Calendars, COA Structure & Value Sets, Cross-Validation Rules, SLA Methods, Tax Regime-to-Rate, AP/AR options, Cash Management, Fixed Assets controls (Finance); Item Classes & EFFs, UOM, Shipping & Carriers, Pricing Segments, Sourcing & ATP, Procurement styles, Cost Books, Work Definitions (SCM).

## How they behave
- Render with the 📋 badge + the Setup & Maintenance guide, no Run button (they're configured in the UI, not queried), but a checkbox so you can include or exclude them from an export.
- In the **batch script**, they appear as commented `-- SETUP-ONLY: <area> → Configured in: <guide>` blocks alongside the extractable SELECTs.
- In the **FSM export manifest**, they're listed with a `Type` column (Extract vs Setup-only) and the guide — making the manifest the complete map of an area's configuration for a Setup Data export.

Header counts now read "N extractable + M setup-only."

## Safety
Setup-only objects carry no SQL and can never be Run — they're documentation/guidance. Read-only throughout; the anti-fabrication guard is untouched.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
