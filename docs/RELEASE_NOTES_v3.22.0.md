# Talk2Sql v3.22.0 — Per-Module SQL Snapshot 🧵📸

**Audit a module → export ALL its config features → BR100 — on your federated pod.**

## What's new
- **Full SQL config sets for every module.** New `CONFIG_MODULE_EXPORT` adds complete config feature sets in SQL for **HCM (19)**, **Order Management (14)**, **CX (19)**, and **ICM (19)** — 71 config-only objects. Finance and SCM reuse their existing SQL sets. All six Config Export modules now have a full SQL config export.
- **📸 Config Snapshot (SQL)** in the Config Export toolbar (every module) runs the current module's full feature set via **SQL/BIP** — the path that works on SSO/SAML-federated pods — shows per-object results inline, and generates a per-module **BR100 setup document**: cover, table of contents, a data table per feature, and a Prepared/Reviewed/Approved sign-off.

## Why it changed
The previous Config Snapshot extracted via **REST** (`item.ep` endpoints), which **404s on federated pods like Alto-Shaam** — so it returned no data there — and it included a transactional item. The button now runs the **config-only SQL** path that actually works on your pod.

## How to use
Config Export (tab 4) → pick a module → **📸 Config Snapshot (SQL)** → it extracts every config feature for that module → **📄 BR100** for the setup document.

## Honest note
Each module's SQL set may need one pod-run to fix release-specific table/column names (as SCM did). Anything that doesn't resolve shows as an error inside the BR100 (with the SQL) — not a failed run — and is a quick fix once you send the error. Read-only throughout; nothing is written.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
