# Talk2Sql v3.26.0 — Catalog Rebuild + Error Log 🧵🔧

## Added — 🔧 Rebuild extracts from catalog
Apply-fixes renames *similar* names, but it can't fix EBS-isms that have no look-alike (e.g. `SET_OF_BOOKS_ID`, which is `LEDGER_ID` in Fusion). Now that you've harvested the real schema, **🔧 Rebuild extracts from catalog** regenerates every config-extract SELECT to use only columns that actually exist on your pod — up to ~14 real columns per table, no WHERE/ORDER (so it can't reference a bad column). Stored as overrides, so Extract All / Config Snapshot use the rebuilt SQL immediately. This clears the `ORA-00904` column errors across all module extracts in one click. Tables not in the catalog are skipped.

## Added — Remove custom objects
A control in the Schema Catalog panel to prune **custom objects** from your base SQL core: enter your custom name prefixes (e.g. `XXAS_, XX_`) and remove them, with an opt-in checkbox to also drop anything that isn't on a standard Oracle Fusion prefix. Your prefix list is remembered. Keeps the catalog focused on standard Fusion config.

## Added — ⛔ Consolidated Error Log
Every **Config Snapshot (SQL)**, **Extract All**, and **Validate** run now shows one **Error Log** at the top — every errored object on a single line, with the ORA code parsed out:
```
Inventory Organizations [INV_ORG_PARAMETERS] → ORA-00904 invalid identifier: SET_OF_BOOKS_ID
```
With **📋 Copy all** and **⬇ Download log** — no clicking each error. Copy the whole log and send it over, and we fix the names in one pass.

## Workflow to clear errors
1. 🧠 Learn Schema → 🔎 Verify → 🛠 Apply fixes (renames close matches).
2. 🔧 **Rebuild extracts from catalog** (fixes the rest of the column errors using real columns).
3. Re-run Config Snapshot / Extract / Validate → read the **Error Log** for anything left → Copy all → send it.

## Safety
Read-only throughout — rebuilds and the error log only transform/read; custom-object removal prunes the local catalog only; nothing is written to the pod.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
